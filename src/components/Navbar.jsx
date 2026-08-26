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
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
    />
  </svg>
);

IconoBuscar.propTypes = { className: PropTypes.string };

const IconoCuenta = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
    />
  </svg>
);

IconoCuenta.propTypes = { className: PropTypes.string };

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
  { to: "/account", clave: "Cuenta", Icono: IconoCuenta },
  { to: "/settings", clave: "Ajustes", Icono: IconoImagen(SETTING, "Ajustes") },
  { to: "/about", clave: "Informacion", Icono: IconoImagen(INFO, "Info") },
];

const Navbar = () => {
  const { t, cambiarIdioma, idiomaNavegador } = useContext(LanguageContext);
  const { theme, changeTheme } = useContext(ThemeContext);
  const { versiculoSeleccionadoNumero, libroSeleccionado, capituloSeleccionadoNumero } = useContext(DataContext);
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

  const TipoTestamento = (libro) => {
    const tipo = libro.split("book")[1];
    if (tipo < 40) {
      return t("shortAntiguoTestamento");
    } else {
      return t("shortNuevoTestamento");
    }
  };

  const esActiva = (to) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <>
      <nav className="bg-[#FDD07A] dark:bg-[#20123A] flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img src={LOGO} alt="" className="h-9 shrink-0 sm:h-12" />
          <div className="flex flex-col min-w-0 dark:text-white sm:flex-row sm:items-end sm:gap-2">
            <span className="text-lg font-extrabold leading-tight sm:text-2xl">{t("Biblian")}</span>
            <span className="hidden text-lg font-bold sm:inline">-</span>
            <span className="truncate text-[11px] leading-tight sm:text-lg sm:font-semibold">
              {t("tituloComparar")}
            </span>
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
                  className={`flex flex-col justify-center text-center text-gray-900 hover:scale-105 hover:underline dark:text-white ${
                    esActiva(to) ? "font-bold underline" : ""
                  }`}
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
              <img
                src={idiomaNavegador === "es" ? USA : SPAIN}
                alt=""
                className="h-4 w-4 rounded-full object-cover shadow-xs"
              />
              <span>{idiomaNavegador === "es" ? "EN" : "ES"}</span>
            </button>

            {/* Botón de Tema Escritorio */}
            <button
              type="button"
              onClick={changeTheme}
              title={theme === "light" ? t("CambiarTemaOscuro") : t("CambiarTemaClaro")}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-black/5 text-gray-900 transition hover:bg-black/10 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              <img
                src={theme === "light" ? MOON : SUN}
                alt=""
                className="h-4 w-4 dark:invert"
              />
            </button>
          </div>
        </div>

        {/* Móvil: controles rápidos de idioma, tema y menú de hamburguesa */}
        <div className="flex items-center gap-1 sm:hidden">
          {/* Botón de Idioma Móvil */}
          <button
            type="button"
            onClick={cambiarIdioma}
            title={t("CambiarIdioma")}
            aria-label={t("CambiarIdioma")}
            className="flex h-9 w-9 items-center justify-center rounded-full active:bg-black/10 dark:active:bg-white/10"
          >
            <img
              src={idiomaNavegador === "es" ? USA : SPAIN}
              alt=""
              className="h-5 w-5 rounded-full object-cover shadow-xs"
            />
          </button>

          {/* Botón de Tema Móvil */}
          <button
            type="button"
            onClick={changeTheme}
            title={theme === "light" ? t("CambiarTemaOscuro") : t("CambiarTemaClaro")}
            aria-label={theme === "light" ? t("CambiarTemaOscuro") : t("CambiarTemaClaro")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-900 active:bg-black/10 dark:text-white dark:active:bg-white/10"
          >
            <img
              src={theme === "light" ? MOON : SUN}
              alt=""
              className="h-5 w-5 dark:invert"
            />
          </button>

          {/* Menú Más / Hamburguesa */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
              aria-label={t("Menu")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-900 active:bg-black/10 dark:text-white dark:active:bg-white/10"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>

            {menuAbierto && (
              <ul
                role="menu"
                className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-black/10 bg-[#fbefda] py-1 shadow-lg dark:border-white/10 dark:bg-[#20123A]"
              >
                {RUTAS_SECUNDARIAS.map(({ to, clave, Icono }) => (
                  <li key={to} role="none">
                    <Link
                      role="menuitem"
                      to={to}
                      aria-current={esActiva(to) ? "page" : undefined}
                      className={`flex items-center gap-3 px-4 py-3 text-sm text-gray-900 active:bg-black/10 dark:text-white dark:active:bg-white/10 ${
                        esActiva(to) ? "font-bold" : ""
                      }`}
                    >
                      <Icono className="h-5 w-5 shrink-0" />
                      {t(clave)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </nav>

      {/* Móvil: solo las rutas principales, repartidas a partes iguales para que
          nunca se desborden aunque aparezca "Historial". */}
      <nav className="bg-[#fbefda] dark:bg-[#693BCC] sm:hidden">
        <ul className="flex w-full flex-row items-stretch">
          {principales.map(({ to, clave, Icono }) => (
            <li key={to} className="min-w-0 flex-1">
              <Link
                to={to}
                aria-current={esActiva(to) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 text-gray-900 dark:text-white ${
                  esActiva(to) ? "font-bold" : ""
                }`}
              >
                <Icono className="w-5 h-5" />
                <span className="w-full truncate text-center text-[11px] leading-tight">{t(clave)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Al confirmar biblias nuevas, capítulo y versículo se ponen a `null`, que
          no es `!== 0`: la miga de pan quedaba visible con "NT · Capítulo :" y sin
          libro. Se exige que los tres datos existan. */}
      {Boolean(versiculoSeleccionadoNumero && libroSeleccionado && capituloSeleccionadoNumero) && (
        <nav className="sticky top-0 z-10">
          <ol className="flex w-full items-center justify-center gap-1.5 bg-[#fbefda] px-3 py-2 text-sm dark:bg-[#693BCC] dark:text-white sm:gap-2 sm:px-6 sm:py-3 lg:text-xl">
            <li className="flex shrink-0 items-center text-black dark:text-white">
              {TipoTestamento(libroSeleccionado)}
              <svg
                className="ms-1.5 mr-0.5 h-3 w-3 shrink-0 sm:ms-4 sm:mr-2"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 12 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m7 9 4-4-4-4M1 9l4-4-4-4"
                />
              </svg>
            </li>
            {/* El nombre del libro es lo único que puede ser largo, así que es lo
                único que se recorta: la referencia numérica siempre se ve. */}
            <li className="flex min-w-0 items-center text-black dark:text-white">
              <span className="truncate">{t(libroSeleccionado)}</span>
              <svg
                className="ms-1.5 mr-0.5 h-3 w-3 shrink-0 sm:ms-4 sm:mr-2"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 12 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m7 9 4-4-4-4M1 9l4-4-4-4"
                />
              </svg>
            </li>
            <li className="flex shrink-0 items-center gap-1 text-black dark:text-white sm:gap-2">
              <span className="hidden sm:inline">{t("Capitulo")}</span>
              <span>
                {capituloSeleccionadoNumero}:{versiculoSeleccionadoNumero}
              </span>
            </li>
          </ol>
        </nav>
      )}
    </>
  );
};

export default Navbar;
