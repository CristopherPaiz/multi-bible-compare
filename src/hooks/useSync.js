import { useCallback, useContext, useEffect, useRef } from "react";
import AuthContext from "../context/AuthContext";
import DataContext from "../context/DataContext";
import { getCatalogMaps } from "../services/tursoSource";
import { agregarHistorial, guardarFavoritos, leerFavoritos, leerHistorial } from "../services/authSource";
import { favoritos as almacenFavoritos } from "../services/almacenLocal";
import { fusionarListas, guardarBase, huellaDeLista, leerBase } from "../services/fusion";
import { claveDeId, idDeClave } from "../data/canon";

/**
 * Sincroniza favoritos e historial cuando hay sesión.
 *
 * Principio: localStorage sigue siendo la fuente de verdad LOCAL. El servidor
 * es una copia para que los datos sobrevivan al cambio de dispositivo. Si el
 * backend falla, la app funciona igual — por eso todo va envuelto en catch.
 *
 * ---------------------------------------------------------------------------
 * La regla que ordena todo: BAJAR ANTES DE SUBIR
 * ---------------------------------------------------------------------------
 * `PUT /api/user/favorites` REEMPLAZA la lista entera en el servidor. Mandarla
 * antes de haber bajado la del servidor y fusionado borra lo que este
 * dispositivo todavía no conoce — que es justo el trabajo del otro dispositivo.
 *
 * De ahí las tres fases. Mientras no se llegue a "listo" no sale ni un PUT:
 *
 *   quieto      no hay sesión, o no se sabe si la hay.
 *   fusionando  bajando del servidor y fusionando con lo local.
 *   listo       fusión confirmada. A partir de aquí sí se puede sincronizar.
 *
 * Y si la fusión FALLA no se pasa a "listo": se reintenta. Antes se marcaba
 * listo pasara lo que pasara, así que con el backend dormido el primer clic
 * mandaba solo lo local y vaciaba el servidor.
 *
 * ---------------------------------------------------------------------------
 * Favoritos: fusión a TRES bandas, no unión
 * ---------------------------------------------------------------------------
 * Bajar y unir tampoco basta. La unión no sabe distinguir "esta versión falta
 * porque la desmarqué" de "falta porque este dispositivo nunca la vio", así que
 * desmarcar un favorito no se propagaba nunca: el otro dispositivo lo volvía a
 * subir. Cada cambio dispara ahora un ciclo completo contra la BASE guardada.
 * Ver `services/fusion.js`.
 *
 * El HISTORIAL se queda con el trato simple —añadir y nunca quitar— porque su
 * endpoint es un POST por entrada, no un reemplazo: dos dispositivos no pueden
 * pisarse, y una entrada de historial de más no le cuesta nada a nadie.
 */

const FASE = { QUIETO: "quieto", FUSIONANDO: "fusionando", LISTO: "listo" };

/** Espera antes de empujar, para no mandar una petición por clic. */
const RETARDO_EMPUJE_MS = 800;

/*
 * El backend duerme. Si la fusión falla se reintenta con esperas crecientes en
 * vez de rendirse: rendirse dejaba la sesión sin sincronizar hasta recargar.
 */
const ESPERAS_REINTENTO_MS = [3000, 8000, 20000];

/**
 * Tope de entradas de historial que se suben de golpe.
 *
 * El caso que manda es este: alguien lee un rato en el móvil SIN cuenta y
 * después inicia sesión. Todo lo que leyó como invitado está solo en ese
 * teléfono, y el inicio de sesión es la única oportunidad de subirlo.
 *
 * Estaba en 15 para no gastar peticiones, y era demasiado tacaño: quien hubiera
 * leído treinta capítulos de invitado perdía quince en cuanto cambiara de
 * teléfono. El historial local está topado en 40 (`MAX_HISTORIAL`), el
 * limitador permite 300 peticiones por media hora y esto pasa una vez por
 * sesión: cuarenta caben de sobra.
 */
const MAX_HISTORIAL_A_SUBIR = 40;

/** Identidad de una entrada de historial: el capítulo, que es como se agrupa. */
const claveHistorial = (entrada) => `${entrada.libroSeleccionado}:${entrada.capituloSeleccionadoNumero}`;

/** Entrada del servidor -> la forma que usa la UI. */
const deRemotoALocal = (entrada, byId) => ({
  id: `${claveDeId(entrada.bookId)}:${entrada.chapter}`,
  libroSeleccionado: claveDeId(entrada.bookId),
  capituloSeleccionadoNumero: Number(entrada.chapter),
  versiculoSeleccionadoNumero: Number(entrada.verse) || 1,
  versiculos: [Number(entrada.verse) || 1],
  // Sin esto las entradas del servidor entraban con fecha 0 y el recorte a 40
  // las trataba como las más viejas del mundo.
  visitadoEn: Date.parse(entrada.createdAt) || 0,
  visitas: 1,
  bibliasSeleccionadas: (entrada.bibleIds ?? []).map((id) => byId.get(id)?.legacyPath).filter(Boolean),
});

export const useSync = () => {
  const { usuario, disponible, sesionIncierta } = useContext(AuthContext);
  const { history, fusionarHistorial } = useContext(DataContext);

  const fase = useRef(FASE.QUIETO);
  const usuarioFusionado = useRef(null);

  /*
   * El historial se lee por referencia y no como dependencia del efecto: si
   * fuera dependencia, cada versículo visitado reiniciaría la fusión entera.
   */
  const historialRef = useRef(history);
  historialRef.current = history;

  /** Capítulos que el servidor ya tiene. Evita repetir POSTs en cada visita. */
  const subidos = useRef(new Set());

  /** Huella de la lista que se dejó sincronizada, para no encadenar ciclos. */
  const ultimaHuellaFavoritos = useRef(null);

  const usuarioId = usuario?.id ?? null;

  /**
   * Ciclo completo de favoritos: BAJAR -> FUSIONAR A TRES BANDAS -> ESCRIBIR
   * AQUÍ -> SUBIR.
   *
   * La fusión va contra la BASE —la lista que el servidor tenía la última vez
   * que este dispositivo sincronizó— y no contra la unión. Sin base no se puede
   * distinguir "esta versión falta porque la desmarqué" de "falta porque este
   * dispositivo nunca la vio", así que desmarcar un favorito no se propagaba: el
   * otro dispositivo lo volvía a subir. Ver `fusion.js`.
   */
  const sincronizarFavoritos = useCallback(async () => {
    if (!usuarioId) return;

    const { byLegacyPath, byId } = await getCatalogMaps();

    const remotosIds = await leerFavoritos();
    const remotas = remotosIds.map((id) => byId.get(id)?.legacyPath).filter(Boolean);

    const fusionadas = fusionarListas({
      base: leerBase("favoritos", usuarioId) ?? [],
      local: almacenFavoritos.leer(),
      remoto: remotas,
    });

    almacenFavoritos.escribir(fusionadas);
    ultimaHuellaFavoritos.current = huellaDeLista(fusionadas);

    await guardarFavoritos(fusionadas.map((ruta) => byLegacyPath.get(ruta)).filter(Boolean));

    // La base solo se mueve si el PUT salió bien: adelantarla dejaría al
    // dispositivo creyendo que el servidor tiene algo que nunca llegó, y en el
    // ciclo siguiente esa diferencia se leería como un borrado ajeno.
    guardarBase("favoritos", usuarioId, fusionadas);
  }, [usuarioId]);

  // --- Fase 1: bajar y fusionar -------------------------------------------
  useEffect(() => {
    // `sesionIncierta` = no se pudo preguntar quién soy. No es "sin sesión": no
    // se toca el servidor hasta salir de la duda.
    if (!usuario || !disponible || sesionIncierta) {
      fase.current = FASE.QUIETO;
      usuarioFusionado.current = null;
      subidos.current = new Set();
      return undefined;
    }

    if (usuarioFusionado.current === usuario.id) return undefined;
    usuarioFusionado.current = usuario.id;

    let cancelado = false;
    let temporizador = null;
    fase.current = FASE.FUSIONANDO;

    const fusionar = async () => {
      const { byLegacyPath, byId } = await getCatalogMaps();

      await sincronizarFavoritos();
      if (cancelado) return;

      // --- Historial: baja, fusiona y sube lo que falte ---
      const historialRemoto = await leerHistorial();
      if (cancelado) return;

      for (const entrada of historialRemoto) {
        subidos.current.add(`${claveDeId(entrada.bookId)}:${entrada.chapter}`);
      }

      fusionarHistorial(historialRemoto.map((entrada) => deRemotoALocal(entrada, byId)));

      // Lo que este dispositivo leyó y el servidor no sabe. Antes esto no
      // existía: `agregarHistorial` estaba escrito y no lo llamaba nadie, así
      // que el historial solo bajaba.
      const pendientes = historialRef.current.filter((entrada) => !subidos.current.has(claveHistorial(entrada)));

      for (const entrada of pendientes.slice(0, MAX_HISTORIAL_A_SUBIR)) {
        if (cancelado) return;
        await empujarEntradaHistorial(entrada, byLegacyPath);
        subidos.current.add(claveHistorial(entrada));
      }
    };

    const intentar = (indice) => {
      fusionar()
        .then(() => {
          if (cancelado) return;
          fase.current = FASE.LISTO;
        })
        .catch(() => {
          if (cancelado) return;

          // NO se pasa a listo: sin fusión confirmada, empujar destruye datos.
          const espera = ESPERAS_REINTENTO_MS[indice];
          if (espera === undefined) return;
          temporizador = setTimeout(() => intentar(indice + 1), espera);
        });
    };

    intentar(0);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      /*
       * Si el efecto se rehace a media fusión (pasa cuando `sesionIncierta` se
       * resuelve), hay que soltar la marca: si no, el intento nuevo se creería
       * ya fusionado, saldría por el `return` de arriba y la fase se quedaría
       * en FUSIONANDO para siempre — sin sincronizar nada y sin explicarlo.
       */
      if (fase.current !== FASE.LISTO) usuarioFusionado.current = null;
    };
  }, [usuario, disponible, sesionIncierta, fusionarHistorial, sincronizarFavoritos]);

  // --- Fase 2: sincronizar los cambios de favoritos -----------------------
  //
  // Se escucha el almacén en vez de recibir avisos desde `ListBooks`: así da
  // igual desde dónde se marque un favorito.
  //
  // Cada cambio dispara un CICLO COMPLETO, no un empuje: `PUT /favorites`
  // reemplaza la lista entera en el servidor, así que subir la local a ciegas
  // borraba lo que el otro dispositivo hubiera marcado desde el inicio de
  // sesión.
  useEffect(() => {
    if (!usuario || !disponible) return undefined;

    let temporizador = null;

    const alCambiar = () => {
      if (fase.current !== FASE.LISTO) return;
      // La escritura que hace la propia sincronización también avisa: sin este
      // corte, cada ciclo encadenaría el siguiente.
      if (huellaDeLista(almacenFavoritos.leer()) === ultimaHuellaFavoritos.current) return;

      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        sincronizarFavoritos().catch(() => {
          // El favorito ya está guardado en el almacén local; el servidor es la
          // copia. El próximo cambio (o el próximo inicio de sesión) reintenta.
        });
      }, RETARDO_EMPUJE_MS);
    };

    const cancelarSuscripcion = almacenFavoritos.suscribir(alCambiar);
    return () => {
      clearTimeout(temporizador);
      cancelarSuscripcion();
    };
  }, [usuario, disponible, sincronizarFavoritos]);

  // --- Fase 3: subir los capítulos nuevos del historial -------------------
  //
  // El historial NO usa fusión a tres bandas y no le hace falta: su endpoint es
  // un POST por entrada, no un PUT que reemplaza. Dos dispositivos no pueden
  // pisarse, el servidor poda solo, y una entrada de más no le cuesta nada a
  // nadie. Aquí basta con no repetir lo ya subido.
  useEffect(() => {
    if (!usuario || !disponible || fase.current !== FASE.LISTO) return undefined;

    const pendientes = history.filter((entrada) => !subidos.current.has(claveHistorial(entrada)));
    if (pendientes.length === 0) return undefined;

    let cancelado = false;

    // Mismo retardo que los favoritos: recorrer capítulos seguidos no debe
    // disparar una petición por cada uno.
    const temporizador = setTimeout(async () => {
      const { byLegacyPath } = await getCatalogMaps().catch(() => ({ byLegacyPath: null }));
      if (cancelado || !byLegacyPath) return;

      /*
       * Se drena la lista ENTERA, no solo la primera.
       *
       * Antes se subía una por cambio de historial, así que una cola de veinte
       * capítulos pendientes necesitaba veinte capítulos MÁS de lectura para
       * vaciarse. Con la cola llena tras iniciar sesión —lo normal si se estuvo
       * leyendo sin cuenta— eso significaba que casi nada llegaba al servidor.
       */
      for (const entrada of pendientes.slice(0, MAX_HISTORIAL_A_SUBIR)) {
        if (cancelado) return;
        // Se marca ANTES de la petición: si falla, no se reintenta en bucle. El
        // capítulo se subirá en la próxima sesión, que para un historial basta.
        subidos.current.add(claveHistorial(entrada));
        try {
          await empujarEntradaHistorial(entrada, byLegacyPath);
        } catch {
          // El historial local ya quedó guardado; el servidor es la copia.
        }
      }
    }, RETARDO_EMPUJE_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [history, usuario, disponible]);
};

/**
 * Manda una entrada del historial local al servidor.
 *
 * El validador exige al menos una versión y como mucho `MAX_VERSIONES`. Una
 * entrada vieja sin versiones guardadas daría 400, así que se descarta aquí en
 * vez de gastar el intento.
 */
const MAX_VERSIONES = 25;

const empujarEntradaHistorial = (entrada, byLegacyPath) => {
  const bibleIds = (entrada.bibliasSeleccionadas ?? [])
    .map((ruta) => byLegacyPath.get(ruta))
    .filter(Boolean)
    .slice(0, MAX_VERSIONES);

  if (bibleIds.length === 0) return Promise.resolve(null);

  return agregarHistorial({
    bibleIds,
    bookId: idDeClave(entrada.libroSeleccionado),
    chapter: Number(entrada.capituloSeleccionadoNumero),
    verse: Number(entrada.versiculoSeleccionadoNumero) || null,
  });
};

