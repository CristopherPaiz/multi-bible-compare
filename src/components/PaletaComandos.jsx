import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import ThemeContext from "../context/ThemeContext";
import DataContext from "../context/DataContext";
import { formatearReferencia, normalizar, parseReferencia, rutaDeReferencia } from "../utils/referencia";
import { codificarVersiones } from "../utils/versiones";

/**
 * Paleta de comandos (Ctrl/Cmd + K).
 *
 * Llegar a un versículo costaba cuatro pantallas: elegir versiones, libro,
 * capítulo y versículo, cada una con su modal. Está bien para explorar y es
 * pésimo para quien ya sabe a dónde va — que es el caso normal de alguien que
 * sigue una predicación o un estudio.
 *
 * Aquí se escribe "jn 3 16" y se llega. La misma caja resuelve además las
 * rutas de la app y manda a la búsqueda cuando lo escrito no es una referencia,
 * así que no hay que aprender tres atajos distintos.
 */

/** Rutas navegables. La etiqueta se traduce en el momento de pintar. */
const DESTINOS = [
  { ruta: "/compare", clave: "Comparar" },
  { ruta: "/search", clave: "Buscar" },
  { ruta: "/notes", clave: "NotasTitulo" },
  { ruta: "/atlas", clave: "AtlasTitulo" },
  { ruta: "/history", clave: "Historial" },
  { ruta: "/3d", clave: "Biblia3D" },
  { ruta: "/account", clave: "Cuenta" },
  { ruta: "/settings", clave: "Ajustes" },
  { ruta: "/about", clave: "Informacion" },
  { ruta: "/", clave: "Inicio" },
];

const PaletaComandos = () => {
  const { t, cambiarIdioma } = useContext(LanguageContext);
  const { changeTheme } = useContext(ThemeContext);
  const { bibliasSeleccionadas } = useContext(DataContext);
  const navigate = useNavigate();

  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  const cerrar = useCallback(() => {
    setAbierta(false);
    setTexto("");
    setIndice(0);
  }, []);

  // Atajo global. Se registra en `document` y no en el input porque el punto
  // es poder abrirla sin tener el foco en ningún sitio concreto.
  useEffect(() => {
    const alPulsar = (evento) => {
      const esAtajo = (evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k";
      if (!esAtajo) return;
      // El navegador tiene su propio Ctrl+K (buscar en la barra de
      // direcciones); sin esto se abrirían los dos a la vez.
      evento.preventDefault();
      setAbierta((previo) => !previo);
    };

    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, []);

  useEffect(() => {
    if (abierta) inputRef.current?.focus();
  }, [abierta]);

  /**
   * Las opciones que se ofrecen ahora mismo.
   *
   * El orden no es alfabético sino por certeza: si lo escrito ES una
   * referencia válida, esa va primero y con Enter se va directo. Lo demás
   * (rutas, búsqueda) queda debajo como alternativa.
   */
  const opciones = useMemo(() => {
    const consulta = texto.trim();
    const lista = [];

    const referencia = parseReferencia(consulta);
    if (referencia) {
      const codigos = codificarVersiones(bibliasSeleccionadas);
      lista.push({
        id: "ref",
        tipo: t("PaletaIrA"),
        etiqueta: formatearReferencia(referencia, t),
        accion: () => navigate(`${rutaDeReferencia(referencia)}${codigos ? `?v=${codigos}` : ""}`),
      });
    }

    const clave = normalizar(consulta);
    for (const destino of DESTINOS) {
      const etiqueta = t(destino.clave);
      if (clave && !normalizar(etiqueta).includes(clave)) continue;
      lista.push({
        id: destino.ruta,
        tipo: t("PaletaIrA"),
        etiqueta,
        accion: () => navigate(destino.ruta),
      });
    }

    // Buscar es el último recurso: solo tiene sentido con algo escrito, y el
    // backend exige un mínimo de tres caracteres.
    if (consulta.length >= 3) {
      lista.push({
        id: "buscar",
        tipo: t("Buscar"),
        etiqueta: `“${consulta}”`,
        accion: () => navigate(`/search?q=${encodeURIComponent(consulta)}`),
      });
    }

    if (!clave) {
      lista.push(
        { id: "tema", tipo: t("Ajustes"), etiqueta: t("CambiarTemaOscuro"), accion: changeTheme },
        { id: "idioma", tipo: t("Ajustes"), etiqueta: t("CambiarIdioma"), accion: cambiarIdioma }
      );
    }

    return lista;
  }, [texto, bibliasSeleccionadas, navigate, t, changeTheme, cambiarIdioma]);

  // Al cambiar lo escrito, la selección vuelve arriba: dejarla donde estaba
  // apuntaba a una opción distinta de la que el usuario veía resaltada.
  useEffect(() => {
    setIndice(0);
  }, [texto]);

  // La opción activa se trae a la vista; con el teclado se puede bajar más allá
  // del alto de la lista.
  useEffect(() => {
    listaRef.current?.querySelector(`[data-indice="${indice}"]`)?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  const ejecutar = (opcion) => {
    if (!opcion) return;
    opcion.accion();
    cerrar();
  };

  const alTeclear = (evento) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      cerrar();
      return;
    }
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndice((previo) => (opciones.length === 0 ? 0 : (previo + 1) % opciones.length));
      return;
    }
    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndice((previo) => (opciones.length === 0 ? 0 : (previo - 1 + opciones.length) % opciones.length));
      return;
    }
    if (evento.key === "Enter") {
      evento.preventDefault();
      ejecutar(opciones[indice]);
    }
  };

  if (!abierta) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) cerrar();
      }}
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-label={t("PaletaTitulo")} className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#161519]">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={alTeclear}
            placeholder={t("PaletaPlaceholder")}
            aria-label={t("PaletaPlaceholder")}
            className="w-full bg-transparent py-4 text-base text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
          <kbd className="hidden shrink-0 rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 dark:border-neutral-700 dark:text-neutral-400 sm:block">ESC</kbd>
        </div>

        <ul ref={listaRef} role="listbox" className="max-h-80 overflow-y-auto py-1">
          {opciones.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("PaletaSinResultados")}</li>
          ) : (
            opciones.map((opcion, i) => (
              <li key={opcion.id} data-indice={i} role="option" aria-selected={i === indice}>
                <button
                  type="button"
                  // `onMouseDown` y no `onClick`: al soltar el botón el input ya
                  // perdió el foco y con él la opción resaltada.
                  onMouseDown={(evento) => {
                    evento.preventDefault();
                    ejecutar(opcion);
                  }}
                  onMouseEnter={() => setIndice(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === indice ? "bg-amber-100 dark:bg-purple-900/60" : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                  }`}
                >
                  <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-white/10 dark:text-neutral-400">{opcion.tipo}</span>
                  <span className="truncate text-sm text-neutral-900 dark:text-neutral-100">{opcion.etiqueta}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        <p className="border-t border-neutral-200 px-4 py-2 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">{t("PaletaAyuda")}</p>
      </div>
    </div>
  );
};

export default PaletaComandos;
