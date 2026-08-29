import { useContext, useEffect } from "react";
import PropTypes from "prop-types";
import LanguageContext from "../../context/LanguageContext";
import DataContext from "../../context/DataContext";
import { useLectorVoz } from "../../hooks/useLectorVoz";
import SelectorVersion from "./SelectorVersion";

const VELOCIDADES = [0.75, 1, 1.25, 1.5, 2];

/**
 * Lectura en voz alta del capítulo.
 *
 * Lee UNA versión: la de trabajo, compartida con los paneles de referencias
 * y exportar. Leer varias a la vez no significa nada en audio —serían dos voces
 * solapadas diciendo lo mismo con otras palabras—, y cuál se lee se cambia en
 * el selector de arriba.
 *
 * Mientras lee, el versículo en curso se selecciona en la app. Eso hace dos
 * cosas de una: los paneles siguen la lectura solos (ya centran el versículo
 * seleccionado) y si el usuario para, se queda justo donde iba.
 */
const PanelAudio = ({ biblia, iso }) => {
  const { t } = useContext(LanguageContext);
  const { textosPorBiblia, versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero } = useContext(DataContext);

  const capitulo = textosPorBiblia[biblia];

  const { disponible, leyendo, versiculoActual, voces, vozElegida, setVozElegida, velocidad, setVelocidad, reproducir, pausar, reanudar, detener } =
    useLectorVoz({ capitulo, iso, desde: versiculoSeleccionadoNumero || 1 });

  // La lectura arrastra la selección. Se compara antes de escribir: sin eso,
  // cada enunciado dispararía un render aunque el número no hubiera cambiado.
  useEffect(() => {
    if (versiculoActual && Number(versiculoActual) !== Number(versiculoSeleccionadoNumero)) {
      setVersiculoSeleccionadoNumero(versiculoActual);
    }
  }, [versiculoActual, versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero]);

  if (!disponible) {
    return <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("AudioNoDisponible")}</p>;
  }

  if (!capitulo || typeof capitulo !== "object") {
    return <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("Cargando")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Qué versión se lee. Cambiarla aquí la cambia también en referencias y
          en exportar: es la misma pregunta y una sola respuesta. */}
      <SelectorVersion etiqueta={t("AudioLeer")} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (leyendo ? pausar() : window.speechSynthesis?.paused ? reanudar() : reproducir())}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          {leyendo ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          {leyendo ? t("AudioPausar") : t("AudioReproducir")}
        </button>

        <button
          type="button"
          onClick={detener}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-black/5 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-white/10"
        >
          {t("AudioDetener")}
        </button>

        {versiculoActual && <span className="ml-auto text-xs font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">v. {versiculoActual}</span>}
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        {t("AudioVoz")}
        <select
          value={vozElegida}
          onChange={(evento) => setVozElegida(evento.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="">{t("AudioVozSistema")}</option>
          {voces.map((voz) => (
            <option key={voz.name} value={voz.name}>
              {voz.name} ({voz.lang})
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{t("AudioVelocidad")}</span>
        <div className="flex flex-wrap gap-1.5">
          {VELOCIDADES.map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setVelocidad(valor)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                velocidad === valor
                  ? "bg-amber-500 text-white dark:bg-purple-600"
                  : "bg-black/5 text-neutral-700 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
              }`}
            >
              {valor}×
            </button>
          ))}
        </div>
      </div>

      {/* Cambiar la voz o la velocidad mientras se lee reinicia el versículo en
          curso con los ajustes nuevos: la Web Speech API no deja cambiárselos a
          un enunciado que ya está sonando, así que la única forma de que 2×
          suene a 2× es volver a empezar ese versículo. Ver `reiniciarActual`. */}
      <p className="text-[11px] text-neutral-400">{t("AudioAviso")}</p>
    </div>
  );
};

PanelAudio.propTypes = {
  biblia: PropTypes.string.isRequired,
  iso: PropTypes.string,
};

export default PanelAudio;
