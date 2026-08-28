import { useContext } from "react";
import PropTypes from "prop-types";
import DataContext from "../../context/DataContext";
import LanguageContext from "../../context/LanguageContext";
import { nombreCortoVersion } from "../../utils/exportar";
import { idiomaDeVersion } from "../../utils/versiones";

/**
 * Con qué versión trabajan los paneles que solo pueden usar una.
 *
 * Aparece en referencias cruzadas, lectura en voz alta y exportación, y los
 * tres comparten la elección: cambiarla en uno la cambia en los demás, porque
 * es la misma pregunta —"¿cuál de las que tengo abiertas es la que me
 * interesa?"— y responderla tres veces sería absurdo.
 *
 * Con una sola versión abierta no se dibuja nada: no hay elección que ofrecer,
 * y un desplegable de un solo elemento es ruido.
 *
 * Es un `<select>` nativo a propósito. En móvil abre la rueda del sistema, que
 * con ocho versiones de nombre largo se maneja mejor que cualquier lista que
 * pudiéramos pintar dentro de un panel que ya tiene su propio scroll.
 */
const SelectorVersion = ({ etiqueta }) => {
  const { bibliasSeleccionadas, versionTrabajo, setVersionPreferida } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  if (bibliasSeleccionadas.length < 2) return null;

  return (
    <label className="flex items-center gap-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
      <span className="shrink-0">{etiqueta ?? t("VersionDeTrabajo")}</span>
      <select
        value={versionTrabajo ?? ""}
        onChange={(evento) => setVersionPreferida(evento.target.value)}
        className="min-w-0 flex-1 truncate rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-purple-400"
      >
        {bibliasSeleccionadas.map((ruta) => (
          <option key={ruta} value={ruta}>
            {/* El idioma va delante porque es lo que distingue de un vistazo la
                interlineal griega de la traducción, que es justo la confusión
                que este selector viene a resolver. */}
            {idiomaDeVersion(ruta)} · {nombreCortoVersion(ruta)}
          </option>
        ))}
      </select>
    </label>
  );
};

SelectorVersion.propTypes = {
  etiqueta: PropTypes.string,
};

export default SelectorVersion;
