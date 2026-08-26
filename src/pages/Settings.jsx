import { useContext, useEffect, useState } from "react";
import LanguageContext from "../context/LanguageContext";
import ThemeContext from "../context/ThemeContext";
import MOON from "/moon.png";
import SUN from "/sun.png";
import USA from "/USA.png";
import SPAIN from "/SPAIN.png";
import DataContext from "../context/DataContext";
import { SOURCES, getDataSource, setDataSource, onDataSourceChange, API_URL } from "../config/dataSource";

const Settings = () => {
  const { t, cambiarIdioma, idiomaNavegador } = useContext(LanguageContext);
  const { changeTheme, theme } = useContext(ThemeContext);
  const { paginaInicio, handlePaginaInicio, cambiarAnchoVentana, cambiarAltoVentana, anchoVentana, altoVentana } =
    useContext(DataContext);

  // Interruptor de fuente de datos. Existe para poder volver al CDN de GitHub
  // sin redeploy si el backend falla.
  const [fuente, setFuente] = useState(getDataSource);
  const [estadoApi, setEstadoApi] = useState("comprobando");

  useEffect(() => onDataSourceChange(setFuente), []);

  useEffect(() => {
    if (fuente !== SOURCES.TURSO) {
      setEstadoApi("inactiva");
      return;
    }

    const controller = new AbortController();
    setEstadoApi("comprobando");

    fetch(`${API_URL}/api/system/status`, { signal: controller.signal })
      .then((response) => setEstadoApi(response.ok ? "conectada" : "sin respuesta"))
      .catch((error) => {
        if (error?.name !== "AbortError") setEstadoApi("sin respuesta");
      });

    return () => controller.abort();
  }, [fuente]);

  const colorEstado = {
    conectada: "bg-green-500",
    comprobando: "bg-yellow-500",
    "sin respuesta": "bg-red-500",
    inactiva: "bg-gray-400",
  }[estadoApi];

  const buttonClass = (isActive) =>
    `text-[10px] font-medium text-gray-900 dark:text-black-300 ${isActive ? "bg-blue-500 text-white" : "bg-slate-300"} px-3 py-2 rounded-md`;

  return (
    <>
      <h1 className="animate-fade-in text-xl font-bold flex justify-center text-center mt-7 dark:text-white">{t("Ajustes")}</h1>
      <div className="animate-fade-in flex gap-3 mt-4 flex-col w-full justify-center">
        {/* PÁGINA DE INICIO */}
        <div className="p-4 rounded-md bg-pink-200 dark:bg-pink-900 m-auto justify-center w-60">
          <h1 className="text-sm font-medium flex justify-center mb-3 text-center dark:text-white">{t("PaginaDeInicio")}</h1>
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-300">{t("Inicio")}</span>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" onChange={handlePaginaInicio} className="sr-only peer" checked={paginaInicio === "/compare" ? true : false} />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-pink-900 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600 dark:peer-checked:bg-pink-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-300">{t("Comparar")}</span>
          </div>
        </div>
        {/* FUENTE DE DATOS */}
        <div className="p-4 rounded-md bg-emerald-200 dark:bg-emerald-900 m-auto justify-center w-60">
          <h1 className="text-sm font-medium flex justify-center mb-3 text-center dark:text-white">{t("FuenteDatos")}</h1>
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-300">CDN</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={fuente === SOURCES.TURSO}
                onChange={(event) => setDataSource(event.target.checked ? SOURCES.TURSO : SOURCES.GITHUB)}
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-900 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600 dark:peer-checked:bg-emerald-500"></div>
            </label>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-300">API</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full ${colorEstado}`}></span>
            <span className="text-[10px] text-gray-800 dark:text-gray-300">{t(`EstadoApi_${estadoApi.replace(" ", "_")}`)}</span>
          </div>
          <p className="text-[9px] text-center mt-2 text-gray-700 dark:text-gray-400">{t("FuenteDatosAyuda")}</p>
        </div>
        {/* TAMAÑO DE VENTANA ANCHO */}
        <div className="p-4 rounded-md bg-yellow-300 dark:bg-yellow-500 m-auto justify-center w-60">
          <h1 className="text-sm font-medium flex justify-center mb-3 text-center dark:text-white">Tamaño de la ventana Ancho</h1>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => cambiarAnchoVentana("1")} className={buttonClass(anchoVentana === "1")}>
              Pequeño
            </button>
            <button onClick={() => cambiarAnchoVentana("2")} className={buttonClass(anchoVentana === "2")}>
              Mediano
            </button>
            <button onClick={() => cambiarAnchoVentana("3")} className={buttonClass(anchoVentana === "3")}>
              Grande
            </button>
          </div>
        </div>
        {/* TAMAÑO DE VENTANA ANCHO */}
        <div className="p-4 rounded-md bg-pink-300 dark:bg-pink-500 m-auto justify-center w-60">
          <h1 className="text-sm font-medium flex justify-center mb-3 text-center dark:text-white">Tamaño de la ventana Alto</h1>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => cambiarAltoVentana("1")} className={buttonClass(altoVentana === "1")}>
              Pequeño
            </button>
            <button onClick={() => cambiarAltoVentana("2")} className={buttonClass(altoVentana === "2")}>
              Mediano
            </button>
            <button onClick={() => cambiarAltoVentana("3")} className={buttonClass(altoVentana === "3")}>
              Grande
            </button>
          </div>
        </div>
        {/* CAMBIAR A INGLÉS */}
        <button
          style={{ alignItems: "center" }}
          className="justify-center gap-3 flex bg-[#94d67d] font-light py-4 px-4 rounded-lg w-60 m-auto dark:bg-[#3b9229] dark:text-white"
          onClick={cambiarIdioma}
        >
          {t("CambiarIdioma")}
          {idiomaNavegador === "es" ? <img src={USA} className="w-5 h-5"></img> : <img src={SPAIN} className="w-5 h-5 "></img>}
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
