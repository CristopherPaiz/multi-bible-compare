import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import LanguageContext from "../context/LanguageContext";
import { MAX_VERSIONES_COMPARADAS, idiomaDeVersion, nombreIdioma } from "../utils/versiones";
import { nombreCortoVersion } from "../utils/exportar";

/**
 * Qué hacer cuando un resultado de búsqueda viene de una versión que no está
 * abierta en Comparar.
 *
 * ---------------------------------------------------------------------------
 * Por qué preguntar en vez de resolverlo solo
 * ---------------------------------------------------------------------------
 * Antes la versión se colaba al principio de la lista sin avisar. Eso rompe dos
 * cosas a la vez: la comparación que el usuario había montado a mano cambia
 * sola, y si ya había 25 abiertas no hay sitio, así que o se pasa del tope o se
 * cae alguna en silencio.
 *
 * Son tres intenciones distintas y la app no puede adivinar cuál es:
 *
 *   - "solo quiero LEER ese versículo ahí"      -> ver solo esa versión;
 *   - "quiero COMPARARLA con las que tengo"      -> añadirla;
 *   - "me equivoqué de resultado"                -> cancelar.
 *
 * Con el tope lleno la pregunta se vuelve concreta —a cuál reemplaza— y esa
 * elección es del usuario: cualquier regla automática (la primera, la última,
 * la menos usada) tira trabajo suyo.
 */
const ModalVersionAusente = ({ version, seleccionadas, onCancelar, onSoloEsta, onAgregar }) => {
  const { t } = useContext(LanguageContext);

  /** `null` = pantalla de opciones; si no, se está eligiendo a quién reemplazar. */
  const [eligiendoReemplazo, setEligiendoReemplazo] = useState(false);

  const cajaRef = useRef(null);
  const primerBoton = useRef(null);

  const lleno = seleccionadas.length >= MAX_VERSIONES_COMPARADAS;

  useEffect(() => {
    primerBoton.current?.focus();
  }, [eligiendoReemplazo]);

  useEffect(() => {
    const alPulsar = (evento) => {
      if (evento.key === "Escape") onCancelar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCancelar]);

  const alTocarFondo = (evento) => {
    if (cajaRef.current && !cajaRef.current.contains(evento.target)) onCancelar();
  };

  const etiqueta = (ruta) => `${nombreIdioma(idiomaDeVersion(ruta), t)} · ${nombreCortoVersion(ruta)}`;

  const nombreVersion = etiqueta(version);

  const botonSecundario =
    "w-full rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-800 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-white/10 dark:focus-visible:ring-purple-400";

  return (
    <div
      onMouseDown={alTocarFondo}
      role="dialog"
      aria-modal="true"
      aria-label={t("VersionAusenteTitulo")}
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      {/* En móvil sube desde abajo y ocupa el ancho: es donde está el pulgar y
          la decisión es de una sola pulsación. En escritorio, tarjeta centrada. */}
      <div
        ref={cajaRef}
        className="animate-slide-in-bottom w-full max-w-md rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5"
      >
        {!eligiendoReemplazo ? (
          <>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">{t("VersionAusenteTitulo")}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {t("VersionAusenteTexto", { version: nombreVersion })}
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                ref={primerBoton}
                type="button"
                onClick={() => (lleno ? setEligiendoReemplazo(true) : onAgregar(null))}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-left text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30 dark:bg-purple-600 dark:shadow-purple-900/40 dark:hover:bg-purple-700"
              >
                {t("VersionAusenteAgregar")}
                <span className="mt-0.5 block text-xs font-medium opacity-80">
                  {lleno
                    ? t("VersionAusenteLleno", { max: MAX_VERSIONES_COMPARADAS })
                    : t("VersionAusenteAgregarAyuda", { n: seleccionadas.length })}
                </span>
              </button>

              <button type="button" onClick={onSoloEsta} className={botonSecundario}>
                {t("VersionAusenteSolo")}
                <span className="mt-0.5 block text-xs font-normal text-neutral-500 dark:text-neutral-400">{t("VersionAusenteSoloAyuda")}</span>
              </button>

              <button
                type="button"
                onClick={onCancelar}
                className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-500 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:bg-white/10"
              >
                {t("VersionAusenteCancelar")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">{t("VersionAusenteReemplazar")}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {t("VersionAusenteLleno", { max: MAX_VERSIONES_COMPARADAS })}
            </p>

            {/* La lista puede tener 25 entradas: se desplaza dentro del modal en
                vez de estirarlo más allá de la pantalla. */}
            <ul className="mt-4 max-h-[45vh] space-y-1 overflow-y-auto pr-1">
              {seleccionadas.map((ruta, indice) => (
                <li key={ruta}>
                  <button
                    ref={indice === 0 ? primerBoton : undefined}
                    type="button"
                    onClick={() => onAgregar(ruta)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-800 transition hover:bg-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-neutral-100 dark:hover:bg-purple-500/15 dark:focus-visible:ring-purple-400"
                  >
                    <span className="min-w-0 flex-1 truncate">{etiqueta(ruta)}</span>
                    <span className="shrink-0 text-xs font-bold text-amber-600 dark:text-purple-300">{t("VersionAusenteReemplazar")}</span>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setEligiendoReemplazo(false)}
              className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-500 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:bg-white/10"
            >
              {t("VersionAusenteVolver")}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

ModalVersionAusente.propTypes = {
  /** Ruta de la versión del resultado, la que NO está abierta. */
  version: PropTypes.string.isRequired,
  /** Versiones abiertas ahora mismo, en su orden. */
  seleccionadas: PropTypes.arrayOf(PropTypes.string).isRequired,
  onCancelar: PropTypes.func.isRequired,
  onSoloEsta: PropTypes.func.isRequired,
  /** Recibe la ruta a la que reemplaza, o `null` si simplemente se añade. */
  onAgregar: PropTypes.func.isRequired,
};

export default ModalVersionAusente;
