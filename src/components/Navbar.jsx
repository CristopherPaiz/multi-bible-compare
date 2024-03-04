import { Link } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import { useContext, useEffect, useState } from "react";
import INFO from "/info.png";
import SETTING from "/setting.png";
import COMPARE from "/compare.png";
import HOMEICO from "/hut.png";
import HISTORY from "/history.png";
import DataContext from "../context/DataContext";

const Navbar = () => {
  const [isFixed, setIsFixed] = useState(false);
  const { t } = useContext(LanguageContext);
  const { versiculoSeleccionadoNumero, libroSeleccionado, capituloSeleccionadoNumero } = useContext(DataContext);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolledToTop = window.scrollY === 0;
      setIsFixed(!isScrolledToTop);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const TipoTestamento = (libro) => {
    const tipo = libro.split("book")[1];
    if (tipo < 40) {
      return t("shortAntiguoTestamento");
    } else {
      return t("shortNuevoTestamento");
    }
  };

  return (
    <>
      <nav className="bg-[#FDD07A] dark:bg-[#20123A] flex justify-between">
        <Link to="/" className="flex sm:hidden py-4 px-6 gap-2" style={{ alignItems: "center" }}>
          <img src="https://cdn-icons-png.flaticon.com/512/5923/5923090.png" className="h-14 dark:invert" />
          <div className="flex flex-col px-2 dark:text-white sm:flex sm:flex-wrap">
            <span className="text-xl font-extrabold">{t("Biblian")}</span>
            <span className="text-lg">{t("tituloComparar")}</span>
          </div>
        </Link>

        <Link to="/" className="hidden sm:flex px-4 py-2 gap-2" style={{ alignItems: "center" }}>
          <img src="https://cdn-icons-png.flaticon.com/512/5923/5923090.png" className="h-12 dark:invert" />
          <div className="flex dark:text-white gap-2 sm:flex sm:flex-wrap">
            <span className="text-2xl font-extrabold">{t("Biblian")}</span>
            <span className="self-end text-lg font-bold">-</span>
            <span className="self-end text-lg font-semibold">{t("tituloComparar")}</span>
          </div>
        </Link>
        <div className="p-3 mr-10 mt-1 hidden sm:flex">
          <div className="flex">
            <ul className="flex flex-row font-medium mt-0 space-x-8 text-[10px]">
              <li>
                <Link
                  to="/"
                  className="flex text-center justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                >
                  <img src={HOMEICO} className="w-6 h-6 dark:invert m-auto" alt="Inicio" />
                  {t("Inicio")}
                </Link>
              </li>
              <li>
                <Link
                  to="/compare"
                  className="flex text-center justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                >
                  <img src={COMPARE} className="w-9 h-6 dark:invert m-auto" alt="Comparar" />
                  {t("Comparar")}
                </Link>
              </li>
              {versiculoSeleccionadoNumero > 0 && (
                <li>
                  <Link
                    to="/history"
                    className="flex text-center justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                  >
                    <img src={HISTORY} className="w-6 h-6 dark:invert m-auto" alt="Historial" />
                    {t("Historial")}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/about"
                  className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                >
                  <img src={INFO} className="w-6 h-6 dark:invert m-auto" alt="Info" />
                  {t("Informacion")}
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                >
                  <img src={SETTING} className="w-6 h-6 dark:invert m-auto" alt="Ajustes" />
                  {t("Ajustes")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <nav className="flex bg-[#fbefda] dark:bg-[#693BCC] justify-center sm:hidden">
        <div className="max-w-screen-xl px-4 py-2 mt-1 mx-auto">
          <div className="flex items-center justify-center">
            <ul className="flex flex-row font-medium mt-0 space-x-6 text-sm">
              <li>
                <Link
                  to="/"
                  className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                >
                  <img src={HOMEICO} className="w-5 h-5 dark:invert m-auto" alt="Inicio" />
                  {t("Inicio")}
                </Link>
              </li>
              <li>
                <Link
                  to="/compare"
                  className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                >
                  <img src={COMPARE} className="w-8 h-5 dark:invert m-auto text-center text-balance" alt="Comparar" />
                  {t("Comparar")}
                </Link>
              </li>
              {versiculoSeleccionadoNumero > 0 && (
                <li>
                  <Link
                    to="/history"
                    className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                  >
                    <img
                      src={HISTORY}
                      className="w-5 h-5 dark:invert m-auto text-center text-balance"
                      alt="Historial"
                    />
                    {t("Historial")}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/about"
                  className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                >
                  <img src={INFO} className="w-5 h-5 dark:invert m-auto" alt="Info" />
                  {t("Informacion")}
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className="flex justify-center flex-col text-gray-900 dark:text-white hover:scale-105 hover:underline"
                >
                  <img src={SETTING} className="w-5 h-5 dark:invert m-auto" alt="Ajustes" />
                  {t("Ajustes")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      {versiculoSeleccionadoNumero !== 0 && (
        <nav className={`sticky ${isFixed ? "fixed top-0" : ""} -z-10 gap-4 text-base lg:text-xl`}>
          <ol className="flex items-center w-full py-3 p-6 justify-center bg-[#fbefda] dark:text-white dark:bg-[#693BCC]">
            <li className="flex items-center text-black dark:text-white">
              {TipoTestamento(libroSeleccionado)}
              <svg
                className="w-3 h-3 ms-2 sm:ms-4 mr-2"
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
            <li className="flex items-center text-black dark:text-white">
              {t(libroSeleccionado)}
              <svg
                className="w-3 h-3 ms-2 sm:ms-4 mr-2"
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
            <li className="flex items-center text-black dark:text-white gap-2">
              {t("Capitulo")}
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
