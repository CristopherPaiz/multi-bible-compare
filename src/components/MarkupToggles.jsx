import { useContext, useEffect } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";

/**
 * Interruptores de morfología y glosa, dentro de la ventana de comparación.
 *
 * Van aquí y no en Ajustes a propósito: solo aplican a las versiones
 * interlineales, y quien las está leyendo quiere encenderlos y apagarlos
 * mientras compara, no irse a otra pantalla.
 *
 * La barra no aparece si el versículo en pantalla no trae ese marcado.
 */
const MarkupToggles = () => {
  const { t } = useContext(LanguageContext);
  const {
    mostrarMorfologia,
    setMostrarMorfologia,
    mostrarGlosa,
    setMostrarGlosa,
    marcadoDetectado,
    setMarcadoDetectado,
    libroSeleccionado,
    capituloSeleccionadoNumero,
    versiculoSeleccionadoNumero,
  } = useContext(DataContext);

  // Al cambiar de referencia se reinicia la detección: si el versículo nuevo no
  // trae morfología, la barra debe desaparecer en vez de quedarse pegada.
  useEffect(() => {
    setMarcadoDetectado({ morfologia: false, glosa: false });
  }, [libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero, setMarcadoDetectado]);

  if (!marcadoDetectado.morfologia && !marcadoDetectado.glosa) return null;

  const boton = (activo) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      activo
        ? "border-transparent bg-amber-400 text-black dark:bg-purple-600 dark:text-white"
        : "border-gray-300 bg-transparent text-gray-600 dark:border-gray-600 dark:text-gray-300"
    }`;

  return (
    <div className="mx-auto mb-4 flex w-11/12 flex-wrap items-center justify-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{t("MostrarEnElTexto")}</span>

      {marcadoDetectado.glosa && (
        <button
          type="button"
          onClick={() => setMostrarGlosa(!mostrarGlosa)}
          aria-pressed={mostrarGlosa}
          className={boton(mostrarGlosa)}
        >
          {t("Glosa")}
        </button>
      )}

      {marcadoDetectado.morfologia && (
        <button
          type="button"
          onClick={() => setMostrarMorfologia(!mostrarMorfologia)}
          aria-pressed={mostrarMorfologia}
          className={boton(mostrarMorfologia)}
        >
          {t("Morfologia")}
        </button>
      )}
    </div>
  );
};

export default MarkupToggles;
