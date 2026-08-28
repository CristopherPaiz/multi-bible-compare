import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";

/*
 * ---------------------------------------------------------------------------
 * OCULTO: interruptor de fuente de datos (CDN de GitHub vs API)
 * ---------------------------------------------------------------------------
 * El interruptor existía para poder volver al CDN sin redesplegar si el
 * backend fallaba. Se esconde de la interfaz, NO se elimina: el mecanismo
 * completo sigue vivo en `src/config/dataSource.js` y las dos fuentes siguen
 * funcionando. Lo único que desaparece es la posibilidad de que el usuario lo
 * cambie desde Ajustes.
 *
 * El motivo de esconderlo es que ya no es una preferencia del usuario. La
 * búsqueda, las referencias cruzadas, la concordancia Strong y la
 * sincronización de la cuenta SOLO existen con la API; puesto en CDN, media
 * app se apaga sin que quede claro por qué. Ofrecer un interruptor que rompe
 * cosas es peor que no ofrecerlo.
 *
 * Sigue habiendo dos formas de cambiarlo cuando haga falta de verdad:
 *   - `VITE_DATA_SOURCE=github` en el build;
 *   - `localStorage.setItem("dataSource", "github")` desde la consola.
 * Y el respaldo automático (`AUTO_FALLBACK`) sigue reintentando contra el CDN
 * solo cuando la API falla, que era el caso que de verdad importaba.
 *
 * Para devolverlo a la vista: restaurar los imports de `dataSource`, el estado
 * `fuente` / `estadoApi` con sus dos efectos, `colorEstado`, y el bloque
 * "FUENTE DE DATOS" de más abajo. Las claves de idioma (`FuenteDatos`,
 * `EstadoApi_*`) se conservan sin tocar.
 */

const Settings = () => {
  const { t } = useContext(LanguageContext);
  const { paginaInicio, handlePaginaInicio, cambiarAnchoVentana, cambiarAltoVentana, anchoVentana, altoVentana } =
    useContext(DataContext);

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
        {/*
          FUENTE DE DATOS — oculto. Ver la nota al principio del archivo para
          el motivo y para cómo devolverlo a la vista.

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
        */}
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
        {/* TAMAÑO DE VENTANA ALTO */}
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
      </div>
    </>
  );
};

export default Settings;
