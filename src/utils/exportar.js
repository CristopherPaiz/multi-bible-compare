/**
 * Sacar el texto de la app.
 *
 * Compartir ya existía, pero solo como imagen: bonito para WhatsApp e inútil
 * para quien prepara un estudio, porque de una imagen no se copia una cita ni
 * se pega en un documento. Esto cubre el otro caso — texto que se pega, se
 * archiva y se busca.
 *
 * Todo sale del texto YA limpio de marcado: los números Strong y los códigos
 * morfológicos son andamiaje de la app, no del texto bíblico, y pegados en un
 * documento son basura.
 */
import { aTextoPlano } from "./textoPlano";
import { formatearReferencia } from "./referencia";

/** "075. Español - Reina Valera [RV60] (1960)" -> "Reina Valera [RV60] (1960)" */
export const nombreCortoVersion = (ruta) => String(ruta ?? "").split(" - ").slice(1).join(" - ").trim() || String(ruta ?? "");

/**
 * Una cita lista para pegar: texto entrecomillado, referencia y versión.
 *
 * @param {object} datos
 * @param {string} datos.texto     versículo con o sin marcado
 * @param {object} datos.referencia { bookId, capitulo, versiculo }
 * @param {string} [datos.version] ruta de la versión
 * @param {Function} datos.t       traductor, para el nombre del libro
 */
export const citaDeVersiculo = ({ texto, referencia, version, t }) => {
  const limpio = aTextoPlano(texto);
  const ref = formatearReferencia(referencia, t);
  const sufijo = version ? ` (${nombreCortoVersion(version)})` : "";
  return `«${limpio}» — ${ref}${sufijo}`;
};

/**
 * El mismo versículo en varias versiones, una debajo de otra.
 *
 * Es el formato que pide el caso real de esta app: alguien comparó seis
 * traducciones y quiere llevarse la comparación entera, no una sola línea.
 */
export const comparacionATexto = ({ entradas, referencia, t }) => {
  const ref = formatearReferencia(referencia, t);
  const cuerpo = entradas
    .filter((entrada) => entrada.texto)
    .map((entrada) => `${nombreCortoVersion(entrada.biblia)}\n${aTextoPlano(entrada.texto)}`)
    .join("\n\n");
  return `${ref}\n${"=".repeat(ref.length)}\n\n${cuerpo}\n`;
};

/** Capítulo completo de una versión, en Markdown, un versículo por párrafo. */
export const capituloAMarkdown = ({ capitulo, referencia, version, t }) => {
  const titulo = `${formatearReferencia({ ...referencia, versiculo: null }, t)}`;
  const cuerpo = Object.entries(capitulo ?? {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([numero, texto]) => {
      const limpio = aTextoPlano(texto);
      return limpio ? `**${numero}** ${limpio}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  return `# ${titulo}\n\n_${nombreCortoVersion(version)}_\n\n${cuerpo}\n`;
};

/**
 * Resaltados y notas del usuario, en Markdown.
 *
 * Es lo único de la app que no se puede volver a generar: el texto bíblico está
 * en el servidor y en el CDN, pero lo que el usuario escribió solo está donde
 * él lo escribió. Poder sacarlo en un archivo es la diferencia entre confiar en
 * la app y depender de ella.
 */
export const anotacionesAMarkdown = ({ anotados, t }) => {
  if (!anotados || anotados.length === 0) return "# Mis anotaciones\n\n_(vacío)_\n";

  const secciones = anotados.map((item) => {
    const ref = formatearReferencia({ bookId: item.bookId, capitulo: item.capitulo, versiculo: item.versiculo }, t);
    const lineas = [`## ${ref}`];

    if (item.color) lineas.push(`> Resaltado: ${item.color}`);
    for (const nota of item.notas ?? []) {
      const fecha = (nota.editadoEn ?? nota.creadoEn ?? "").slice(0, 10);
      lineas.push(`${fecha ? `_${fecha}_\n\n` : ""}${nota.texto}`);
    }

    return lineas.join("\n\n");
  });

  return `# Mis anotaciones\n\n${secciones.join("\n\n---\n\n")}\n`;
};

/**
 * Copia al portapapeles.
 *
 * `navigator.clipboard` no existe en contextos inseguros (http en la red local,
 * que es como se prueba la app en el móvil) ni en navegadores viejos, así que
 * hay respaldo con un textarea temporal. Devuelve si lo consiguió, para que la
 * UI no diga "copiado" cuando no copió nada.
 */
export const copiarTexto = async (texto) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }

    const area = document.createElement("textarea");
    area.value = texto;
    // Fuera de la vista pero dentro del documento: `execCommand` no copia de un
    // elemento con `display:none`.
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
};

/** Descarga un texto como archivo. */
export const descargarTexto = (nombreArchivo, contenido, tipo = "text/markdown;charset=utf-8") => {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  // Sin revocar, el blob se queda en memoria hasta recargar la página.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
