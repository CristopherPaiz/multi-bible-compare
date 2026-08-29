import { useState, useEffect, useRef, useContext, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";
import A from "../assets/badges/A.webp";
import AN from "../assets/badges/AN.webp";
import N from "../assets/badges/N.webp";
import O from "../assets/badges/O.webp";
import ON from "../assets/badges/ON.webp";
import ReadMore from "./ReadMore";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";
import { useBloquearScroll } from "../hooks/useBloquearScroll";
import { favoritos as almacenFavoritos, useAlmacen } from "../services/almacenLocal";
import { MAX_VERSIONES_COMPARADAS as MAX_SELECTIONS } from "../utils/versiones";
import {
  BIBLIAS,
  RECOMENDADAS,
  CATEGORIAS_RECOMENDADAS,
  MAPA_RECOMENDACIONES,
  CARACTERISTICAS_POR_BIBLIA,
  MAPA_CARACTERISTICAS,
  ORDEN_IDIOMAS,
} from "../data/biblias";


const CLAVE_SECCIONES = "seccionesBibliasAbiertas";

const FILTROS = ["todas", "favoritas", "seleccionadas", "recomendadas"];

const TOTAL_BIBLIAS = Object.values(BIBLIAS).reduce((total, grupo) => total + Object.keys(grupo).length, 0);

const normalizar = (texto) =>
  String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const leerLista = (clave) => {
  try {
    const crudo = localStorage.getItem(clave);
    if (!crudo) return [];
    const valor = JSON.parse(crudo);
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
};

const Chevron = ({ abierta }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={`h-4 w-4 shrink-0 transition-transform ${abierta ? "rotate-90" : ""}`}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

Chevron.propTypes = { abierta: PropTypes.bool };

/**
 * Título con marquesina suave que se activa al interactuar con cualquier parte de la tarjeta (group).
 * Si el texto no desborda, no se desplaza.
 */
const TituloMarquesina = ({ titulo }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [desborda, setDesborda] = useState(false);
  const [diff, setDiff] = useState(0);

  const medir = useCallback(() => {
    if (containerRef.current && textRef.current) {
      const d = textRef.current.scrollWidth - containerRef.current.clientWidth;
      if (d > 2) {
        setDesborda(true);
        setDiff(d);
      } else {
        setDesborda(false);
        setDiff(0);
      }
    }
  }, []);

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [titulo, medir]);

  const duracion = Math.max(1.8, Math.min(8, diff / 30));

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 overflow-hidden whitespace-nowrap relative select-none"
      title={titulo}
    >
      <span
        ref={textRef}
        className="inline-block font-medium text-sm leading-snug will-change-transform transition-transform ease-out duration-300 group-hover:[transform:translateX(calc(-1*var(--diff)))] group-hover:[transition:transform_var(--dur)_linear] group-active:[transform:translateX(calc(-1*var(--diff)))] group-active:[transition:transform_var(--dur)_linear]"
        style={{
          "--diff": desborda ? `${diff + 6}px` : "0px",
          "--dur": `${duracion}s`,
        }}
      >
        {titulo}
      </span>
    </div>
  );
};

TituloMarquesina.propTypes = {
  titulo: PropTypes.string.isRequired,
};

const ListBooks = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef(null);
  const [selectedBooks, setSelectedBooks] = useState([]);
  /*
   * Los favoritos NO se copian a estado local. Los lee el almacén compartido,
   * que es el mismo que toca la sincronización al fusionar con el servidor. Con
   * una copia aquí, esa fusión quedaba invisible hasta recargar y el siguiente
   * clic la borraba (y la borraba también en el servidor, porque el PUT
   * reemplaza la lista entera).
   */
  const favoriteBooks = useAlmacen(almacenFavoritos);
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const { bibliasSeleccionadas, setBibliasSeleccionadas, setModalLibros, setCapituloSeleccionadoNumero, setVersiculoSeleccionadoNumero } =
    useContext(DataContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [subFiltroRecomendada, setSubFiltroRecomendada] = useState("todas");
  const [infoAbierta, setInfoAbierta] = useState(false);
  const [aviso, setAviso] = useState("");
  // Con 150 versiones repartidas en 9 idiomas, abrirlas todas obliga a un scroll
  // enorme. Solo se despliega el idioma de la interfaz y el resto se pliega.
  const [seccionesAbiertas, setSeccionesAbiertas] = useState([]);

  // Bloquea la navegación hacia atrás y el scroll del fondo mientras está abierto.
  useHistoryBlocker(isModalOpen, () => setIsModalOpen(false));
  useBloquearScroll(isModalOpen);

  useEffect(() => {
    const guardadas = leerLista("selectedBooks");
    if (guardadas.length > 0 && (!bibliasSeleccionadas || bibliasSeleccionadas.length === 0)) {
      setBibliasSeleccionadas(guardadas);
    }
    const guardadasSecciones = leerLista(CLAVE_SECCIONES);
    setSeccionesAbiertas(guardadasSecciones.length > 0 ? guardadasSecciones : [idiomaNavegador === "en" ? "english" : "spanish"]);
    // Solo al montar: después el idioma lo cambia el usuario y no debe reabrir
    // las secciones que haya plegado a mano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * ---------------------------------------------------------------------------
   * `selectedBooks` es el BORRADOR del modal, no la selección de verdad
   * ---------------------------------------------------------------------------
   * Antes se leía de `localStorage` al montar y se volvía a escribir en cada
   * marca. Eso lo convertía en un segundo dueño de la clave `selectedBooks`, que
   * ya persiste `DataContext` desde `bibliasSeleccionadas` — y los dos se
   * pisaban: al llegar desde Buscar con una versión añadida, este componente
   * montaba, escribía su copia vieja encima y la versión desaparecía al
   * recargar. El mismo problema que tenían los favoritos.
   *
   * Ahora el borrador se rellena al ABRIR el modal, desde la selección real, y
   * no se persiste: cancelar descarta, confirmar aplica. Que es lo que un
   * borrador debería haber hecho siempre.
   */
  useEffect(() => {
    if (isModalOpen) setSelectedBooks(bibliasSeleccionadas ?? []);
    // Solo al abrir: mientras está abierto manda lo que el usuario marca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  useEffect(() => {
    localStorage.setItem(CLAVE_SECCIONES, JSON.stringify(seccionesAbiertas));
  }, [seccionesAbiertas]);

  /*
   * El empuje al servidor ya NO vive aquí: lo hace `useSync`, suscrito al mismo
   * almacén. Desde este componente era imposible saber si la fusión con el
   * servidor ya había terminado, y el `PUT` de favoritos reemplaza la lista
   * entera: al iniciar sesión salía con lo local y borraba lo del otro
   * dispositivo antes de que la fusión llegara.
   */

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(""), 3500);
    return () => clearTimeout(id);
  }, [aviso]);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  useEffect(() => {
    if (!isModalOpen) return;

    const alTocarFuera = (evento) => {
      if (modalRef.current && !modalRef.current.contains(evento.target)) closeModal();
    };
    const alPulsarEscape = (evento) => {
      if (evento.key === "Escape") closeModal();
    };

    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alPulsarEscape);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alPulsarEscape);
    };
  }, [isModalOpen, closeModal]);

  const openModal = () => setIsModalOpen(true);

  // El tope solo cuenta lo seleccionado. Antes sumaba también los favoritos, así
  // que con 20 versiones marcadas con estrella ya no se podía seleccionar nada.
  const anadirSeleccion = (rutas) => {
    setSelectedBooks((previas) => {
      const unicas = [...new Set([...previas, ...rutas])];
      if (unicas.length > MAX_SELECTIONS) {
        setAviso(t("MaxSelectionReached", { max: MAX_SELECTIONS }));
        return unicas.slice(0, MAX_SELECTIONS);
      }
      return unicas;
    });
  };

  const handleBookToggle = (ruta) => {
    if (selectedBooks.includes(ruta)) {
      setSelectedBooks((previas) => previas.filter((libro) => libro !== ruta));
      return;
    }
    anadirSeleccion([ruta]);
  };

  const handleFavoriteToggle = (ruta) => {
    almacenFavoritos.actualizar((previas) =>
      previas.includes(ruta) ? previas.filter((libro) => libro !== ruta) : [...previas, ruta]
    );
  };

  const handleConfirm = () => {
    if (selectedBooks.length === 0) return setAviso(t("SeleccioneUnaBiblia"));
    setBibliasSeleccionadas(selectedBooks);
    setCapituloSeleccionadoNumero(null);
    setVersiculoSeleccionadoNumero(null);
    setTimeout(() => {
      setModalLibros(true);
      closeModal();
    }, 150);
  };

  const imagenesBadge = useMemo(
    () => ({
      AN: idiomaNavegador === "es" ? AN : ON,
      N,
      A: idiomaNavegador === "es" ? A : O,
    }),
    [idiomaNavegador]
  );

  const insignia = useCallback(
    (libro) => {
      const icono = libro.new && libro.old ? imagenesBadge.AN : libro.new ? imagenesBadge.N : libro.old ? imagenesBadge.A : null;
      if (!icono) return null;

      return (
        <span className="flex w-11 shrink-0 flex-col items-center gap-0.5 select-none">
          <img src={icono} className="size-7 object-contain" alt="" loading="eager" decoding="sync" />
          <span className="text-xs font-bold leading-none opacity-70">{libro.year}</span>
        </span>
      );
    },
    [imagenesBadge]
  );

  const traducirIdioma = useCallback(
    (idioma) =>
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

  const idiomas = useMemo(
    () => Object.keys(BIBLIAS).sort((a, b) => ORDEN_IDIOMAS.indexOf(a) - ORDEN_IDIOMAS.indexOf(b)),
    []
  );

  const pasaFiltro = useCallback(
    (ruta) => {
      if (filtro === "favoritas") return favoriteBooks.includes(ruta);
      if (filtro === "seleccionadas") return selectedBooks.includes(ruta);
      if (filtro === "recomendadas") {
        if (subFiltroRecomendada === "todas") return RECOMENDADAS.includes(ruta);
        const cat = CATEGORIAS_RECOMENDADAS.find((c) => c.id === subFiltroRecomendada);
        return cat ? cat.versiones.some((v) => v.ruta === ruta) : false;
      }
      return true;
    },
    [filtro, subFiltroRecomendada, favoriteBooks, selectedBooks]
  );

  const secciones = useMemo(() => {
    const busqueda = normalizar(searchTerm.trim());

    return idiomas
      .map((idioma) => {
        const nombreIdioma = normalizar(traducirIdioma(idioma));
        const libros = Object.entries(BIBLIAS[idioma]).filter(([titulo, libro]) => {
          if (!pasaFiltro(libro.ruta)) return false;
          if (!busqueda) return true;
          return normalizar(titulo).includes(busqueda) || nombreIdioma.includes(busqueda) || String(libro.year).includes(busqueda);
        });
        return { idioma, nombre: traducirIdioma(idioma), libros };
      })
      .filter((seccion) => seccion.libros.length > 0);
  }, [idiomas, searchTerm, pasaFiltro, traducirIdioma]);

  const totalVisible = secciones.reduce((total, seccion) => total + seccion.libros.length, 0);
  // Buscando o filtrando, plegar secciones esconde justo lo que se busca.
  const forzarAbiertas = searchTerm.trim().length > 0 || filtro !== "todas";
  const estaAbierta = (idioma) => forzarAbiertas || seccionesAbiertas.includes(idioma);

  const alternarSeccion = (idioma) => {
    setSeccionesAbiertas((previas) => (previas.includes(idioma) ? previas.filter((x) => x !== idioma) : [...previas, idioma]));
  };

  const contadorFiltro = (nombre) => {
    if (nombre === "favoritas") return favoriteBooks.length;
    if (nombre === "seleccionadas") return selectedBooks.length;
    if (nombre === "recomendadas") return RECOMENDADAS.length;
    return TOTAL_BIBLIAS;
  };

  const claseChip = (activo) =>
    `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
      activo
        ? "bg-[#693BCC] text-white dark:bg-[#FDD07A] dark:text-neutral-900"
        : "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-200"
    }`;

  const claseAccion =
    "shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-neutral-700 dark:text-gray-200";

  return (
    <>
      <div className="flex w-full justify-center mt-9">
        <ReadMore openModal={openModal} />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999999] flex items-end justify-center bg-gray-900/60 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-seleccionar-biblias"
            className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-neutral-950 dark:text-white sm:h-[88vh] sm:max-w-xl sm:rounded-2xl"
          >
            {/* CABECERA */}
            <div className="shrink-0 border-b border-gray-200 px-4 pb-3 pt-3 dark:border-neutral-800">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-neutral-700 sm:hidden" />

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* Título corto: `SeleccionarLibro` es una frase entera
                      ("Seleccione una o más biblias para continuar") que en un
                      encabezado ocupaba dos renglones en móvil. */}
                  <h2 id="titulo-seleccionar-biblias" className="text-lg font-bold leading-tight sm:text-xl">
                    {t("SeleccionarBiblias")}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    {t("BibliasSeleccionadasContador", { n: selectedBooks.length, max: MAX_SELECTIONS })}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setInfoAbierta((abierta) => !abierta)}
                    aria-expanded={infoAbierta}
                    aria-label={t("Ayuda")}
                    className={`grid h-10 w-10 place-items-center rounded-full ${
                      infoAbierta ? "bg-gray-200 dark:bg-neutral-800" : ""
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label={t("Cerrar")}
                    className="grid h-10 w-10 place-items-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* BUSQUEDA */}
              <div className="relative mt-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
                  aria-hidden="true"
                >
                  <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                  <path d="M21 21l-6 -6" />
                </svg>
                <input
                  type="search"
                  inputMode="search"
                  placeholder={t("BuscarLibros")}
                  aria-label={t("BuscarLibros")}
                  className="h-11 w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-10 text-sm outline-none focus:border-[#693BCC] focus:ring-2 focus:ring-[#693BCC]/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  value={searchTerm}
                  onChange={(evento) => setSearchTerm(evento.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label={t("LimpiarBusqueda")}
                    className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* FILTROS Y ACCIONES RÁPIDAS
                  Van en una sola fila con scroll horizontal: en dos filas la
                  cabecera se comía más de un tercio del alto del panel y dejaba
                  ver muy pocas versiones. El separador marca dónde dejan de ser
                  filtros y empiezan las acciones. */}
              <div className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
                {FILTROS.map((nombre) => (
                  <button key={nombre} type="button" onClick={() => setFiltro(nombre)} className={claseChip(filtro === nombre)}>
                    {t(`Filtro_${nombre}`)}
                    <span className="ml-1 opacity-70">{contadorFiltro(nombre)}</span>
                  </button>
                ))}

                <span aria-hidden="true" className="h-6 w-px shrink-0 bg-gray-300 dark:bg-neutral-700" />

                <button type="button" className={claseAccion} onClick={() => setSelectedBooks([])}>
                  {t("DesmarcarTodo")}
                </button>
                <button
                  type="button"
                  className={claseAccion}
                  onClick={() => setSeccionesAbiertas(seccionesAbiertas.length ? [] : idiomas)}
                >
                  {seccionesAbiertas.length ? t("ContraerTodo") : t("ExpandirTodo")}
                </button>
              </div>

              {/* SUB-FILTROS DE RECOMENDADAS Y SELECCIÓN RÁPIDA POR TIPO */}
              {filtro === "recomendadas" && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-neutral-800/80">
                  <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSubFiltroRecomendada("todas")}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        subFiltroRecomendada === "todas"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
                      }`}
                    >
                      🌟 {t("TodasLasRecomendadas")} ({RECOMENDADAS.length})
                    </button>

                    {CATEGORIAS_RECOMENDADAS.map((cat) => {
                      const activo = subFiltroRecomendada === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSubFiltroRecomendada(cat.id)}
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1 ${
                            activo
                              ? "bg-blue-600 text-white font-semibold shadow-xs"
                              : "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
                          }`}
                        >
                          <span>{cat.icono}</span>
                          <span>{t(cat.tituloKey).split("(")[0].trim()}</span>
                          <span className="opacity-70 text-[11px]">({cat.versiones.length})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Accion rapida para el grupo de recomendadas activo */}
                  {(() => {
                    const catActiva = CATEGORIAS_RECOMENDADAS.find((c) => c.id === subFiltroRecomendada);
                    const listaRutas = catActiva ? catActiva.versiones.map((v) => v.ruta) : RECOMENDADAS;
                    const todasSeleccionadas = listaRutas.every((r) => selectedBooks.includes(r));

                    const toggleGrupo = () => {
                      if (todasSeleccionadas) {
                        setSelectedBooks((prev) => prev.filter((r) => !listaRutas.includes(r)));
                      } else {
                        anadirSeleccion(listaRutas);
                      }
                    };

                    return (
                      <div className="mt-2 flex items-center justify-between gap-2 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl px-3 py-1.5">
                        <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-snug line-clamp-1">
                          {catActiva ? t(catActiva.descripcionKey) : t("Desc_todas")}
                        </p>
                        <button
                          type="button"
                          onClick={toggleGrupo}
                          className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                            todasSeleccionadas
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                          }`}
                        >
                          {todasSeleccionadas ? t("QuitarGrupo") : `+ ${t("SeleccionarGrupo")} (${listaRutas.length})`}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {aviso && (
                <p role="status" className="mt-2 rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
                  {aviso}
                </p>
              )}
            </div>

            {/* AYUDA Y PRESETS DE ESTUDIO */}
            {infoAbierta && (
              <div className="max-h-[50%] shrink-0 overflow-y-auto border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t("ANSignificado")}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">{t("AntiguoTestamentoInicial")}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{t("AntiguoTestamento")}</span>
                    <span className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">{t("NuevoTestamentoInicial")}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{t("NuevoTestamento")}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{t("ANExplicacion")}</p>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <span>✨</span>
                        <span>{t("PresetsEstudio")}</span>
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("GuiasEstudio")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-3">
                    {CATEGORIAS_RECOMENDADAS.map((cat) => {
                      const todasSeleccionadas = cat.versiones.every((v) => selectedBooks.includes(v.ruta));

                      return (
                        <div
                          key={cat.id}
                          className="p-3 rounded-xl border border-gray-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 shadow-xs space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                <span>{cat.icono}</span>
                                <span>{t(cat.tituloKey)}</span>
                              </h4>
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                                {t(cat.descripcionKey)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => anadirSeleccion(cat.versiones.map((v) => v.ruta))}
                              className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition self-start sm:self-center ${
                                todasSeleccionadas
                                  ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border border-green-300 dark:border-green-800"
                                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                              }`}
                            >
                              {todasSeleccionadas ? `✓ ${t("PresetActivo")}` : t("AplicarPreset")}
                            </button>
                          </div>

                          {/* Chips de versiones interactivas */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {cat.versiones.map((ver) => {
                              const activa = selectedBooks.includes(ver.ruta);
                              return (
                                <button
                                  key={ver.ruta}
                                  type="button"
                                  onClick={() => handleBookToggle(ver.ruta)}
                                  title={`${ver.titulo} — ${t(ver.tagKey)}`}
                                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition text-left flex items-center gap-1.5 ${
                                    activa
                                      ? "border-green-500 bg-green-50 text-green-900 dark:border-green-600 dark:bg-green-950/70 dark:text-green-200 font-semibold"
                                      : "border-gray-200 bg-gray-50 text-gray-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 hover:border-gray-400 dark:hover:border-neutral-500"
                                  }`}
                                >
                                  <span>{activa ? "✓" : "+"}</span>
                                  <span>{ver.titulo}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* LISTA */}
            {/*
              Sin `py`: el relleno superior dejaba una franja de 8 px POR ENCIMA
              del título pegajoso —que se ancla al borde del área de scroll— y
              por ahí se veía pasar el texto de la lista. El aire de arriba lo
              pone ahora el propio título con su `py`.
            */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2 no-scrollbar">
              {totalVisible === 0 && <p className="py-10 text-center text-sm text-gray-600 dark:text-gray-400">{t("NoResultados")}</p>}

              {secciones.map(({ idioma, nombre, libros }) => {
                const abierta = estaAbierta(idioma);
                return (
                  <section key={idioma} className="mb-3">
                    {/*
                      El `sticky` va AQUÍ y no en el botón.

                      Un elemento pegajoso solo se desplaza dentro de la caja de
                      su padre. Puesto en el botón, el padre era este mismo `h3`
                      —del tamaño exacto del botón—, así que no tenía recorrido
                      donde quedarse y se iba con la sección al desplazar.

                      Colgado del `h3`, el padre pasa a ser la `section` entera:
                      el título se queda arriba mientras quede una sola biblia
                      de su idioma, y cuando la sección se acaba el navegador lo
                      empuja fuera y el idioma siguiente ocupa su sitio. Ese
                      relevo es nativo; no hace falta calcular nada.
                    */}
                    {/*
                      Fondo OPACO, no `bg-white/95` con desenfoque. Un 5% de
                      transparencia basta para leer el texto que pasa por
                      detrás, y el desenfoque no lo tapa: lo difumina. Aquí el
                      título tiene que ocultar lo de debajo, no velarlo.

                      El `-mx-4 px-4` compensa el `px-4` del contenedor para que
                      la banda llegue de lado a lado; sin eso quedaban dos
                      columnas de 16 px por donde asomaba la lista.
                    */}
                    <h3 className="sticky top-0 z-10 -mx-4 bg-white px-4 dark:bg-neutral-950">
                      <button
                        type="button"
                        onClick={() => alternarSeccion(idioma)}
                        aria-expanded={abierta}
                        className="flex min-h-11 w-full items-center gap-2 rounded-lg px-1 py-2 text-left"
                      >
                        <Chevron abierta={abierta} />
                        <span className="flex-1 text-sm font-bold uppercase tracking-wide">{nombre}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-neutral-800 dark:text-gray-300">
                          {libros.length}
                        </span>
                      </button>
                    </h3>

                    {abierta && (
                      <ul className="mt-1 flex flex-col gap-1.5">
                        {libros.map(([titulo, libro]) => {
                          const seleccionada = selectedBooks.includes(libro.ruta);
                          const favorita = favoriteBooks.includes(libro.ruta);
                          const recInfo = MAPA_RECOMENDACIONES[libro.ruta];
                          const feats = CARACTERISTICAS_POR_BIBLIA[libro.ruta] || [];

                          return (
                            <li key={titulo}>
                              <div
                                className={`flex items-stretch overflow-hidden rounded-xl border ${
                                  seleccionada
                                    ? "border-green-500 bg-green-100 dark:border-green-700 dark:bg-green-900/40"
                                    : "border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleBookToggle(libro.ruta)}
                                  aria-pressed={seleccionada}
                                  className="group flex min-h-[52px] flex-1 min-w-0 items-center gap-2 px-2.5 py-2 text-left overflow-hidden"
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                                      seleccionada ? "border-green-600 bg-green-600 text-white" : "border-gray-400"
                                    }`}
                                  >
                                    {seleccionada && (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                        <path
                                          fillRule="evenodd"
                                          d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </span>
                                  {insignia(libro)}
                                  <div className="flex-1 min-w-0 overflow-hidden pr-1">
                                    {/* Primera línea: siempre el título con marquesina si desborda */}
                                    <TituloMarquesina titulo={titulo} />

                                    {/* Segunda línea: tags y características multilínea */}
                                    {(recInfo || feats.length > 0) && (
                                      <div className="flex flex-wrap items-center gap-1 mt-1">
                                        {recInfo && (
                                          <span
                                            title={t(recInfo.categoriaKey)}
                                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/90 dark:text-blue-300 px-2 py-0.5 text-[10px] font-medium"
                                          >
                                            <span>{recInfo.icono}</span>
                                            <span>{t(recInfo.tagKey)}</span>
                                          </span>
                                        )}

                                        {feats.map((featKey) => {
                                          const info = MAPA_CARACTERISTICAS[featKey];
                                          if (!info) return null;
                                          return (
                                            <span
                                              key={featKey}
                                              title={t(`Feat_${featKey}_desc`)}
                                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded border text-[9px] font-medium whitespace-nowrap ${info.clase}`}
                                            >
                                              <span>{info.icono}</span>
                                              <span>{t(`Feat_${featKey}`)}</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleFavoriteToggle(libro.ruta)}
                                  aria-pressed={favorita}
                                  aria-label={`${t("Favorita")}: ${titulo}`}
                                  className="grid w-12 shrink-0 place-items-center border-l border-black/5 dark:border-white/10"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-6 w-6 ${favorita ? "text-yellow-500" : "text-gray-400"}`}
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>

            {/* PIE */}
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 text-sm font-medium text-gray-700 dark:border-neutral-700 dark:text-gray-200"
                  onClick={closeModal}
                >
                  {t("Cancelar")}
                </button>
                <button
                  type="button"
                  className="flex min-h-11 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={handleConfirm}
                  disabled={selectedBooks.length === 0}
                >
                  {t("Continuar")}
                  {selectedBooks.length > 0 && <span className="opacity-90">({selectedBooks.length})</span>}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ListBooks;
