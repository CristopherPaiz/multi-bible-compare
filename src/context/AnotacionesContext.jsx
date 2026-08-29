import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import AuthContext from "./AuthContext";
import { guardarNotas, guardarResaltados, leerNotas, leerResaltados } from "../services/authSource";
import { codificarRef, decodificarRef } from "../utils/referencia";

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

export const AnotacionesProvider = ({ children }) => {
  const { usuario, disponible, sesionIncierta } = useContext(AuthContext);

  /** `{ "2818320": "amarillo" }` — clave empaquetada -> color. */
  const [resaltados, setResaltados] = useState(() => leerLocal(CLAVE_RESALTADOS, {}));

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

  /*
   * `sesionIncierta` = el backend no contestó a "¿quién soy?". No es lo mismo
   * que no tener cuenta: mientras no se sepa, no se toca nada del servidor.
   */
  const hayCuenta = Boolean(usuario && disponible && !sesionIncierta);

  // --- Empuje al servidor, con retardo ------------------------------------
  //
  // El primer render tras cargar la sesión NO debe empujar: lo que hay en
  // memoria todavía no se ha fusionado con lo del servidor, y mandarlo
  // borraría en el servidor lo que este dispositivo aún no conoce.
  //
  // Esto es lo que hacía que iniciar sesión borrara notas. La bandera se ponía
  // en un `finally`, o sea también cuando la fusión FALLABA. Con el backend
  // dormido, el primer resaltado mandaba un PUT con solo lo local — y el PUT
  // reemplaza el conjunto entero. Ahora solo se levanta si la fusión salió
  // bien; si falla, se reintenta y no se empuja nada mientras tanto.
  const listoParaEmpujar = useRef(false);

  useEffect(() => {
    if (!hayCuenta) {
      listoParaEmpujar.current = false;
      return undefined;
    }

    let cancelado = false;
    let temporizador = null;

    const fusionar = async () => {
      const [remotosResaltados, remotasNotas] = await Promise.all([leerResaltados(), leerNotas()]);
      if (cancelado) return;

      /*
       * Unión, no reemplazo. Si el usuario resaltó versículos en el teléfono
       * y otros en la laptop, se quedan todos. En el choque —el mismo
       * versículo con dos colores— gana lo local: es lo que el usuario tiene
       * delante y acaba de ver.
       */
      setResaltados((locales) => {
        const fusion = {};
        for (const item of remotosResaltados ?? []) {
          fusion[claveVersiculo(item.bookId, item.chapter, item.verse)] = item.color;
        }
        return { ...fusion, ...locales };
      });

      setNotas((locales) => {
        const vistas = new Set(locales.map((nota) => `${nota.bookId}|${nota.capitulo}|${nota.versiculo}|${nota.texto}`));
        const convertidas = (remotasNotas ?? [])
          .map((nota) => ({
            id: `srv-${nota.id}`,
            bookId: nota.bookId,
            capitulo: nota.chapter,
            versiculo: nota.verse,
            texto: nota.body,
            creadoEn: nota.createdAt,
            editadoEn: nota.updatedAt,
          }))
          .filter((nota) => !vistas.has(`${nota.bookId}|${nota.capitulo}|${nota.versiculo}|${nota.texto}`));

        return [...locales, ...convertidas];
      });
    };

    const intentar = (indice) => {
      fusionar()
        .then(() => {
          if (cancelado) return;
          listoParaEmpujar.current = true;
        })
        .catch(() => {
          if (cancelado) return;
          // Sin fusión confirmada NO se empuja: hacerlo borraría en el servidor
          // lo que este dispositivo todavía no ha bajado.
          const espera = ESPERAS_REINTENTO_MS[indice];
          if (espera === undefined) return;
          temporizador = setTimeout(() => intentar(indice + 1), espera);
        });
    };

    intentar(0);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [hayCuenta]);

  useEffect(() => {
    if (!hayCuenta || !listoParaEmpujar.current) return;

    const id = setTimeout(() => {
      const lista = Object.entries(resaltados).map(([clave, color]) => {
        const { bookId, capitulo, versiculo } = decodificarRef(Number(clave));
        return { bookId, chapter: capitulo, verse: versiculo, color };
      });
      guardarResaltados(lista).catch(() => {});
    }, RETARDO_SYNC_MS);

    return () => clearTimeout(id);
  }, [resaltados, hayCuenta]);

  useEffect(() => {
    if (!hayCuenta || !listoParaEmpujar.current) return;

    const id = setTimeout(() => {
      const lista = notas.map((nota) => ({
        bookId: nota.bookId,
        chapter: nota.capitulo,
        verse: nota.versiculo,
        body: nota.texto,
        createdAt: nota.creadoEn,
        updatedAt: nota.editadoEn,
      }));
      guardarNotas(lista).catch(() => {});
    }, RETARDO_SYNC_MS);

    return () => clearTimeout(id);
  }, [notas, hayCuenta]);

  // --- Operaciones ---------------------------------------------------------

  const colorDe = useCallback(
    (bookId, capitulo, versiculo) => resaltados[claveVersiculo(bookId, capitulo, versiculo)] ?? null,
    [resaltados]
  );

  /** Pintar del mismo color que ya tenía lo APAGA: el botón es un interruptor. */
  const alternarResaltado = useCallback((bookId, capitulo, versiculo, color) => {
    const clave = claveVersiculo(bookId, capitulo, versiculo);
    setResaltados((previo) => {
      const copia = { ...previo };
      if (copia[clave] === color) delete copia[clave];
      else copia[clave] = color;
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

    for (const [clave, color] of Object.entries(resaltados)) {
      const ref = decodificarRef(Number(clave));
      mapa.set(clave, { ...ref, color, notas: [] });
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
