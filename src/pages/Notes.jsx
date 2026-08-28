import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";
import AnotacionesContext from "../context/AnotacionesContext";
import { COLORES, PUNTOS_COLOR } from "../utils/paletaAnotaciones";
import { formatearReferencia, normalizar, rutaDeReferencia } from "../utils/referencia";
import { anotacionesAMarkdown, descargarTexto } from "../utils/exportar";
import { codificarVersiones } from "../utils/versiones";

/**
 * Todo lo que el usuario ha marcado o escrito, en un sitio.
 *
 * Es la única pantalla de la app cuyo contenido no se puede regenerar. El texto
 * bíblico está en el servidor y en el CDN; esto solo existe porque alguien se
 * sentó a escribirlo. De ahí el botón de exportar bien visible: quien confía
 * sus notas a una app tiene derecho a poder sacarlas sin pedir permiso.
 */
const Notes = () => {
  const { t } = useContext(LanguageContext);
  const { bibliasSeleccionadas } = useContext(DataContext);
  const { versiculosAnotados, eliminarNota, quitarResaltado, sincronizando } = useContext(AnotacionesContext);
  const navigate = useNavigate();

  const [filtroColor, setFiltroColor] = useState(null);
  const [soloNotas, setSoloNotas] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    const clave = normalizar(busqueda);

    return versiculosAnotados.filter((item) => {
      if (filtroColor && item.color !== filtroColor) return false;
      if (soloNotas && item.notas.length === 0) return false;

      if (clave) {
        const referencia = normalizar(formatearReferencia({ bookId: item.bookId, capitulo: item.capitulo, versiculo: item.versiculo }, t));
        const cuerpo = normalizar(item.notas.map((nota) => nota.texto).join(" "));
        if (!referencia.includes(clave) && !cuerpo.includes(clave)) return false;
      }

      return true;
    });
  }, [versiculosAnotados, filtroColor, soloNotas, busqueda, t]);

  const totalNotas = versiculosAnotados.reduce((suma, item) => suma + item.notas.length, 0);
  const totalResaltados = versiculosAnotados.filter((item) => item.color).length;

  const abrir = (item) => {
    const codigos = codificarVersiones(bibliasSeleccionadas);
    navigate(`${rutaDeReferencia({ bookId: item.bookId, capitulo: item.capitulo, versiculo: item.versiculo })}${codigos ? `?v=${codigos}` : ""}`);
  };

  const exportar = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    descargarTexto(`anotaciones-${fecha}.md`, anotacionesAMarkdown({ anotados: versiculosAnotados, t }));
  };

  return (
    <div className="mx-auto w-11/12 max-w-3xl pb-16 dark:text-white">
      <h1 className="animate-fade-in mt-7 text-center text-xl font-bold">{t("NotasTitulo")}</h1>

      <p className="mt-2 text-center text-xs text-neutral-600 dark:text-neutral-400">
        {t("NotasResumen", { notas: totalNotas, resaltados: totalResaltados })}
        {/* Sin cuenta todo esto vive solo en este navegador. Decirlo evita la
            sorpresa de cambiar de teléfono y no encontrar nada. */}
        {!sincronizando && <span className="ml-1 text-amber-600 dark:text-amber-400">{t("NotasSoloLocal")}</span>}
      </p>

      {versiculosAnotados.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("NotasVacio")}</p>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3">
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder={t("NotasBuscar")}
              aria-label={t("NotasBuscar")}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-purple-400"
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSoloNotas((previo) => !previo)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  soloNotas ? "bg-sky-500 text-white" : "bg-black/5 text-neutral-700 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200"
                }`}
              >
                {t("NotasSoloConNota")}
              </button>

              {COLORES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFiltroColor((previo) => (previo === color ? null : color))}
                  title={t(`Color_${color}`)}
                  aria-label={t(`Color_${color}`)}
                  aria-pressed={filtroColor === color}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${PUNTOS_COLOR[color]} ${
                    filtroColor === color ? "ring-2 ring-neutral-900 ring-offset-2 dark:ring-white dark:ring-offset-[#161519]" : ""
                  }`}
                ></button>
              ))}

              <button
                type="button"
                onClick={exportar}
                className="ml-auto rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 dark:bg-purple-600 dark:hover:bg-purple-700"
              >
                {t("NotasExportar")}
              </button>
            </div>
          </div>

          <ul className="mt-5 flex flex-col gap-3">
            {visibles.map((item) => {
              const referencia = formatearReferencia({ bookId: item.bookId, capitulo: item.capitulo, versiculo: item.versiculo }, t);
              return (
                <li key={`${item.bookId}-${item.capitulo}-${item.versiculo}`} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-center gap-2">
                    {item.color && <span className={`h-3 w-3 shrink-0 rounded-full ${PUNTOS_COLOR[item.color]}`}></span>}
                    <button type="button" onClick={() => abrir(item)} className="text-sm font-bold text-amber-700 hover:underline dark:text-purple-300">
                      {referencia}
                    </button>
                    {item.color && (
                      <button
                        type="button"
                        onClick={() => quitarResaltado(item.bookId, item.capitulo, item.versiculo)}
                        className="ml-auto rounded px-2 py-1 text-[11px] font-medium text-neutral-500 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/10"
                      >
                        {t("ResaltarQuitar")}
                      </button>
                    )}
                  </div>

                  {item.notas.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-2">
                      {item.notas.map((nota) => (
                        <li key={nota.id} className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60">
                          <p className="whitespace-pre-wrap break-words text-sm text-neutral-800 dark:text-neutral-200">{nota.texto}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[11px] text-neutral-400">{(nota.editadoEn ?? nota.creadoEn ?? "").slice(0, 10)}</span>
                            <button
                              type="button"
                              onClick={() => eliminarNota(nota.id)}
                              className="rounded px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              {t("NotasEliminar")}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {visibles.length === 0 && <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("NoResultados")}</p>}
        </>
      )}
    </div>
  );
};

export default Notes;
