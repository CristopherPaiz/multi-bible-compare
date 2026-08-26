/**
 * Traducción de versículos.
 *
 * Reemplaza a `@translate-tools/core` + `corsproxy.io`, que estaban muertos:
 *   - `GoogleTranslator` vía corsproxy.io fallaba con "Failed to fetch".
 *   - `GoogleTranslatorTokenFree` ni siquiera existe como export en la versión
 *     instalada (0.0.10): construirlo tiraba "is not a constructor".
 *
 * El enfoque viene del userscript "Traducir Selección In-Page PRO": pegarle
 * directo al endpoint público de Google. La diferencia es que aquí NO hace
 * falta `GM_xmlhttpRequest`, porque `translate.googleapis.com` sí responde con
 * cabeceras CORS a una petición normal del navegador — comprobado.
 *
 * IMPORTANTE: esto tiene que correr en el NAVEGADOR, no en el backend. Google
 * bloquea las IPs de datacenter: la misma petición desde un servidor devuelve
 * 429 "your computer or network may be sending automated queries". Por eso no
 * se movió al API.
 */

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";

/** Trozo máximo por petición. Un versículo nunca lo alcanza; aplica a capítulos. */
const LIMITE_CHUNK = 4000;

const TIEMPO_LIMITE_MS = 10000;

/** Traducir el mismo versículo dos veces es común (ir y volver entre biblias). */
const cache = new Map();
const MAX_CACHE = 300;

/**
 * El texto de las versiones interlineales trae `<sup>2424 </sup>` incrustado
 * entre palabras. Traducirlo tal cual devuelve basura, así que se limpia antes.
 */
export const limpiarParaTraducir = (texto) =>
  String(texto ?? "")
    .replace(/<sup>[\s\S]*?<\/sup>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const partirEnTrozos = (texto, limite) => {
  if (texto.length <= limite) return [texto];

  const trozos = [];
  let resto = texto;

  while (resto.length > limite) {
    // Se corta en el último espacio para no partir una palabra por la mitad.
    let corte = resto.lastIndexOf(" ", limite);
    if (corte <= 0) corte = limite;
    trozos.push(resto.slice(0, corte));
    resto = resto.slice(corte).trimStart();
  }
  if (resto) trozos.push(resto);

  return trozos;
};

const pedirTrozo = async (trozo, desde, hacia, signal) => {
  const url = `${ENDPOINT}?client=gtx&sl=${encodeURIComponent(desde)}&tl=${encodeURIComponent(hacia)}&dt=t`;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  // Si quien llama cancela, se propaga al nuestro.
  const alAbortar = () => controlador.abort();
  signal?.addEventListener("abort", alAbortar);

  try {
    const respuesta = await fetch(url, {
      method: "POST",
      // POST en vez de GET: un capítulo completo revienta el límite de la URL.
      body: "q=" + encodeURIComponent(trozo),
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      signal: controlador.signal,
    });

    if (!respuesta.ok) throw new Error(`Traductor respondió ${respuesta.status}`);

    const datos = await respuesta.json();
    if (!Array.isArray(datos?.[0])) throw new Error("Respuesta inesperada del traductor");

    return datos[0].map((parte) => parte?.[0] ?? "").join("");
  } finally {
    clearTimeout(temporizador);
    signal?.removeEventListener("abort", alAbortar);
  }
};

/**
 * @param {object} opciones
 * @param {string} opciones.texto  puede traer markup; se limpia solo
 * @param {string} opciones.desde  ISO origen, o "auto"
 * @param {string} opciones.hacia  ISO destino
 * @returns {Promise<string>}
 */
export const traducir = async ({ texto, desde = "auto", hacia, signal }) => {
  const limpio = limpiarParaTraducir(texto);
  if (!limpio) return "";
  if (!hacia) throw new Error("Falta el idioma destino");

  const clave = `${desde}|${hacia}|${limpio}`;
  if (cache.has(clave)) return cache.get(clave);

  const trozos = partirEnTrozos(limpio, LIMITE_CHUNK);
  const partes = [];
  for (const trozo of trozos) {
    partes.push(await pedirTrozo(trozo, desde, hacia, signal));
  }
  const resultado = partes.join(" ");

  // Cache acotada: se descarta la entrada más vieja al llenarse.
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(clave, resultado);

  return resultado;
};
