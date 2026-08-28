import { useContext, useEffect, useRef } from "react";
import AuthContext from "../context/AuthContext";
import DataContext from "../context/DataContext";
import { getCatalogMaps } from "../services/tursoSource";
import { agregarHistorial, guardarFavoritos, leerFavoritos, leerHistorial } from "../services/authSource";
import { favoritos as almacenFavoritos } from "../services/almacenLocal";
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
 *   fusionando  bajando del servidor y uniendo con lo local.
 *   listo       fusión confirmada. A partir de aquí sí se puede empujar.
 *
 * Y si la fusión FALLA no se pasa a "listo": se reintenta. Antes se marcaba
 * listo pasara lo que pasara, así que con el backend dormido el primer clic
 * mandaba solo lo local y vaciaba el servidor.
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
 * Tope de entradas de historial que se suben de golpe al iniciar sesión.
 *
 * El endpoint es de una en una y el limitador global permite 300 peticiones por
 * media hora. Subir las 40 de un tirón se come un octavo del presupuesto del
 * usuario para nada: las más viejas ya no le interesan a nadie.
 */
const MAX_HISTORIAL_A_SUBIR = 15;

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

      // --- Favoritos: unión, nunca reemplazo ---
      //
      // Si el usuario marcó unos en el teléfono y otros en la laptop, se quedan
      // todos. La unión se escribe en el almacén compartido, así que la lista
      // en pantalla se actualiza sola: no hay copia en el estado de nadie que
      // pueda quedarse vieja y volver a pisarla.
      const localesAntes = almacenFavoritos.leer();
      const remotosIds = await leerFavoritos();
      if (cancelado) return;

      const remotasRutas = remotosIds.map((id) => byId.get(id)?.legacyPath).filter(Boolean);
      const union = almacenFavoritos.fusionar(remotasRutas);

      // Solo se sube si la unión aporta algo que el servidor no tenga.
      const faltanEnServidor = union.length !== remotasRutas.length || localesAntes.some((r) => !remotasRutas.includes(r));
      if (faltanEnServidor) {
        const ids = union.map((ruta) => byLegacyPath.get(ruta)).filter(Boolean);
        await guardarFavoritos(ids);
      }
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
  }, [usuario, disponible, sesionIncierta, fusionarHistorial]);

  // --- Fase 2: empujar los cambios de favoritos ---------------------------
  //
  // Se escucha el almacén en vez de recibir avisos desde `ListBooks`: así da
  // igual desde dónde se marque un favorito, y el empuje queda bloqueado
  // mientras la fusión no haya terminado.
  useEffect(() => {
    if (!usuario || !disponible) return undefined;

    let temporizador = null;

    const alCambiar = () => {
      if (fase.current !== FASE.LISTO) return;
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        empujarFavoritos(almacenFavoritos.leer());
      }, RETARDO_EMPUJE_MS);
    };

    const cancelarSuscripcion = almacenFavoritos.suscribir(alCambiar);
    return () => {
      clearTimeout(temporizador);
      cancelarSuscripcion();
    };
  }, [usuario, disponible]);

  // --- Fase 3: empujar cada capítulo nuevo del historial -------------------
  useEffect(() => {
    if (!usuario || !disponible || fase.current !== FASE.LISTO) return undefined;

    const nueva = history.find((entrada) => !subidos.current.has(claveHistorial(entrada)));
    if (!nueva) return undefined;

    let cancelado = false;
    // Mismo retardo que los favoritos: recorrer capítulos seguidos no debe
    // disparar una petición por cada uno.
    const temporizador = setTimeout(async () => {
      if (cancelado) return;
      // Se marca antes de la petición: si falla, no se reintenta en bucle. El
      // capítulo se subirá en la próxima sesión, que para un historial basta.
      subidos.current.add(claveHistorial(nueva));
      try {
        const { byLegacyPath } = await getCatalogMaps();
        await empujarEntradaHistorial(nueva, byLegacyPath);
      } catch {
        // El historial local ya quedó guardado; el servidor es la copia.
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

/**
 * Empuja los favoritos al servidor.
 *
 * Ya no la llama nadie de fuera: `ListBooks` la usaba y ese era el problema
 * —desde un componente no hay forma de saber si la fusión terminó, y el PUT
 * reemplaza la lista entera—. Ahora solo la dispara la fase 2, que sí lo sabe.
 *
 * El error se traga a propósito: el favorito ya quedó guardado en el almacén
 * local y el servidor es solo la copia.
 */
const empujarFavoritos = async (rutas) => {
  try {
    const { byLegacyPath } = await getCatalogMaps();
    const ids = rutas.map((ruta) => byLegacyPath.get(ruta)).filter(Boolean);
    await guardarFavoritos(ids);
  } catch {
    // Silencioso a propósito.
  }
};
