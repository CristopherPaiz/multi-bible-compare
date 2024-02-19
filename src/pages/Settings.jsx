import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";
import ThemeContext from "../context/ThemeContext";
import MOON from "/moon.png";
import SUN from "/sun.png";
import USA from "/USA.png";
import SPAIN from "/SPAIN.png";

const Settings = () => {
  const { t, cambiarIdioma, idiomaNavegador } = useContext(LanguageContext);
  const { changeTheme, theme } = useContext(ThemeContext);
  return (
    <>
      <h1 className="text-xl font-bold flex justify-center text-center mt-7 dark:text-white">{t("Ajustes")}</h1>
      <div className="flex gap-3 mt-4 flex-col w-full justify-center">
        <button
          style={{ alignItems: "center" }}
          className="justify-center gap-3 flex bg-yellow-300 font-light py-4 px-4 rounded-lg w-60 m-auto dark:bg-blue-700 dark:text-white"
          onClick={cambiarIdioma}
        >
          {t("CambiarIdioma")}
          {idiomaNavegador === "es" ? <img src={USA} className="w-5 h-5"></img> : <img src={SPAIN} className="w-5 h-5 "></img>}
        </button>
        {theme === "light" ? (
          <button
            style={{ alignItems: "center" }}
            className="justify-center gap-3 flex bg-yellow-300 font-light py-4 px-4 rounded-lg w-60 m-auto dark:bg-blue-700 dark:text-white"
            onClick={changeTheme}
          >
            {t("CambiarTemaOscuro")}
            <img src={MOON} className="w-5 h-5 dark:invert"></img>
          </button>
        ) : (
          <button
            style={{ alignItems: "center" }}
            className="justify-center gap-3 flex bg-yellow-300 font-light py-4 px-4 rounded-lg w-60 m-auto dark:bg-blue-700 dark:text-white"
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
