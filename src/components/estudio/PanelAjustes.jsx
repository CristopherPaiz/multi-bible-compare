import { useContext } from "react";
import DataContext from "../../context/DataContext";
import LanguageContext from "../../context/LanguageContext";

/**
 * Ajustes de lectura, al alcance mientras se lee.
 *
 * Los de tamaño ya existían en la pantalla de Ajustes, y ahí no servían: se
 * eligen MIRANDO el texto, probando y corrigiendo. Tener que salir de la
 * lectura, tocar un botón a ciegas y volver para ver el resultado convierte una
 * decisión de dos segundos en un viaje de ida y vuelta.
 *
 * ---------------------------------------------------------------------------
 * Global con excepciones, no una cosa o la otra
 * ---------------------------------------------------------------------------
 * Lo que se toca aquí vale para TODAS las versiones. La pestaña de marcado de
 * cada panel sigue mandando sobre la suya: una versión con preferencia propia
 * ignora esto mientras la tenga.
 *
 * Es la jerarquía que pide el uso real. "No quiero ver códigos gramaticales" se
 * decide una vez y para todo; "en la interlineal griega sí y en la española de
 * al lado no" es de esas dos versiones. Sin el nivel global había que repetir
 * el mismo gesto en cada panel; sin el nivel por versión, la interlineal y la
 * traducción tenían que enseñar lo mismo.
 *
 * Por eso el botón de restablecer solo aparece cuando hay excepciones: sin él,
 * tocar una vez el marcado de una versión la dejaba sorda a este ajuste para
 * siempre, sin manera de deshacerlo.
 */
const PanelAjustes = () => {
  const { t } = useContext(LanguageContext);
  const {
    anchoVentana,
    altoVentana,
    cambiarAnchoVentana,
    cambiarAltoVentana,
    tamanoTexto,
    cambiarTamanoTexto,
    TAMANOS_TEXTO_MAX,
    marcadoGlobal,
    alternarMarcadoGlobal,
    versionesConMarcadoPropio,
    restablecerMarcado,
  } = useContext(DataContext);

  const opcion = (activo) =>
    `flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      activo ? "bg-amber-500 text-white dark:bg-purple-600" : "bg-black/5 text-neutral-700 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
    }`;

  const paso =
    "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/5 text-neutral-700 transition-colors hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20";

  const grupo = (titulo, contenido) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{titulo}</span>
      {contenido}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {grupo(
        t("AjustesTamanoTexto"),
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => cambiarTamanoTexto(-1)} disabled={Number(tamanoTexto) <= 1} aria-label={t("AjustesTextoMenor")} className={paso}>
            <span className="text-sm font-bold">A−</span>
          </button>

          {/* Las barritas dicen en qué paso estás sin poner un número que no
              significa nada: "3" no es un tamaño, es una posición. */}
          <div className="flex flex-1 items-center gap-1">
            {Array.from({ length: TAMANOS_TEXTO_MAX }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < Number(tamanoTexto) ? "bg-amber-500 dark:bg-purple-500" : "bg-black/10 dark:bg-white/15"}`}
              ></span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => cambiarTamanoTexto(1)}
            disabled={Number(tamanoTexto) >= TAMANOS_TEXTO_MAX}
            aria-label={t("AjustesTextoMayor")}
            className={paso}
          >
            <span className="text-base font-bold">A+</span>
          </button>
        </div>
      )}

      {grupo(
        t("AjustesAncho"),
        <div className="flex gap-1.5">
          {["1", "2", "3"].map((valor, i) => (
            <button key={valor} type="button" onClick={() => cambiarAnchoVentana(valor)} className={opcion(anchoVentana === valor)}>
              {t(["AjustesPequeno", "AjustesMediano", "AjustesGrande"][i])}
            </button>
          ))}
        </div>
      )}

      {grupo(
        t("AjustesAlto"),
        <div className="flex gap-1.5">
          {["1", "2", "3"].map((valor, i) => (
            <button key={valor} type="button" onClick={() => cambiarAltoVentana(valor)} className={opcion(altoVentana === valor)}>
              {t(["AjustesPequeno", "AjustesMediano", "AjustesGrande"][i])}
            </button>
          ))}
        </div>
      )}

      {grupo(
        t("MostrarEnElTexto"),
        <div className="flex flex-col gap-1.5">
          {["glosa", "morfologia"].map((tipo) => (
            <label key={tipo} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-black/5 px-3 py-2 dark:bg-white/10">
              <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{t(tipo === "glosa" ? "Glosa" : "Morfologia")}</span>
              <input type="checkbox" checked={Boolean(marcadoGlobal[tipo])} onChange={() => alternarMarcadoGlobal(tipo)} className="peer sr-only" />
              {/*
                La bolita es un `::after` del propio riel y no un elemento
                aparte: `peer-checked:` genera `.peer:checked ~ .destino`, o sea
                que solo alcanza a HERMANOS del input. Un span anidado dentro
                del riel no es hermano y se quedaría quieto al marcar.
              */}
              <div className="relative h-5 w-9 shrink-0 rounded-full bg-neutral-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-4 dark:bg-neutral-600 dark:peer-checked:bg-purple-500"></div>
            </label>
          ))}

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{t("AjustesMarcadoAyuda")}</p>

          {versionesConMarcadoPropio > 0 && (
            <button
              type="button"
              onClick={restablecerMarcado}
              className="self-start rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:text-purple-300 dark:hover:bg-purple-900/40"
            >
              {t("AjustesRestablecerMarcado", { total: versionesConMarcadoPropio })}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PanelAjustes;
