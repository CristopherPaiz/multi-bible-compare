import { useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import LanguageContext from "../../context/LanguageContext";
import { BIBLIAS, ORDEN_IDIOMAS } from "../../data/biblias";

/**
 * Hoja inferior de selección: versión, libro o capítulo.
 *
 * Es un solo componente con tres modos en vez de tres modales porque los tres
 * hacen lo mismo (una lista larga, un filtro, un elemento marcado) y lo único
 * que cambia es de dónde salen las opciones. Con modales separados, cualquier
 * ajuste de comportamiento —cerrar con Escape, el foco al abrir, el marcado del
 * elemento activo— habría que repetirlo tres veces y se desincronizaría.
 */

const normalizar = (texto) =>
  String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const Selector3D = ({ modo, abierto, onCerrar, onElegir, actual, libros = [], capitulos = [], versionActual }) => {
  const { t } = useContext(LanguageContext);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!abierto) return;
    setBusqueda("");

    const alTeclear = (evento) => {
      if (evento.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto, modo, onCerrar]);

  const traducirIdioma = useMemo(
    () => (idioma) =>
      ({
        spanish: t("Espanol"),
        greek: t("Griego"),
        hebrew: t("Hebreo"),
        english: t("Ingles"),
        esperanto: t("Esperanto"),
        kiche: t("Kiche"),
        latin: t("Latin"),
        nahuatl: t("Nahuatl"),
        queqchi: t("Queqchi"),
        aramaic: t("Arameo"),
        guatemala: t("Guatemala"),
        portuguese: t("Portugues"),
        french: t("Frances"),
        german: t("Aleman"),
        italian: t("Italiano"),
      })[idioma] || idioma,
    [t]
  );

  const secciones = useMemo(() => {
    if (modo !== "version") return [];
    const termino = normalizar(busqueda.trim());

    return Object.keys(BIBLIAS)
      .sort((a, b) => ORDEN_IDIOMAS.indexOf(a) - ORDEN_IDIOMAS.indexOf(b))
      .map((idioma) => {
        const nombre = traducirIdioma(idioma);
        const versiones = Object.entries(BIBLIAS[idioma]).filter(
          ([titulo, datos]) => !termino || normalizar(titulo).includes(termino) || normalizar(nombre).includes(termino) || String(datos.year).includes(termino)
        );
        return { idioma, nombre, versiones };
      })
      .filter((seccion) => seccion.versiones.length > 0);
  }, [modo, busqueda, traducirIdioma]);

  const librosFiltrados = useMemo(() => {
    if (modo !== "libro") return [];
    const termino = normalizar(busqueda.trim());
    return libros.filter(({ nombre }) => !termino || normalizar(nombre).includes(termino));
  }, [modo, busqueda, libros]);

  if (!abierto) return null;

  const titulo = modo === "version" ? t("BuscarSeleccionarBiblia") : modo === "libro" ? t("SeleccionarLibroBoton") : t("SeleccionarCapitulo");

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/60 sm:items-center" onMouseDown={onCerrar}>
      <div
        className="animate-fade-in-up animate-duration-200 flex h-[80vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-neutral-900 dark:text-white sm:h-[70vh] sm:max-w-2xl sm:rounded-2xl"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <h2 className="flex-1 truncate text-base font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t("Cerrar")}
            className="grid h-9 w-9 place-items-center rounded-lg text-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            &times;
          </button>
        </header>

        {modo !== "capitulo" && (
          <div className="px-4 pt-3">
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder={modo === "version" ? t("BuscarVersionPlaceholder") : t("BuscarLibros")}
              className="w-full rounded-lg border border-black/15 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#a97109] dark:border-white/15 dark:bg-neutral-800 dark:focus:border-purple-400"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {modo === "version" &&
            (secciones.length === 0 ? (
              <p className="py-10 text-center text-sm opacity-70">{t("NoVersionesEncontradas")}</p>
            ) : (
              secciones.map((seccion) => (
                <section key={seccion.idioma} className="mb-4">
                  {/* El encabezado es pegajoso porque las secciones de español
                      e inglés son largas: sin él se pierde de vista a qué
                      idioma pertenece lo que se está mirando. */}
                  <h3 className="sticky top-0 z-10 bg-white py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a97109] dark:bg-neutral-900 dark:text-purple-300">
                    {seccion.nombre}
                  </h3>
                  <ul className="space-y-1">
                    {seccion.versiones.map(([titulo, datos]) => (
                      <li key={datos.ruta}>
                        <button
                          type="button"
                          onClick={() => onElegir(datos.ruta)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                            versionActual === datos.ruta ? "bg-[#a97109]/15 font-semibold dark:bg-purple-500/25" : ""
                          }`}
                        >
                          {titulo}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ))}

          {modo === "libro" && (
            <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {librosFiltrados.map(({ id, nombre }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onElegir(id)}
                    className={`w-full truncate rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                      actual === id ? "bg-[#a97109]/15 font-semibold dark:bg-purple-500/25" : ""
                    }`}
                  >
                    {nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {modo === "capitulo" && (
            <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8">
              {capitulos.map((numero) => (
                <li key={numero}>
                  <button
                    type="button"
                    onClick={() => onElegir(numero)}
                    className={`aspect-square w-full rounded-lg text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                      String(actual) === String(numero) ? "bg-[#a97109]/20 font-bold dark:bg-purple-500/30" : "bg-neutral-100 dark:bg-neutral-800"
                    }`}
                  >
                    {numero}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

Selector3D.propTypes = {
  modo: PropTypes.oneOf(["version", "libro", "capitulo"]).isRequired,
  abierto: PropTypes.bool,
  onCerrar: PropTypes.func.isRequired,
  onElegir: PropTypes.func.isRequired,
  actual: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  libros: PropTypes.array,
  capitulos: PropTypes.array,
  versionActual: PropTypes.string,
};

export default Selector3D;
