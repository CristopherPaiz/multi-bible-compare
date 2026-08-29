import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import { guardarNotas, guardarResaltados, leerNotas, leerResaltados } from "../services/authSource";
import { codificarRef, decodificarRef } from "../utils/referencia";
import { fusionarMapas, guardarBase, huellaDeMapa, leerBase } from "../services/fusion";

/**
 * Resaltados y notas del usuario.
 *
 * Mismo principio que favoritos e historial: **localStorage es la fuente de
 * verdad**. La cuenta es opcional, y estas dos cosas —lo único de la app que el
 * usuario escribe él mismo— tienen que seguir estando aunque el backend esté
 * caído, dormido o el usuario nunca se registre.
 *
 * El servidor guarda una copia para que sobrevivan al cambio de dispositivo. Se
 * empuja con retardo y en bloque, no en cada tecla: escribir una nota son
 * decenas de pulsaciones y una petición por cada una sería absurdo.
 *
 * ---------------------------------------------------------------------------
 * Por qué el color se guarda por nombre
 * ---------------------------------------------------------------------------
 * "amarillo", no "#fff9c4". La app tiene tema claro y oscuro: un tono elegido
 * con el claro puesto queda ilegible en el oscuro. Guardando el nombre, cada
 * tema resuelve su propio tono y un resaltado hecho de día se sigue viendo de
 * noche.
 */
const AnotacionesContext = createContext();

const CLAVE_RESALTADOS = "resaltados";
const CLAVE_NOTAS = "notas";
const CLAVE_BORRADORES = "borradoresNotas";
const RETARDO_SYNC_MS = 2500;

/*
 * El backend duerme. Si la fusión falla se reintenta con esperas crecientes en
 * vez de rendirse: sin fusión no se puede empujar (ver abajo), así que
 * rendirse dejaba las notas sin sincronizar hasta recargar la página.
 */
const ESPERAS_REINTENTO_MS = [3000, 8000, 20000];

const leerLocal = (clave, porDefecto) => {
  try {
    const crudo = localStorage.getItem(clave);
    const valor = crudo ? JSON.parse(crudo) : null;
    return valor ?? porDefecto;
  } catch {
    return porDefecto;
  }
};

const escribirLocal = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Safari privado o cuota llena: se pierde al cerrar, pero la sesión sigue.
  }
};

/** Identificador estable de un versículo. El mismo que usa el backend. */
const claveVersiculo = (bookId, capitulo, versiculo) => String(codificarRef(bookId, capitulo, versiculo));

/**
 * Identidad de una nota, derivada de su CONTENIDO y no del id del servidor.
 *
 * `PUT /notes` borra las filas del usuario y las vuelve a insertar, y la clave
 * es AUTOINCREMENT: cada empuje le cambia el id a todas las notas. Un id que
 * cambia solo no sirve para reconocer "esta nota es aquella", que es justo lo
 * que la fusión necesita saber.
 *
 * La fecha de CREACIÓN sí es estable —el servidor respeta la que manda el
 * cliente— y con el versículo delante no colisiona: harían falta dos notas
 * sobre el mismo versículo creadas en el mismo milisegundo.
 */
const idDeNota = (nota) => `${nota.bookId}|${nota.capitulo}|${nota.versiculo}|${nota.creadoEn}`;

/** Si cambia, la nota se editó. El id queda fuera a propósito. */
const huellaDeNota = (nota) => `${nota.editadoEn ?? ""}\u0000${nota.texto}`;

const huellaDeResaltado = (item) => `${item.editadoEn ?? ""}\u0000${item.color}`;

/** En el choque gana el más reciente; si uno borró, gana el otro. */
const masReciente = (campo) => (aqui, alla) => {
  if (aqui === undefined) return alla;
  if (alla === undefined) return aqui;
  return String(alla[campo] ?? "") > String(aqui[campo] ?? "") ? alla : aqui;
};

const ganaNotaReciente = masReciente("editadoEn");
const ganaResaltadoReciente = masReciente("editadoEn");

/*
 * Los resaltados se guardaban como `{ clave: "amarillo" }`, sin fecha. Sin
 * fecha no hay desempate posible, así que ahora son `{ clave: { color,
 * editadoEn } }`.
 *
 * A los que ya estaban guardados se les pone la fecha de AHORA y no la del
 * inicio de los tiempos: con epoch perderían cualquier choque contra el
 * servidor, y hasta hoy el criterio era el contrario —ganaba lo local—. Se
 * migra sin cambiar lo que el usuario veía.
 */
const migrarResaltados = (crudo) => {
  if (!crudo || typeof crudo !== "object") return {};
  const ahora = new Date().toISOString();
  const salida = {};
  for (const [clave, valor] of Object.entries(crudo)) {
    if (typeof valor === "string") salida[clave] = { color: valor, editadoEn: ahora };
    else if (valor && typeof valor.color === "string") salida[clave] = { color: valor.color, editadoEn: valor.editadoEn ?? ahora };
  }
  return salida;
};

/** `{ clave: {color, editadoEn} }` -> Map, para fusionar. */
const mapaDeResaltados = (objeto) => new Map(Object.entries(objeto ?? {}));

const objetoDeResaltados = (mapa) => Object.fromEntries(mapa);

const mapaDeNotas = (lista) => new Map((lista ?? []).map((nota) => [idDeNota(nota), nota]));

const listaDeNotas = (mapa) => [...mapa.values()].sort((a, b) => String(b.creadoEn ?? "").localeCompare(String(a.creadoEn ?? "")));

/** Respuesta del servidor -> la forma local. */
const resaltadosRemotosAMapa = (lista) =>
  new Map(
    (lista ?? []).map((item) => [
      claveVersiculo(item.bookId, item.chapter, item.verse),
      { color: item.color, editadoEn: item.updatedAt },
    ])
  );

const notasRemotasAMapa = (lista) =>
  mapaDeNotas(
    (lista ?? []).map((nota) => ({
      id: `srv-${nota.id}`,
      bookId: nota.bookId,
      capitulo: nota.chapter,
      versiculo: nota.verse,
      texto: nota.body,
      creadoEn: nota.createdAt,
      editadoEn: nota.updatedAt,
    }))
  );

export const AnotacionesProvider = ({ children }) => {
  const { usuario, disponible, sesionIncierta } = useContext(AuthContext);

  /** `{ "2818320": { color: "amarillo", editadoEn } }` — clave empaquetada. */
  const [resaltados, setResaltados] = useState(() => migrarResaltados(leerLocal(CLAVE_RESALTADOS, {})));

  /** `[{ id, bookId, capitulo, versiculo, texto, creadoEn, editadoEn }]` */
  const [notas, setNotas] = useState(() => leerLocal(CLAVE_NOTAS, []));

  /*
   * ---------------------------------------------------------------------------
   * Notas a medio escribir
   * ---------------------------------------------------------------------------
   * `{ "2818320": { texto, editando } }` — lo tecleado en el panel de notas y
   * todavía sin guardar, por versículo.
   *
   * Vivía en el estado de `PanelNotas`, así que se perdía en cuanto el panel se
   * desmontaba: cerrar la barra, cambiar de capítulo o irse a otra pantalla
   * borraba lo escrito sin avisar. Un borrador es de las poquísimas cosas de la
   * app que el usuario NO puede regenerar; perderlo no es un detalle.
   *
   * Se guarda en localStorage y NO se manda al servidor: es una nota a medias,
   * no una nota. Se sube cuando el usuario la guarda, que es cuando decide que
   * existe.
   */
  const [borradores, setBorradores] = useState(() => leerLocal(CLAVE_BORRADORES, {}));

  useEffect(() => escribirLocal(CLAVE_RESALTADOS, resaltados), [resaltados]);
  useEffect(() => escribirLocal(CLAVE_NOTAS, notas), [notas]);
  useEffect(() => escribirLocal(CLAVE_BORRADORES, borradores), [borradores]);

  // --- Sincronización con la cuenta ---------------------------------------
  //
  // Ciclo completo: BAJAR -> FUSIONAR A TRES BANDAS -> ESCRIBIR AQUÍ -> SUBIR.
  //
  // Antes se bajaba una sola vez, al iniciar sesión, y a partir de ahí cada
  // cambio empujaba lo local con un PUT que reemplaza el conjunto entero. Eso
  // resucitaba lo que otro dispositivo hubiera borrado y pisaba lo que hubiera
  // escrito. Ahora se vuelve a bajar ANTES de cada empuje y se fusiona contra la
  // base —lo que el servidor tenía la última vez—, que es lo único que permite
  // distinguir un borrado de un "todavía no lo había visto". Ver `fusion.js`.

  const usuarioId = usuario?.id ?? null;

  /*
   * `sesionIncierta` = el backend no contestó a "¿quién soy?". No es lo mismo
   * que no tener cuenta: mientras no se sepa, no se toca nada del servidor.
   */
  const hayCuenta = Boolean(usuarioId && disponible && !sesionIncierta);

  /*
   * Huella de lo último que se dejó sincronizado. Sin esto, escribir el
   * resultado de la fusión en el estado vuelve a disparar el efecto que
   * sincroniza, que fusiona, que escribe: un bucle de peticiones.
   */
  const ultimoSincronizado = useRef({ resaltados: null, notas: null });

  /*
   * El estado se lee de refs y no de las dependencias del efecto: si `notas` y
   * `resaltados` fueran dependencias de `sincronizar`, cada tecla guardada
   * recrearía la función y reiniciaría el retardo.
   */
  const resaltadosRef = useRef(resaltados);
  resaltadosRef.current = resaltados;
  const notasRef = useRef(notas);
  notasRef.current = notas;

  const sincronizar = useCallback(async () => {
    if (!usuarioId) return;

    const [remotosResaltados, remotasNotas] = await Promise.all([leerResaltados(), leerNotas()]);

    const baseResaltados = new Map(Object.entries(leerBase("resaltados", usuarioId) ?? {}));
    const baseNotas = new Map(Object.entries(leerBase("notas", usuarioId) ?? {}));

    const fusionResaltados = fusionarMapas({
      base: baseResaltados,
      local: mapaDeResaltados(resaltadosRef.current),
      remoto: resaltadosRemotosAMapa(remotosResaltados),
      huella: huellaDeResaltado,
      ganador: ganaResaltadoReciente,
    });

    const fusionNotas = fusionarMapas({
      base: baseNotas,
      local: mapaDeNotas(notasRef.current),
      remoto: notasRemotasAMapa(remotasNotas),
      huella: huellaDeNota,
      ganador: ganaNotaReciente,
    });

    const resaltadosFusionados = objetoDeResaltados(fusionResaltados);
    const notasFusionadas = listaDeNotas(fusionNotas);

    setResaltados(resaltadosFusionados);
    setNotas(notasFusionadas);

    await guardarResaltados(
      [...fusionResaltados.entries()].map(([clave, item]) => {
        const { bookId, capitulo, versiculo } = decodificarRef(Number(clave));
        return { bookId, chapter: capitulo, verse: versiculo, color: item.color };
      })
    );

    await guardarNotas(
      notasFusionadas.map((nota) => ({
        bookId: nota.bookId,
        chapter: nota.capitulo,
        verse: nota.versiculo,
        body: nota.texto,
        createdAt: nota.creadoEn,
        updatedAt: nota.editadoEn,
      }))
    );

    /*
     * La base se actualiza DESPUÉS de que el PUT haya salido bien. Guardarla
     * antes dejaría al dispositivo creyendo que el servidor tiene algo que no
     * llegó, y en la siguiente fusión leería esa diferencia como un borrado
     * ajeno: perdería de verdad lo que solo falló al subir.
     */
    guardarBase("resaltados", usuarioId, resaltadosFusionados);
    guardarBase("notas", usuarioId, Object.fromEntries(fusionNotas));

    ultimoSincronizado.current = {
      resaltados: huellaDeMapa(fusionResaltados, huellaDeResaltado),
      notas: huellaDeMapa(fusionNotas, huellaDeNota),
    };
  }, [usuarioId]);

  /*
   * Un solo efecto para el arranque y para los cambios.
   *
   * Al iniciar sesión hay que sincronizar aunque no se haya tocado nada (para
   * bajar lo del otro dispositivo); después, cada cambio pide otro ciclo con
   * retardo. Un solo ciclo cubre los dos casos, y como siempre baja antes de
   * subir ya no hace falta la bandera de "fusión terminada": no existe un empuje
   * a ciegas que bloquear.
   */
  useEffect(() => {
    if (!hayCuenta) {
      ultimoSincronizado.current = { resaltados: null, notas: null };
      return undefined;
    }

    const huellaActual = {
      resaltados: huellaDeMapa(mapaDeResaltados(resaltados), huellaDeResaltado),
      notas: huellaDeMapa(mapaDeNotas(notas), huellaDeNota),
    };

    // Nada cambió desde el último ciclo: lo que hay en pantalla ES lo que se
    // subió. Este es el corte que evita el bucle fusión -> estado -> fusión.
    const sinCambios =
      huellaActual.resaltados === ultimoSincronizado.current.resaltados &&
      huellaActual.notas === ultimoSincronizado.current.notas;
    if (sinCambios) return undefined;

    let cancelado = false;
    let reintento = null;

    const intentar = (indice) => {
      sincronizar().catch(() => {
        if (cancelado) return;
        /*
         * Un ciclo fallido no deja nada a medias: la base sigue siendo la
         * anterior y lo local sigue intacto. Se reintenta, y si se agotan los
         * intentos el próximo cambio del usuario vuelve a disparar el ciclo.
         */
        const espera = ESPERAS_REINTENTO_MS[indice];
        if (espera === undefined) return;
        reintento = setTimeout(() => intentar(indice + 1), espera);
      });
    };

    const id = setTimeout(() => intentar(0), RETARDO_SYNC_MS);

    return () => {
      cancelado = true;
      clearTimeout(id);
      clearTimeout(reintento);
    };
  }, [hayCuenta, resaltados, notas, sincronizar]);

  // --- Operaciones ---------------------------------------------------------

  const colorDe = useCallback(
    (bookId, capitulo, versiculo) => resaltados[claveVersiculo(bookId, capitulo, versiculo)]?.color ?? null,
    [resaltados]
  );

  /** Pintar del mismo color que ya tenía lo APAGA: el botón es un interruptor. */
  const alternarResaltado = useCallback((bookId, capitulo, versiculo, color) => {
    const clave = claveVersiculo(bookId, capitulo, versiculo);
    setResaltados((previo) => {
      const copia = { ...previo };
      // La fecha es lo que deja resolver el choque cuando dos dispositivos
      // pintan el mismo versículo de colores distintos.
      if (copia[clave]?.color === color) delete copia[clave];
      else copia[clave] = { color, editadoEn: new Date().toISOString() };
      return copia;
    });
  }, []);

  const quitarResaltado = useCallback((bookId, capitulo, versiculo) => {
    const clave = claveVersiculo(bookId, capitulo, versiculo);
    setResaltados((previo) => {
      if (!(clave in previo)) return previo;
      const copia = { ...previo };
      delete copia[clave];
      return copia;
    });
  }, []);

  const notasDe = useCallback(
    (bookId, capitulo, versiculo) =>
      notas.filter((nota) => nota.bookId === bookId && nota.capitulo === Number(capitulo) && nota.versiculo === Number(versiculo)),
    [notas]
  );

  const agregarNota = useCallback((bookId, capitulo, versiculo, texto) => {
    const limpio = String(texto ?? "").trim();
    if (!limpio) return null;

    const ahora = new Date().toISOString();
    const nota = {
      // `crypto.randomUUID` no está en contextos inseguros (http en LAN), y la
      // app se abre así en el móvil durante desarrollo.
      id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bookId: Number(bookId),
      capitulo: Number(capitulo),
      versiculo: Number(versiculo),
      texto: limpio,
      creadoEn: ahora,
      editadoEn: ahora,
    };
    setNotas((previo) => [nota, ...previo]);
    return nota;
  }, []);

  const editarNota = useCallback((id, texto) => {
    const limpio = String(texto ?? "").trim();
    setNotas((previo) =>
      previo.map((nota) => (nota.id === id ? { ...nota, texto: limpio, editadoEn: new Date().toISOString() } : nota))
    );
  }, []);

  const eliminarNota = useCallback((id) => {
    setNotas((previo) => previo.filter((nota) => nota.id !== id));
  }, []);

  // --- Borradores ----------------------------------------------------------

  /**
   * Lo que hay a medio escribir para un versículo.
   *
   * `editando` se valida contra las notas actuales: si la nota que se estaba
   * editando ya no existe —se borró desde la pantalla de Notas, o llegó así de
   * otro dispositivo— el borrador se degrada a nota nueva en vez de intentar
   * actualizar un id fantasma.
   */
  const borradorDe = useCallback(
    (bookId, capitulo, versiculo) => {
      const guardado = borradores[claveVersiculo(bookId, capitulo, versiculo)];
      if (!guardado) return { texto: "", editando: null };

      const editando = guardado.editando && notas.some((nota) => nota.id === guardado.editando) ? guardado.editando : null;
      return { texto: guardado.texto ?? "", editando };
    },
    [borradores, notas]
  );

  /** Guarda (o limpia) el borrador de un versículo. */
  const guardarBorrador = useCallback((bookId, capitulo, versiculo, { texto, editando }) => {
    const clave = claveVersiculo(bookId, capitulo, versiculo);
    const limpio = String(texto ?? "");

    setBorradores((previo) => {
      const anterior = previo[clave];

      // Un borrador vacío y sin edición en curso no es nada: se quita para que
      // el objeto no acumule una entrada por cada versículo visitado.
      if (limpio.trim() === "" && !editando) {
        if (!anterior) return previo;
        const copia = { ...previo };
        delete copia[clave];
        return copia;
      }

      if (anterior?.texto === limpio && (anterior?.editando ?? null) === (editando ?? null)) return previo;
      return { ...previo, [clave]: { texto: limpio, editando: editando ?? null } };
    });
  }, []);

  /** Versículos con algo puesto, para el índice de la página de notas. */
  const versiculosAnotados = useMemo(() => {
    const mapa = new Map();

    for (const [clave, item] of Object.entries(resaltados)) {
      const ref = decodificarRef(Number(clave));
      mapa.set(clave, { ...ref, color: item.color, notas: [] });
    }
    for (const nota of notas) {
      const clave = claveVersiculo(nota.bookId, nota.capitulo, nota.versiculo);
      const previo = mapa.get(clave) ?? { bookId: nota.bookId, capitulo: nota.capitulo, versiculo: nota.versiculo, color: null, notas: [] };
      mapa.set(clave, { ...previo, notas: [...previo.notas, nota] });
    }

    return [...mapa.values()].sort(
      (a, b) => a.bookId - b.bookId || a.capitulo - b.capitulo || a.versiculo - b.versiculo
    );
  }, [resaltados, notas]);

  const valor = useMemo(
    () => ({
      resaltados,
      notas,
      colorDe,
      alternarResaltado,
      quitarResaltado,
      notasDe,
      agregarNota,
      editarNota,
      eliminarNota,
      borradorDe,
      guardarBorrador,
      versiculosAnotados,
      sincronizando: hayCuenta,
    }),
    [
      resaltados,
      notas,
      colorDe,
      alternarResaltado,
      quitarResaltado,
      notasDe,
      agregarNota,
      editarNota,
      eliminarNota,
      borradorDe,
      guardarBorrador,
      versiculosAnotados,
      hayCuenta,
    ]
  );

  return <AnotacionesContext.Provider value={valor}>{children}</AnotacionesContext.Provider>;
};

AnotacionesProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AnotacionesContext;
