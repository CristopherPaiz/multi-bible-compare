import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";
import { PREGUNTAS } from "../utils/seo";

/**
 * Las preguntas frecuentes, en pantalla.
 *
 * Existe por una razón concreta: el `<head>` de `/about` declara un `FAQPage`
 * con estas mismas preguntas, y Google exige que el contenido marcado esté
 * VISIBLE en la página. Marcar preguntas que el usuario no puede leer es una
 * violación de sus directrices y cuesta el rich result entero, no solo el
 * bloque. Las dos listas salen de `utils/seo` para que no puedan divergir.
 *
 * Se usa `<details>` en vez de un acordeón propio: el contenido está en el DOM
 * aunque esté plegado —que es lo que mira el rastreador— y el navegador ya trae
 * el teclado y el lector de pantalla resueltos.
 */
const PreguntasFrecuentes = () => {
  const { idiomaNavegador, t } = useContext(LanguageContext);
  const lista = PREGUNTAS[idiomaNavegador] ?? PREGUNTAS.es;

  return (
    <section className="mt-10" aria-labelledby="faq-titulo">
      <h2 id="faq-titulo" className="text-2xl font-bold dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
        {t("PreguntasFrecuentes")}
      </h2>

      <div className="mt-4 space-y-2">
        {lista.map(({ p, r }) => (
          <details key={p} className="group rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 px-4 py-3 open:shadow-sm">
            <summary className="cursor-pointer list-none font-semibold text-sm text-gray-900 dark:text-white flex items-center justify-between gap-3">
              <span>{p}</span>
              <span aria-hidden="true" className="text-gray-400 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{r}</p>
          </details>
        ))}
      </div>
    </section>
  );
};

export default PreguntasFrecuentes;
