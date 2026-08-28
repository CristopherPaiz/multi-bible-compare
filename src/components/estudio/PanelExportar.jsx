import { useContext, useState } from "react";
import PropTypes from "prop-types";
import LanguageContext from "../../context/LanguageContext";
import DataContext from "../../context/DataContext";
import { capituloAMarkdown, citaDeVersiculo, comparacionATexto, copiarTexto, descargarTexto, nombreCortoVersion } from "../../utils/exportar";
import { formatearReferencia, slugDeLibro } from "../../utils/referencia";
import SelectorVersion from "./SelectorVersion";

/**
 * Sacar el pasaje de la app como texto.
 *
 * Compartir ya existía como imagen. Una imagen sirve para mandarla por
 * WhatsApp y no sirve para nada más: no se pega en un documento, no se busca
 * dentro, no se cita. Quien prepara un estudio necesita texto.
 *
 * Las tres formas son las tres cosas que la gente hace de verdad con un
 * pasaje: citarlo suelto, llevarse la comparación entera, o guardarse el
 * capítulo.
 */
const PanelExportar = ({ bookId, capitulo, versiculo }) => {
  const { t } = useContext(LanguageContext);
  const { bibliasSeleccionadas, textosPorBiblia, versionTrabajo } = useContext(DataContext);

  const [aviso, setAviso] = useState(null);

  const referencia = { bookId, capitulo: Number(capitulo), versiculo: Number(versiculo) };
  const etiqueta = formatearReferencia(referencia, t);
  const principal = versionTrabajo;

  const avisar = (clave) => {
    setAviso(clave);
    setTimeout(() => setAviso(null), 2000);
  };

  const conCopia = async (texto) => {
    if (!texto) return;
    avisar((await copiarTexto(texto)) ? "CompartirCopiado" : "CompartirErrorCopiar");
  };

  const entradas = bibliasSeleccionadas.map((biblia) => ({
    biblia,
    texto: textosPorBiblia[biblia]?.[String(versiculo)],
  }));

  const hayTexto = entradas.some((entrada) => entrada.texto);

  /** Nombre de archivo con la referencia dentro, para que se distingan sueltos. */
  const nombreArchivo = (sufijo, extension) => `${slugDeLibro(bookId)}-${capitulo}${sufijo}.${extension}`;

  const acciones = [
    {
      id: "cita",
      etiqueta: t("ExportarCita"),
      descripcion: t("ExportarCitaDesc"),
      onClick: () => {
        // La cita sale de la versión de trabajo. Si esa no tiene el versículo
        // (una edición solo-NT en un pasaje del AT) se cae a la primera que sí.
        const entrada = entradas.find((item) => item.biblia === principal && item.texto) ?? entradas.find((item) => item.texto);
        if (!entrada) return;
        conCopia(citaDeVersiculo({ texto: entrada.texto, referencia, version: entrada.biblia, t }));
      },
    },
    {
      id: "comparacion",
      etiqueta: t("ExportarComparacion"),
      descripcion: t("ExportarComparacionDesc"),
      onClick: () => conCopia(comparacionATexto({ entradas, referencia, t })),
    },
    {
      id: "capitulo",
      etiqueta: t("ExportarCapitulo"),
      descripcion: t("ExportarCapituloDesc"),
      onClick: () => {
        const texto = textosPorBiblia[principal];
        if (!texto || typeof texto !== "object") return;
        descargarTexto(nombreArchivo("", "md"), capituloAMarkdown({ capitulo: texto, referencia, version: principal, t }));
        avisar("CompartirGuardado");
      },
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {etiqueta}
        {principal && ` · ${nombreCortoVersion(principal)}`}
      </p>

      {/* Solo afecta a la cita y al capítulo. "Copiar comparación" saca TODAS
          las versiones abiertas, que es justo su motivo de existir. */}
      <SelectorVersion etiqueta={t("ExportarDesde")} />

      {!hayTexto ? (
        <p className="py-3 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("Cargando")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {acciones.map((accion) => (
            <li key={accion.id}>
              <button
                type="button"
                onClick={accion.onClick}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-left transition-colors hover:border-amber-400 hover:bg-amber-50 dark:border-neutral-800 dark:hover:border-purple-500 dark:hover:bg-purple-950/30"
              >
                <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">{accion.etiqueta}</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">{accion.descripcion}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aviso && (
        <p role="status" className="animate-fade-in text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {t(aviso)}
        </p>
      )}
    </div>
  );
};

PanelExportar.propTypes = {
  bookId: PropTypes.number.isRequired,
  capitulo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  versiculo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default PanelExportar;
