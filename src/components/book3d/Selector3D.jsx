import { useContext, useEffect, useId, useMemo, useRef, useState } from "react";
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

/** Qué puede recibir el foco dentro del panel. */
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Selector3D = ({ modo, abierto, onCerrar, onElegir, actual, libros = [], capitulos = [], versionActual }) => {
  const { t } = useContext(LanguageContext);
  const [busqueda, setBusqueda] = useState("");

  const panelRef = useRef(null);
  const buscadorRef = useRef(null);
  /** El botón del elemento ya seleccionado, para dejarlo a la vista al abrir. */
  const activoRef = useRef(null);

  const tituloId = useId();

  useEffect(() => {
    if (!abierto) return;
    setBusqueda("");
  }, [abierto, modo]);

  /*
   * Foco: entra al abrir y vuelve al salir.
   *
   * Sin esto el diálogo era invisible para el teclado y para un lector de
   * pantalla: se abría, el foco se quedaba en el botón de la barra que hay
   * DEBAJO del velo, y tabular recorría la pantalla tapada en vez del panel.
   *
   * El buscador solo se enfoca con puntero fino. En un móvil, enfocar un campo
   * abre el teclado en pantalla, y el teclado se come media lista justo cuando
   * lo que el usuario quiere es mirarla y tocar una opción.
   */
  useEffect(() => {
    if (!abierto) return;

    const previo = document.activeElement;
    const punteroFino = window.matchMedia?.("(pointer: fine)").matches;

    if (punteroFino && buscadorRef.current) buscadorRef.current.focus();
    else panelRef.current?.focus();

    // El capítulo 119 de Salmos está muy abajo en una cuadrícula de 150; sin
    // esto había que buscarlo a mano cada vez que se abría el selector.
    activoRef.current?.scrollIntoView({ block: "center" });

    return () => {
      if (previo instanceof HTMLElement) previo.focus();
    };
  }, [abierto, modo]);

  /*
   * Teclado del diálogo: Escape cierra y el tabulador no se escapa.
   *
   * El ciclo del tabulador se cierra a mano porque el panel es un `div` sobre
   * un velo, no un `<dialog>` nativo: nada impide que el foco siga hasta los
   * controles de la barra que quedan debajo.
   */
  useEffect(() => {
    if (!abierto) return;

    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCerrar();
        return;
      }

      if (evento.key !== "Tab") return;

      const dentro = panelRef.current?.querySelectorAll(ENFOCABLES);
      if (!dentro?.length) return;

      const primero = dentro[0];
      const ultimo = dentro[dentro.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto, onCerrar]);

  /*
   * El botón "atrás" del sistema cierra el panel en vez de salirse del lector.
   *
   * En la app instalada esto era lo peor del selector: se abría la lista de
   * versiones, el usuario hacía el gesto de volver —que en un móvil es el gesto
   * de "cerrar esto"— y se salía de la pantalla entera.
   *
   * La entrada de historial se retira al cerrar por cualquier otro camino
   * (Escape, la equis, elegir algo). El sello permite distinguir los dos casos:
   * si se cerró por el gesto atrás, el navegador ya la quitó y no hay nada que
   * deshacer; si sigue ahí, la quitamos nosotros para que el siguiente "atrás"
   * del usuario no se gaste en una entrada fantasma.
   */
  useEffect(() => {
    if (!abierto) return;

    const sello = `selector3d-${Date.now()}`;
    window.history.pushState({ selector3d: sello }, "");

    const alVolver = () => onCerrar();
    window.addEventListener("popstate", alVolver);

    return () => {
      window.removeEventListener("popstate", alVolver);
      if (window.history.state?.selector3d === sello) window.history.back();
    };
  }, [abierto, onCerrar]);

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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="animate-fade-in-up animate-duration-200 flex h-[80vh] max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl outline-none dark:bg-neutral-900 dark:text-white sm:h-[70vh] sm:max-w-2xl sm:rounded-2xl"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <h2 id={tituloId} className="flex-1 truncate text-base font-bold">
            {titulo}
          </h2>
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
              ref={buscadorRef}
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder={modo === "version" ? t("BuscarVersionPlaceholder") : t("BuscarLibros")}
              className="w-full rounded-lg border border-black/15 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-[#a97109] dark:border-white/15 dark:bg-neutral-800 dark:focus:border-purple-400"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                    {seccion.versiones.map(([titulo, datos]) => {
                      const esActual = versionActual === datos.ruta;
                      return (
                        <li key={datos.ruta}>
                          <button
                            ref={esActual ? activoRef : undefined}
                            type="button"
                            aria-current={esActual ? "true" : undefined}
                            onClick={() => onElegir(datos.ruta)}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                              esActual ? "bg-[#a97109]/15 font-semibold dark:bg-purple-500/25" : ""
                            }`}
                          >
                            {titulo}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ))}

          {modo === "libro" && (
            <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {librosFiltrados.map(({ id, nombre }) => {
                const esActual = actual === id;
                return (
                  <li key={id}>
                    <button
                      ref={esActual ? activoRef : undefined}
                      type="button"
                      aria-current={esActual ? "true" : undefined}
                      onClick={() => onElegir(id)}
                      className={`w-full truncate rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                        esActual ? "bg-[#a97109]/15 font-semibold dark:bg-purple-500/25" : ""
                      }`}
                    >
                      {nombre}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {modo === "capitulo" && (
            <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8">
              {capitulos.map((numero) => {
                const esActual = String(actual) === String(numero);
                return (
                  <li key={numero}>
                    <button
                      ref={esActual ? activoRef : undefined}
                      type="button"
                      aria-current={esActual ? "true" : undefined}
                      onClick={() => onElegir(numero)}
                      className={`aspect-square w-full rounded-lg text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                        esActual ? "bg-[#a97109]/20 font-bold dark:bg-purple-500/30" : "bg-neutral-100 dark:bg-neutral-800"
                      }`}
                    >
                      {numero}
                    </button>
                  </li>
                );
              })}
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
