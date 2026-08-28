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

  const detener = useCallback(() => {
    detenidoRef.current = true;
    colaRef.current = [];
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

  const hablarSiguiente = useCallback(() => {
    if (detenidoRef.current) return;

    const siguiente = colaRef.current.shift();
    if (!siguiente) {
      setLeyendo(false);
      setVersiculoActual(null);
      return;
    }

    const enunciado = new SpeechSynthesisUtterance(siguiente.texto);
    enunciado.rate = velocidad;
    enunciado.lang = iso;

    const voz = voces.find((item) => item.name === vozElegida);
    if (voz) enunciado.voice = voz;

    enunciado.onstart = () => setVersiculoActual(siguiente.numero);
    enunciado.onend = () => hablarSiguiente();
    enunciado.onerror = () => hablarSiguiente();

    window.speechSynthesis.speak(enunciado);
  }, [velocidad, iso, voces, vozElegida]);

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

    setLeyendo(true);
    hablarSiguiente();
  }, [disponible, capitulo, desde, hablarSiguiente]);

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
