import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import LOGO from "/bibleIcon.svg";
import LanguageContext from "../context/LanguageContext";
import ThemeContext from "../context/ThemeContext";
import { useContext, useEffect, useRef, useState } from "react";
import INFO from "/info.png";
import SETTING from "/setting.png";
import COMPARE from "/compare.png";
import HOMEICO from "/hut.png";
import HISTORY from "/history.png";
import MOON from "/moon.png";
import SUN from "/sun.png";
import USA from "/USA.png";
import SPAIN from "/SPAIN.png";
import DataContext from "../context/DataContext";

// Los iconos que vienen de /public son PNG; los otros dos son SVG en línea.
// Se envuelven con la misma firma para poder recorrer las rutas como datos y no
// repetir el mismo <li> siete veces por cada breakpoint.
const IconoImagen = (src, alt, extraClase = "") => {
  const Icono = ({ className }) => <img src={src} alt={alt} className={`${className} ${extraClase} dark:invert`} />;
  Icono.propTypes = { className: PropTypes.string };
  return Icono;
};

const IconoBuscar = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

IconoBuscar.propTypes = { className: PropTypes.string };

const IconoCuenta = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className} aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
    />
  </svg>
);

IconoCuenta.propTypes = { className: PropTypes.string };

const IconoLibro3D = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* Un libro abierto visto en perspectiva: las dos hojas se juntan en el
        lomo y la de la derecha lleva una hoja levantada, que es lo que
        distingue este icono del de "Comparar". */}
    <path d="M12 6.5 4 4.2v13.1l8 2.3z" />
    <path d="m12 6.5 8-2.3v13.1l-8 2.3z" />
    <path d="M12 6.5v13.1" />
    <path d="M15.4 8.9c1.9 1 2.6 2.9 2 4.9" opacity="0.55" />
  </svg>
);

IconoLibro3D.propTypes = { className: PropTypes.string };

const IconoNotas = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* Una hoja con la esquina doblada: distingue "lo que yo escribí" del
        icono de libro, que ya se usa para el texto bíblico. */}
    <path d="M5 3h9l5 5v13H5z" />
    <path d="M14 3v5h5" />
    <path d="M8.5 12.5h7" />
    <path d="M8.5 16h4.5" />
  </svg>
);

IconoNotas.propTypes = { className: PropTypes.string };

const IconoAtlas = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
  </svg>
);

IconoAtlas.propTypes = { className: PropTypes.string };

/**
 * Flecha de salto de capítulo en los extremos de la miga de pan.
 *
 * Deshabilitada en vez de oculta cuando no hay capítulo al que ir: si
 * desapareciera, la referencia del centro se correría de sitio al llegar al
 * primer o último capítulo del libro.
 */
const BotonCapitulo = ({ onClick, disponible, etiqueta, hacia }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!disponible}
    title={etiqueta}
    aria-label={etiqueta}
    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-black transition-colors hover:bg-black/10 disabled:pointer-events-none disabled:opacity-25 dark:text-white dark:hover:bg-white/15 sm:h-9 sm:w-9"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d={hacia === "atras" ? "M15 19 8 12l7-7" : "m9 5 7 7-7 7"} />
    </svg>
  </button>
);

BotonCapitulo.propTypes = {
  onClick: PropTypes.func.isRequired,
  disponible: PropTypes.bool,
  etiqueta: PropTypes.string,
  hacia: PropTypes.oneOf(["atras", "adelante"]).isRequired,
};

// En móvil solo caben unas pocas pestañas sin desbordar, así que las rutas se
// parten en dos grupos: las principales viven en la barra inferior y el resto
// se agrupa dentro del menú "Más" de la cabecera. En escritorio se muestran
// todas seguidas.
const RUTAS_PRINCIPALES = [
  { to: "/", clave: "Inicio", Icono: IconoImagen(HOMEICO, "Inicio") },
  { to: "/compare", clave: "Comparar", Icono: IconoImagen(COMPARE, "Comparar", "!w-9") },
  { to: "/search", clave: "Buscar", Icono: IconoBuscar },
  { to: "/history", clave: "Historial", Icono: IconoImagen(HISTORY, "Historial"), requiereVersiculo: true },
];

const RUTAS_SECUNDARIAS = [
  { to: "/notes", clave: "NotasTitulo", Icono: IconoNotas },
  { to: "/atlas", clave: "AtlasTitulo", Icono: IconoAtlas },
  { to: "/3d", clave: "Biblia3D", Icono: IconoLibro3D },
  { to: "/account", clave: "Cuenta", Icono: IconoCuenta },
  { to: "/settings", clave: "Ajustes", Icono: IconoImagen(SETTING, "Ajustes") },
  { to: "/about", clave: "Informacion", Icono: IconoImagen(INFO, "Info") },
];

const Navbar = () => {
  const { t, cambiarIdioma, idiomaNavegador } = useContext(LanguageContext);
  const { theme, changeTheme } = useContext(ThemeContext);
  const { versiculoSeleccionadoNumero, libroSeleccionado, capituloSeleccionadoNumero, Chapters, setCapituloSeleccionadoNumero, setVersiculoSeleccionado, setVersiculoSeleccionadoNumero } =
    useContext(DataContext);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();

  const hayVersiculo = versiculoSeleccionadoNumero > 0;
  const visibles = (rutas) => rutas.filter((r) => !r.requiereVersiculo || hayVersiculo);
  const principales = visibles(RUTAS_PRINCIPALES);
  const todas = [...principales, ...RUTAS_SECUNDARIAS];

  // El menú se cierra al cambiar de ruta: si no, al tocar "Ajustes" el panel
  // seguiría abierto encima de la página nueva.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return;

    const alTocarFuera = (evento) => {
      if (menuRef.current && !menuRef.current.contains(evento.target)) setMenuAbierto(false);
    };
    const alPulsarEscape = (evento) => {
      if (evento.key === "Escape") setMenuAbierto(false);
    };

    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alPulsarEscape);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alPulsarEscape);
    };
  }, [menuAbierto]);

  /*
   * Salto de capítulo desde la miga de pan.
   *
   * `Chapters` es el mapa del libro actual: { "1": [1..51], "2": [...] }. Que
   * exista la clave ES la comprobación de que el capítulo existe, así que no
   * hace falta saber cuántos tiene cada libro.
   *
   * Solo se mueve dentro del libro: al llegar al final NO salta al siguiente
   * libro, porque eso cambiaría el testamento y el contexto de lectura sin que
   * el usuario lo pida. En los extremos el botón queda deshabilitado, no
   * escondido, para que la referencia no baile de sitio.
   */
  const capitulos = Chapters && Chapters !== "NotFound" ? Chapters : null;

  const claveCapitulo = (desplazamiento) => {
    const destino = Number(capituloSeleccionadoNumero) + desplazamiento;
    const clave = String(destino);
    return capitulos?.[clave] ? clave : null;
  };

  const irACapitulo = (clave) => {
    const versiculos = capitulos?.[clave];
    if (!versiculos) return;
    // El capítulo se guarda como cadena, igual que lo hace el modal de
    // capítulos: es la clave del mapa, y hay comparaciones por identidad
    // (historial) que se romperían con un número.
    setCapituloSeleccionadoNumero(clave);
    setVersiculoSeleccionado(versiculos);
    setVersiculoSeleccionadoNumero(1);
  };

  const capituloAnterior = claveCapitulo(-1);
  const capituloSiguiente = claveCapitulo(1);

  const TipoTestamento = (libro) => {
    const tipo = libro.split("book")[1];
    if (tipo < 40) {
      return t("shortAntiguoTestamento");
    } else {
      return t("shortNuevoTestamento");
    }
  };

  const esActiva = (to) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  /**
   * `true` cuando la pantalla actual es una de las que viven dentro del menú.
   *
   * Sin esto, al entrar en Ajustes o en el Atlas ninguna pestaña quedaba
   * marcada y no había forma de saber por dónde se anda: la barra decía que no
   * estás en ninguna parte.
   */
  const enSecundaria = RUTAS_SECUNDARIAS.some(({ to }) => esActiva(to));

  return (
    <>
      <nav className="bg-[#FDD07A] dark:bg-[#20123A] flex items-center justify-between gap-2 px-3 py-4 sm:px-4">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img src={LOGO} alt="" className="h-9 shrink-0 sm:h-12" />
          <div className="flex flex-col min-w-0 dark:text-white sm:flex-row sm:items-end sm:gap-2">
            <span className="text-lg font-extrabold leading-tight sm:text-2xl">{t("Biblian")}</span>
            <span className="hidden text-lg font-bold sm:inline">-</span>
            <span className="truncate text-[11px] leading-tight sm:text-lg sm:font-semibold">{t("tituloComparar")}</span>
          </div>
        </Link>

        {/* Escritorio: todas las rutas + controles de tema e idioma */}
        <div className="hidden shrink-0 items-center gap-5 pr-2 sm:flex">
          <ul className="flex flex-row space-x-7 text-[10px] font-medium">
            {todas.map(({ to, clave, Icono }) => (
              <li key={to}>
                <Link
                  to={to}
                  aria-current={esActiva(to) ? "page" : undefined}
                  className={`flex flex-col justify-center text-center text-gray-900 hover:scale-105 hover:underline dark:text-white ${esActiva(to) ? "font-bold underline" : ""}`}
                >
                  <Icono className="w-6 h-6 m-auto" />
                  {t(clave)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 border-l border-black/15 pl-4 dark:border-white/15">
            {/* Botón de Idioma Escritorio */}
            <button
              type="button"
              onClick={cambiarIdioma}
              title={t("CambiarIdioma")}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-bold text-gray-900 transition hover:bg-black/10 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              <img src={idiomaNavegador === "es" ? USA : SPAIN} alt="" className="h-4 w-4 rounded-full object-cover shadow-xs" />
              <span>{idiomaNavegador === "es" ? "EN" : "ES"}</span>
            </button>

            {/* Botón de Tema Escritorio */}
            <button
              type="button"
              onClick={changeTheme}
              title={theme === "light" ? t("CambiarTemaOscuro") : t("CambiarTemaClaro")}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-black/5 text-gray-900 transition hover:bg-black/10 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              <img src={theme === "light" ? MOON : SUN} alt="" className="h-4 w-4 dark:invert" />
            </button>
          </div>
        </div>

        {/* Móvil: solo idioma y tema. El menú bajó a la barra de pestañas. */}
        <div className="flex items-center gap-1 sm:hidden">
          {/* Botón de Idioma Móvil */}
          <button
            type="button"
            onClick={cambiarIdioma}
            title={t("CambiarIdioma")}
            aria-label={t("CambiarIdioma")}
            className="flex h-9 w-9 items-center justify-center rounded-full active:bg-black/10 dark:active:bg-white/10"
          >
            <img src={idiomaNavegador === "es" ? USA : SPAIN} alt="" className="h-5 w-5 rounded-full object-cover shadow-xs" />
          </button>

          {/* Botón de Tema Móvil */}
          <button
            type="button"
            onClick={changeTheme}
            title={theme === "light" ? t("CambiarTemaOscuro") : t("CambiarTemaClaro")}
            aria-label={theme === "light" ? t("CambiarTemaOscuro") : t("CambiarTemaClaro")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-900 active:bg-black/10 dark:text-white dark:active:bg-white/10"
          >
            <img src={theme === "light" ? MOON : SUN} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>
      </nav>

      {/*
        Móvil: las rutas principales más un "Menú" que abre el resto.

        El menú estaba arriba, en la cabecera, separado de las pestañas por el
        título de la app. Eso repartía la navegación en dos sitios y dejaba lo
        de arriba fuera del alcance del pulgar. Aquí es una pestaña más: todo lo
        que lleva a otra pantalla vive en la misma fila.

        `relative` porque el desplegable se ancla a esta barra.
      */}
      <nav ref={menuRef} className="relative bg-[#fbefda] dark:bg-[#693BCC] sm:hidden">
        <ul className="flex w-full flex-row items-stretch pt-1">
          {principales.map(({ to, clave, Icono }) => (
            <li key={to} className="min-w-0 flex-1">
              <Link
                to={to}
                aria-current={esActiva(to) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 text-gray-900 dark:text-white ${esActiva(to) ? "font-bold" : ""}`}
              >
                <Icono className="w-5 h-5" />
                <span className="w-full truncate text-center text-[11px] leading-tight">{t(clave)}</span>
              </Link>
            </li>
          ))}

          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
              className={`flex w-full flex-col items-center gap-0.5 px-1 py-1.5 text-gray-900 dark:text-white ${enSecundaria || menuAbierto ? "font-bold" : ""}`}
            >
              <span className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
                {/*
                  El punto avisa de que ahí dentro hay pantallas. Un icono de
                  hamburguesa suelto en una barra de pestañas no dice si abre
                  algo o es un ajuste; con la marca y la etiqueta, sí.

                  Desaparece cuando el menú está abierto (ya se ve lo que hay) y
                  cuando estás dentro de una de esas pantallas (ya llegaste).
                */}
                {/* {!menuAbierto && !enSecundaria && (
                  <span className="absolute -right-1.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-300" aria-hidden="true"></span>
                )} */}
              </span>
              <span className="flex w-full items-center justify-center gap-0.5 text-[11px] leading-tight">
                <span className="truncate">{t("Menu")}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-2.5 w-2.5 shrink-0 transition-transform ${menuAbierto ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
          </li>
        </ul>

        {/*
          Se despliega hacia ABAJO y a todo el ancho. La barra vive en lo alto
          de la página, no pegada al borde inferior, así que un panel hacia
          arriba se saldría de la pantalla.

          `z-30` para pasar por encima de la miga de pan de Comparar, que es
          `sticky z-10` y quedaría por delante del menú.
        */}
        {menuAbierto && (
          <ul role="menu" className="absolute inset-x-0 top-full z-30 border-t border-black/10 bg-[#fbefda] py-1 shadow-lg dark:border-white/10 dark:bg-[#20123A]">
            {RUTAS_SECUNDARIAS.map(({ to, clave, Icono }) => (
              <li key={to} role="none">
                <Link
                  role="menuitem"
                  to={to}
                  aria-current={esActiva(to) ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-3 text-sm text-gray-900 active:bg-black/10 dark:text-white dark:active:bg-white/10 ${esActiva(to) ? "font-bold" : ""}`}
                >
                  <Icono className="h-5 w-5 shrink-0" />
                  {t(clave)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Solo en Comparar: la miga describe el texto que se está leyendo y sus
          flechas cambian de capítulo, así que fuera de esa pantalla no tiene a
          qué referirse — en Ajustes o Buscar era una barra que ocupaba sitio y
          cuyos botones movían algo que no estaba a la vista.

          Al confirmar biblias nuevas, capítulo y versículo se ponen a `null`, que
          no es `!== 0`: la miga quedaba visible con "NT · Capítulo :" y sin
          libro. Se exige que los tres datos existan. */}
      {pathname.startsWith("/compare") && Boolean(versiculoSeleccionadoNumero && libroSeleccionado && capituloSeleccionadoNumero) && (
        <nav className="sticky top-0 z-10 flex w-full items-center gap-1 border-t border-black/10 bg-[#fbefda] px-2 py-2 dark:border-white/10 dark:bg-[#693BCC] sm:gap-2 sm:px-4 sm:py-3">
          <BotonCapitulo hacia="atras" disponible={Boolean(capituloAnterior)} etiqueta={t("CapituloAnterior")} onClick={() => irACapitulo(capituloAnterior)} />
          <ol className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-sm dark:text-white sm:gap-2 lg:text-xl">
            <li className="flex shrink-0 items-center text-black dark:text-white">
              {TipoTestamento(libroSeleccionado)}
              <svg className="ms-1.5 mr-0.5 h-3 w-3 shrink-0 sm:ms-4 sm:mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 10">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m7 9 4-4-4-4M1 9l4-4-4-4" />
              </svg>
            </li>
            {/* El nombre del libro es lo único que puede ser largo, así que es lo
                único que se recorta: la referencia numérica siempre se ve. */}
            <li className="flex min-w-0 items-center text-black dark:text-white">
              <span className="truncate">{t(libroSeleccionado)}</span>
              <svg className="ms-1.5 mr-0.5 h-3 w-3 shrink-0 sm:ms-4 sm:mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 10">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m7 9 4-4-4-4M1 9l4-4-4-4" />
              </svg>
            </li>
            <li className="flex shrink-0 items-center gap-1 text-black dark:text-white sm:gap-2">
              <span className="hidden sm:inline">{t("Capitulo")}</span>
              <span>
                {capituloSeleccionadoNumero}:{versiculoSeleccionadoNumero}
              </span>
            </li>
          </ol>
          <BotonCapitulo hacia="adelante" disponible={Boolean(capituloSiguiente)} etiqueta={t("CapituloSiguiente")} onClick={() => irACapitulo(capituloSiguiente)} />
        </nav>
      )}
    </>
  );
};

export default Navbar;
