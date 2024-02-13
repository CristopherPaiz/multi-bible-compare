import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";
import ThemeContext from "../context/ThemeContext";

const Settings = () => {
  const { t, cambiarIdioma } = useContext(LanguageContext);
  const { changeTheme } = useContext(ThemeContext);
  return (
    <>
      <h1 className="text-xl font-bold flex justify-center text-center mt-7 dark:text-white">{t("Ajustes")}</h1>
      <div className="flex gap-3 mt-4 flex-col w-full justify-center">
        <button className="bg-yellow-300 font-light py-2 px-4 rounded-lg w-60 m-auto dark:bg-blue-700 dark:text-white" onClick={cambiarIdioma}>
          {t("CambiarIdioma")}
        </button>
        <button className="bg-yellow-300 font-light py-2 px-4 rounded-lg w-60 m-auto dark:bg-blue-700 dark:text-white" onClick={changeTheme}>
          {t("CambiarTema")}
        </button>
      </div>
    </>
  );
};

export default Settings;
