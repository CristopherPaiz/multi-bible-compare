import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";
import ThemeContext from "../context/ThemeContext";
import MOON from "/moon.png";
import SUN from "/sun.png";
import USA from "/USA.png";
import SPAIN from "/SPAIN.png";
import DataContext from "../context/DataContext";

const Settings = () => {
  const { t, cambiarIdioma, idiomaNavegador } = useContext(LanguageContext);
  const { changeTheme, theme } = useContext(ThemeContext);
  const { handleTipoTraductor, tipoTraductor } = useContext(DataContext);
  return (
    <>
      <h1 className="text-xl font-bold flex justify-center text-center mt-7 dark:text-white">{t("Ajustes")}</h1>
      <div className="flex gap-3 mt-4 flex-col w-full justify-center">
        {/* PÁGINA DE INICIO */}
        <div className="p-4 rounded-md bg-pink-200 dark:bg-pink-900 m-auto justify-center w-60">
          <h1 className="text-sm font-medium flex justify-center mb-3 text-center dark:text-white">
            {t("PaginaDeInicio")}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-300">{t("Inicio")}</span>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-pink-900 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600 dark:peer-checked:bg-pink-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-300">{t("Comparar")}</span>
          </div>
        </div>
        {/* TRADUCTOR DE GOOGLE */}
        <div className="p-4 rounded-md bg-blue-300 dark:bg-blue-500 m-auto justify-center w-60">
          <h1 className="text-sm font-medium flex justify-center mb-3 text-center dark:text-white">
            {t("VersionTraductor")}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-300">v1</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                onChange={handleTipoTraductor}
                className="sr-only peer"
                checked={tipoTraductor === "?" ? true : false}
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-purple-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600 dark:peer-checked:bg-purple-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-300">v2</span>
          </div>
        </div>
        {/* CAMBIAR A INGLÉS */}
        <button
          style={{ alignItems: "center" }}
          className="justify-center gap-3 flex bg-[#94d67d] font-light py-4 px-4 rounded-lg w-60 m-auto dark:bg-[#3b9229] dark:text-white"
          onClick={cambiarIdioma}
        >
          {t("CambiarIdioma")}
          {idiomaNavegador === "es" ? (
            <img src={USA} className="w-5 h-5"></img>
          ) : (
            <img src={SPAIN} className="w-5 h-5 "></img>
          )}
        </button>
        {/* CAMBIAR A TEMA */}
        {theme === "light" ? (
          <button
            style={{ alignItems: "center" }}
            className="justify-center gap-3 flex bg-[#FDD07A] font-light py-4 px-4 rounded-lg w-60 m-auto dark:bg-[#693BCC] dark:text-white"
            onClick={changeTheme}
          >
            {t("CambiarTemaOscuro")}
            <img src={MOON} className="w-5 h-5 dark:invert"></img>
          </button>
        ) : (
          <button
            style={{ alignItems: "center" }}
            className="justify-center gap-3 flex bg-[#FDD07A] font-light py-4 px-4 rounded-lg w-60 m-auto dark:bg-[#693bcc] dark:text-white"
            onClick={changeTheme}
          >
            {t("CambiarTemaClaro")}
            <img src={SUN} className="w-5 h-5 dark:invert"></img>
          </button>
        )}
      </div>
    </>
  );
};

export default Settings;
