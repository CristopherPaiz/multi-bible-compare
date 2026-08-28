import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import DataContext from "../../context/DataContext";
import LanguageContext from "../../context/LanguageContext";
import AnotacionesContext from "../../context/AnotacionesContext";
import { COLORES, PUNTOS_COLOR } from "../../utils/paletaAnotaciones";
import { formatearReferencia } from "../../utils/referencia";
import { ISO_POR_IDIOMA, idiomaDeVersion } from "../../utils/versiones";
import PanelNotas from "./PanelNotas";
import PanelReferencias from "./PanelReferencias";
import PanelAudio from "./PanelAudio";
import PanelExportar from "./PanelExportar";

/**
 * Barra de estudio del versículo abierto.
 *
 * Todo lo que se puede HACER con un versículo —resaltarlo, anotarlo, ver sus
 * paralelos, escucharlo, sacarlo de la app— vive aquí y no repartido por los
 * paneles. La razón es que ninguna de esas acciones pertenece a una versión:
 * resaltar Juan 3:16 lo resalta en las seis columnas, porque lo que se marcó
 * fue el pasaje. Un botón por panel sugeriría lo contrario y multiplicaría por
 * seis los mismos controles.
 *
 * Los paneles se abren HACIA ARRIBA, sobre la barra. En móvil un modal a
 * pantalla completa taparía el versículo, que es justo lo que se está mirando
 * mientras se anota.
 */

const IconoResaltar = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m9 11-6 6v3h3l6-6" />
    <path d="m14.5 5.5 4 4" />
    <path d="M21 3 12.5 11.5l-2-2L19 1z" />
  </svg>
);

const IconoNota = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 4h16v11l-5 5H4z" />
    <path d="M20 15h-5v5" />
  </svg>
);

const IconoReferencias = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19" />
  </svg>
);

const IconoAudio = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

const IconoExportar = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 15V3" />
    <path d="m8 7 4-4 4 4" />
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </svg>
);

const IconoDiferencias = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 7h7" />
    <path d="M4 12h5" />
    <path d="M4 17h7" />
    <path d="M15 7h5" />
    <path d="M15 12h3" />
    <path d="M15 17h5" />
  </svg>
);

// Los seis iconos reciben la clase desde el llamador para poder cambiar de
// tamaño entre móvil y escritorio sin duplicar el SVG.
const CLASE = { className: PropTypes.string };
IconoResaltar.propTypes = CLASE;
IconoNota.propTypes = CLASE;
IconoReferencias.propTypes = CLASE;
IconoAudio.propTypes = CLASE;
IconoExportar.propTypes = CLASE;
IconoDiferencias.propTypes = CLASE;

const BarraEstudio = () => {
  const { t } = useContext(LanguageContext);
  const {
    libroSeleccionado,
    capituloSeleccionadoNumero,
    versiculoSeleccionadoNumero,
    versionTrabajo,
    modoDiferencias,
    alternarModoDiferencias,
  } = useContext(DataContext);
  const { colorDe, alternarResaltado, quitarResaltado, notasDe } = useContext(AnotacionesContext);

  const [panel, setPanel] = useState(null);

  const bookId = Number(String(libroSeleccionado ?? "").split("book")[1]);
  const hayVersiculo = Boolean(bookId && capituloSeleccionadoNumero && versiculoSeleccionadoNumero);

  // Al cambiar de pasaje se cierra lo que hubiera abierto: el panel de notas de
  // Juan 3:16 no debe quedarse visible cuando ya se está en Romanos 5.
  useEffect(() => {
    setPanel(null);
  }, [libroSeleccionado, capituloSeleccionadoNumero]);

  useEffect(() => {
    if (!panel) return;
    const alPulsarEscape = (evento) => {
      if (evento.key === "Escape") setPanel(null);
    };
    document.addEventListener("keydown", alPulsarEscape);
    return () => document.removeEventListener("keydown", alPulsarEscape);
  }, [panel]);

  if (!hayVersiculo) return null;

  const referencia = formatearReferencia({ bookId, capitulo: capituloSeleccionadoNumero, versiculo: versiculoSeleccionadoNumero }, t);
  const colorActual = colorDe(bookId, capituloSeleccionadoNumero, versiculoSeleccionadoNumero);
  const totalNotas = notasDe(bookId, capituloSeleccionadoNumero, versiculoSeleccionadoNumero).length;

  // La versión de trabajo la decide el contexto (ver `versionDeTrabajo`), no el
  // orden del catálogo: con una griega y una española abiertas, mandaba la que
  // tuviera el número de carpeta más bajo.
  const isoPrincipal = ISO_POR_IDIOMA[idiomaDeVersion(versionTrabajo)] ?? "es";

  const alternarPanel = (id) => setPanel((previo) => (previo === id ? null : id));

  const boton = (id, Icono, etiqueta, { activo = false, insignia = null } = {}) => (
    <button
      type="button"
      onClick={() => alternarPanel(id)}
      title={etiqueta}
      aria-label={etiqueta}
      aria-expanded={panel === id}
      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3 ${
        panel === id || activo
          ? "bg-amber-500 text-white dark:bg-purple-600"
          : "text-neutral-700 hover:bg-black/10 dark:text-neutral-200 dark:hover:bg-white/10"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Icono className="h-5 w-5" />
        <span className="hidden text-xs font-semibold sm:inline">{etiqueta}</span>
      </span>
      {insignia !== null && insignia > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">{insignia}</span>
      )}
    </button>
  );

  return (
    <div className="sticky bottom-0 z-20 mt-4">
      {panel && (
        <div className="animate-slide-in-bottom mx-auto w-11/12 max-w-3xl rounded-t-2xl border border-b-0 border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-[#161519]">
          <div className="mb-3 flex items-center justify-between gap-2">
            {/*
              El panel de referencias lleva la cita en el título porque su
              contenido es una LISTA DE OTRAS CITAS: sin decir de cuál salen, a
              los tres segundos ya no se sabe qué se está mirando. Los demás
              paneles hablan del versículo abierto, que está en la miga de pan.
            */}
            <h2 className="min-w-0 truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {panel === "referencias" ? t("Panel_referencias_de", { ref: referencia }) : t(`Panel_${panel}`)}
            </h2>
            <button
              type="button"
              onClick={() => setPanel(null)}
              aria-label={t("Cerrar")}
              className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="max-h-[45vh] overflow-y-auto pr-1">
            {panel === "resaltar" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{referencia}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {COLORES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => alternarResaltado(bookId, capituloSeleccionadoNumero, versiculoSeleccionadoNumero, color)}
                      title={t(`Color_${color}`)}
                      aria-label={t(`Color_${color}`)}
                      aria-pressed={colorActual === color}
                      className={`h-9 w-9 rounded-full transition-transform hover:scale-110 ${PUNTOS_COLOR[color]} ${
                        colorActual === color ? "ring-2 ring-neutral-900 ring-offset-2 dark:ring-white dark:ring-offset-[#161519]" : ""
                      }`}
                    ></button>
                  ))}
                  {colorActual && (
                    <button
                      type="button"
                      onClick={() => quitarResaltado(bookId, capituloSeleccionadoNumero, versiculoSeleccionadoNumero)}
                      className="ml-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
                    >
                      {t("ResaltarQuitar")}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">{t("ResaltarAyuda")}</p>
              </div>
            )}

            {panel === "notas" && (
              <PanelNotas bookId={bookId} capitulo={capituloSeleccionadoNumero} versiculo={versiculoSeleccionadoNumero} referencia={referencia} />
            )}

            {panel === "referencias" && <PanelReferencias bookId={bookId} capitulo={capituloSeleccionadoNumero} versiculo={versiculoSeleccionadoNumero} />}

            {panel === "audio" && versionTrabajo && <PanelAudio biblia={versionTrabajo} iso={isoPrincipal} />}

            {panel === "exportar" && <PanelExportar bookId={bookId} capitulo={capituloSeleccionadoNumero} versiculo={versiculoSeleccionadoNumero} />}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-11/12 max-w-3xl items-center gap-1 rounded-t-2xl border border-b-0 border-black/10 bg-[#fbefda] px-2 py-2 shadow-lg dark:border-white/10 dark:bg-[#20123A] sm:gap-2 sm:px-3">
        {/* La referencia no cabe en móvil junto a seis botones, y ya está en la
            miga de pan de arriba: aquí solo aparece cuando sobra sitio. */}
        <span className="hidden min-w-0 flex-1 truncate text-xs font-semibold text-neutral-700 dark:text-neutral-200 lg:block">{referencia}</span>

        <div className="flex flex-1 items-center justify-around gap-1 lg:flex-none lg:justify-end lg:gap-2">
          {boton("resaltar", IconoResaltar, t("Resaltar"), { activo: Boolean(colorActual) })}
          {boton("notas", IconoNota, t("NotasTitulo"), { insignia: totalNotas })}
          {boton("referencias", IconoReferencias, t("ReferenciasTitulo"))}
          {boton("audio", IconoAudio, t("AudioTitulo"))}
          {boton("exportar", IconoExportar, t("ExportarTitulo"))}

          {/* Este no abre panel: es un interruptor. Se queda en la barra porque
              es una forma de VER el versículo, no una acción sobre él. */}
          <button
            type="button"
            onClick={alternarModoDiferencias}
            title={t("DiferenciasTitulo")}
            aria-label={t("DiferenciasTitulo")}
            aria-pressed={modoDiferencias}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors sm:h-9 sm:w-auto sm:px-3 ${
              modoDiferencias ? "bg-amber-500 text-white dark:bg-purple-600" : "text-neutral-700 hover:bg-black/10 dark:text-neutral-200 dark:hover:bg-white/10"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <IconoDiferencias className="h-5 w-5" />
              <span className="hidden text-xs font-semibold sm:inline">{t("DiferenciasTitulo")}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarraEstudio;
