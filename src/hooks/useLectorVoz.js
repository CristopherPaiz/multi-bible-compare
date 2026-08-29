import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { aTextoPlano } from "../utils/textoPlano";

/**
 * Lectura en voz alta del capítulo, con la síntesis del propio navegador.
 *
 * Es la forma barata de tener Biblia hablada: no hay que grabar 1189 capítulos
 * por 162 versiones, ni servirlos, ni pagar el ancho de banda. El texto ya está
 * en pantalla y el sistema operativo ya sabe leerlo.
 *
 * A cambio hay dos limitaciones que conviene conocer:
 *
 *   - La calidad y las voces disponibles son las del dispositivo. En Android y
 *     iOS suelen ser buenas; en un Linux pelado puede no haber ninguna, y por
 *     eso `disponible` se comprueba antes de enseñar el botón.
 *   - No se lee todo de una vez. Chrome corta los enunciados largos alrededor
 *     de los 15 segundos, así que se encola UN VERSÍCULO POR ENUNCIADO. Eso
 *     además da gratis lo que se quería: saber por dónde va la lectura para
 *     seguirla en pantalla.
 */

const CLAVE_VOZ = "lectorVoz";
const CLAVE_VELOCIDAD = "lectorVelocidad";

/** El navegador entrega las voces de forma asíncrona, y a veces vacías al inicio. */
const useVoces = () => {
  const [voces, setVoces] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const cargar = () => setVoces(window.speechSynthesis.getVoices());
    cargar();

    // En Chrome la primera llamada devuelve [] y la lista llega después.
    window.speechSynthesis.addEventListener("voiceschanged", cargar);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", cargar);
  }, []);

  return voces;
};

/**
 * @param {object} opciones
 * @param {Record<string,string>} opciones.capitulo texto por número de versículo
 * @param {string} opciones.iso   idioma del texto ("es", "en", ...)
 * @param {number} opciones.desde versículo por el que empezar
 */
export const useLectorVoz = ({ capitulo, iso = "es", desde = 1 } = {}) => {
  const voces = useVoces();
  const [leyendo, setLeyendo] = useState(false);
  const [versiculoActual, setVersiculoActual] = useState(null);

  const [vozElegida, setVozElegida] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_VOZ) ?? "";
    } catch {
      return "";
    }
  });

  const [velocidad, setVelocidad] = useState(() => {
    try {
      const guardada = Number(localStorage.getItem(CLAVE_VELOCIDAD));
      return guardada >= 0.5 && guardada <= 2 ? guardada : 1;
    } catch {
      return 1;
    }
  });

  const disponible = typeof window !== "undefined" && "speechSynthesis" in window && voces.length > 0;

  /** Voces del idioma del texto primero; el resto detrás, no escondidas. */
  const vocesOrdenadas = useMemo(() => {
    const prefijo = String(iso).toLowerCase().slice(0, 2);
    const coincide = (voz) => voz.lang.toLowerCase().startsWith(prefijo);
    return [...voces.filter(coincide), ...voces.filter((voz) => !coincide(voz))];
  }, [voces, iso]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_VOZ, vozElegida);
    } catch {
      // sin persistencia
    }
  }, [vozElegida]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_VELOCIDAD, String(velocidad));
    } catch {
      // sin persistencia
    }
  }, [velocidad]);

  /** Cola pendiente. En un ref porque `onend` la consulta fuera del render. */
  const colaRef = useRef([]);
  const detenidoRef = useRef(false);

  /** El versículo que está sonando, para poder reanudarlo con otros ajustes. */
  const actualRef = useRef(null);

  /*
   * ---------------------------------------------------------------------------
   * Los ajustes se leen de un ref, no del cierre
   * ---------------------------------------------------------------------------
   * Cada versículo se encadena con `enunciado.onend = () => hablarSiguiente()`.
   * Ese manejador CONGELA la versión de `hablarSiguiente` que existía cuando se
   * creó el enunciado, y con ella los valores de `velocidad`, `iso`, `voces` y
   * `vozElegida` de aquel render.
   *
   * Por eso pulsar 2x no hacía nada: React sí creaba un `hablarSiguiente` nuevo
   * con la velocidad nueva, pero nadie lo llamaba. La cadena seguía siendo la
   * vieja y arrastraba el 1x hasta el final del capítulo. El comentario del
   * panel prometía que "cada versículo se encola con los ajustes que hubiera al
   * empezarlo", y eso es justo lo que NO pasaba.
   *
   * Con un ref, la cadena lee siempre el valor de ahora.
   */
  const ajustesRef = useRef({ velocidad, iso, voces, vozElegida });
  ajustesRef.current = { velocidad, iso, voces, vozElegida };

  /*
   * `cancel()` dispara el `onend` del enunciado que estaba sonando. Sin esta
   * bandera, cancelar para reiniciar con otra velocidad haría que ese `onend`
   * avanzara al versículo siguiente y se saltara uno.
   */
  const ignorarFinRef = useRef(false);

  const detener = useCallback(() => {
    detenidoRef.current = true;
    colaRef.current = [];
    actualRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setLeyendo(false);
    setVersiculoActual(null);
  }, []);

  /*
   * Si el componente se desmonta —cambiar de página, cerrar el panel— la voz
   * sigue sonando: `speechSynthesis` es del navegador, no de React. Sin esto la
   * app queda leyendo un capítulo que ya nadie tiene delante.
   */
  useEffect(() => detener, [detener]);

  /*
   * Estable a propósito (`[]`): es la función que se encadena a sí misma desde
   * `onend`, así que si cambiara de identidad la cadena quedaría apuntando a una
   * versión vieja. Todo lo variable entra por `ajustesRef`.
   */
  const hablarSiguiente = useCallback(() => {
    if (detenidoRef.current) return;

    const siguiente = colaRef.current.shift();
    if (!siguiente) {
      actualRef.current = null;
      setLeyendo(false);
      setVersiculoActual(null);
      return;
    }

    actualRef.current = siguiente;

    const { velocidad: rate, iso: lang, voces: disponibles, vozElegida: nombreVoz } = ajustesRef.current;

    const enunciado = new SpeechSynthesisUtterance(siguiente.texto);
    enunciado.rate = rate;
    enunciado.lang = lang;

    const voz = disponibles.find((item) => item.name === nombreVoz);
    if (voz) enunciado.voice = voz;

    enunciado.onstart = () => setVersiculoActual(siguiente.numero);
    enunciado.onend = () => {
      if (ignorarFinRef.current) return;
      hablarSiguiente();
    };
    enunciado.onerror = () => {
      if (ignorarFinRef.current) return;
      hablarSiguiente();
    };

    window.speechSynthesis.speak(enunciado);
  }, []);

  /**
   * Vuelve a decir el versículo en curso con los ajustes de ahora.
   *
   * La Web Speech API no deja cambiarle la velocidad ni la voz a algo que ya
   * está sonando: `rate` se lee al arrancar el enunciado y a partir de ahí es
   * de solo lectura de hecho. La única forma de que 2x se note YA es cortar y
   * volver a empezar ese versículo.
   *
   * Se reinicia el versículo entero y no se intenta seguir donde iba: la API no
   * dice por qué palabra va —`onboundary` no lo dan todas las voces— y volver
   * al principio de un versículo es un salto que se entiende; quedarse mudo
   * medio segundo y continuar a destiempo, no.
   */
  const reiniciarActual = useCallback(() => {
    const actual = actualRef.current;
    if (!actual || detenidoRef.current) return;

    ignorarFinRef.current = true;
    window.speechSynthesis.cancel();

    // Se devuelve al frente de la cola y se arranca de nuevo.
    colaRef.current = [actual, ...colaRef.current];

    /*
     * `cancel()` es asíncrono en Chrome: hablar en el mismo tick puede caer
     * dentro de la propia cancelación y quedarse en silencio. Un salto al
     * siguiente turno de eventos basta, y de paso deja pasar el `onend` que hay
     * que ignorar antes de volver a bajar la bandera.
     */
    setTimeout(() => {
      ignorarFinRef.current = false;
      if (detenidoRef.current) return;
      hablarSiguiente();
    }, 0);
  }, [hablarSiguiente]);

  /**
   * Encola el capítulo desde `desde` y arranca.
   *
   * Quien quiera seguir la lectura en pantalla mira `versiculoActual`, que se
   * actualiza al empezar cada enunciado.
   */
  const reproducir = useCallback(() => {
    if (!disponible || !capitulo || typeof capitulo !== "object") return;

    detenidoRef.current = false;
    window.speechSynthesis.cancel();

    colaRef.current = Object.entries(capitulo)
      .map(([numero, texto]) => ({ numero: Number(numero), texto: aTextoPlano(texto) }))
      .filter((item) => item.numero >= Number(desde) && item.texto.trim() !== "")
      .sort((a, b) => a.numero - b.numero);

    if (colaRef.current.length === 0) return;

    actualRef.current = null;
    setLeyendo(true);
    hablarSiguiente();
  }, [disponible, capitulo, desde, hablarSiguiente]);

  /*
   * Cambiar la velocidad o la voz mientras se lee se aplica AL MOMENTO.
   *
   * Es lo que espera cualquiera que pulsa 2x: si el efecto se pospusiera al
   * versículo siguiente, el botón parecería roto durante los diez segundos que
   * dura el actual — que es exactamente cómo se comportaba.
   *
   * No corre en el primer render ni con la lectura parada: ahí no hay nada que
   * reiniciar y `reproducir` ya cogerá los valores nuevos.
   */
  const primeraVez = useRef(true);

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (!leyendo) return;
    reiniciarActual();
    // `leyendo` NO entra como dependencia: solo debe dispararlo un cambio de
    // ajuste, no el propio arranque de la lectura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [velocidad, vozElegida]);

  const pausar = useCallback(() => {
    if (!window.speechSynthesis?.speaking) return;
    window.speechSynthesis.pause();
    setLeyendo(false);
  }, []);

  const reanudar = useCallback(() => {
    if (!window.speechSynthesis?.paused) return;
    window.speechSynthesis.resume();
    setLeyendo(true);
  }, []);

  return {
    disponible,
    leyendo,
    versiculoActual,
    voces: vocesOrdenadas,
    vozElegida,
    setVozElegida,
    velocidad,
    setVelocidad,
    reproducir,
    pausar,
    reanudar,
    detener,
  };
};
