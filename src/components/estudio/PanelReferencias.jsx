import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import LanguageContext from "../../context/LanguageContext";
import DataContext from "../../context/DataContext";
import { referenciasCruzadas, estaDisponible } from "../../services/estudioSource";
import { getChapter } from "../../services/bibleSource";
import { formatearReferencia, rutaDeReferencia } from "../../utils/referencia";
import { aTextoPlano } from "../../utils/textoPlano";
import { mapaDeLibro } from "../../data/canon";
import { codificarVersiones } from "../../utils/versiones";
import SelectorVersion from "./SelectorVersion";

/** Cuántos destinos se muestran de una vez. Los demás quedan tras "ver más". */
const VISIBLES = 8;

/**
 * Referencias cruzadas del versículo abierto.
 *
 * Los datos son el Treasury of Scripture Knowledge (dominio público), que es
 * literalmente el trabajo de leer la Biblia entera anotando qué pasaje habla de
 * lo mismo que cuál. Eso no se puede deducir del texto ni generar: o se importa
 * o no existe.
 *
 * Si el administrador no ha corrido `migrate.mjs crossrefs`, la lista llega
 * vacía y el panel lo dice en vez de fingir que el versículo no tiene
 * paralelos.
 */
const PanelReferencias = ({ bookId, capitulo, versiculo }) => {
  const { t } = useContext(LanguageContext);
  const { versionTrabajo, bibliasSeleccionadas } = useContext(DataContext);
  const navigate = useNavigate();

  // Las versiones abiertas viajan en la URL para que el enlace del paralelo
  // conserve la comparacion que se tenia montada.
  const codigosVersiones = useMemo(() => codificarVersiones(bibliasSeleccionadas), [bibliasSeleccionadas]);

  const [refs, setRefs] = useState(null);
  const [textos, setTextos] = useState({});
  const [expandido, setExpandido] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!bookId || !capitulo || !versiculo) return;

    const controller = new AbortController();
    let cancelado = false;

    setRefs(null);
    setTextos({});
    setExpandido(false);
    setError(false);

    referenciasCruzadas({ bookId, capitulo: Number(capitulo), versiculo: Number(versiculo), signal: controller.signal })
      .then((lista) => {
        if (!cancelado) setRefs(lista);
      })
      .catch((fallo) => {
        if (!cancelado && fallo?.name !== "AbortError") setError(true);
      });

    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [bookId, capitulo, versiculo]);

  /*
   * El texto de los destinos se pide aparte y solo para los que se ven.
   *
   * Una lista de "Romanos 5:8, Efesios 2:4, 1 Juan 4:9" obliga a ir a cada uno
   * para saber si interesa, y entonces se pierde el versículo que se estaba
   * estudiando. Con el texto delante se decide sin moverse.
   *
   * Se piden por CAPÍTULO y deduplicados: varias referencias caen a menudo en
   * el mismo capítulo, y el agrupador de la fuente Turso junta en una sola
   * consulta las que ocurren en el mismo tick.
   */
  useEffect(() => {
    if (!refs || refs.length === 0) return;
    if (!versionTrabajo) return;

    const biblia = versionTrabajo;
    const visibles = expandido ? refs : refs.slice(0, VISIBLES);
    const capitulos = new Map();
    for (const ref of visibles) capitulos.set(`${ref.bookId}:${ref.chapter}`, ref);

    let cancelado = false;
    // La previsualizacion anterior es de OTRA version: se descarta antes de
    // pedir la nueva, no cuando llega.
    setTextos({});

    Promise.all(
      [...capitulos.values()].map(async (ref) => {
        try {
          const datos = await getChapter({ legacyPath: biblia, bookId: ref.bookId, chapter: ref.chapter });
          return [`${ref.bookId}:${ref.chapter}`, datos];
        } catch {
          // Una versión sin ese testamento, o un fallo puntual: esa referencia
          // se queda sin previsualización y las demás siguen.
          return null;
        }
      })
    ).then((pares) => {
      if (cancelado) return;
      setTextos(Object.fromEntries(pares.filter(Boolean)));
    });

    return () => {
      cancelado = true;
    };
  }, [refs, expandido, versionTrabajo]);

  /*
   * Saltar al paralelo NAVEGA, no toca el estado a mano.
   *
   * Escribiendo el estado, la sincronización de URL lo reflejaba con `replace`
   * —que es lo correcto al pasar de un versículo a otro del mismo capítulo— y
   * el salto no dejaba entrada en el historial: el botón "atrás" no volvía al
   * versículo de partida, se salía de la pantalla.
   *
   * Aquí sí es una navegación de verdad: se apila, y volver atrás devuelve al
   * pasaje desde el que se saltó.
   *
   * `mantenerScroll` porque quien pulsa esto YA estaba leyendo. Mandarlo al
   * principio de la página le mueve el texto de debajo de los ojos; lo que
   * cambia es el contenido de los paneles, no dónde está mirando.
   */
  const irA = (ref) => {
    if (!mapaDeLibro(ref.bookId)?.[String(ref.chapter)]) return;

    const ruta = rutaDeReferencia({ bookId: ref.bookId, capitulo: ref.chapter, versiculo: ref.verse });
    navigate(`${ruta}${codigosVersiones ? `?v=${codigosVersiones}` : ""}`, { state: { mantenerScroll: true } });
  };

  if (!estaDisponible()) {
    return <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("ReferenciasNecesitaApi")}</p>;
  }

  if (error) {
    return <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("ReferenciasError")}</p>;
  }

  if (refs === null) {
    return (
      <div className="flex flex-col gap-2 py-2" aria-hidden="true">
        {[92, 78, 85].map((ancho, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" style={{ width: `${ancho}%` }}></div>
        ))}
      </div>
    );
  }

  if (refs.length === 0) {
    return <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("ReferenciasVacio")}</p>;
  }

  const visibles = expandido ? refs : refs.slice(0, VISIBLES);

  return (
    <div className="flex flex-col gap-2">
      {/* Con qué versión se previsualiza el destino. Va arriba porque explica
          en qué idioma está lo que se lee debajo. */}
      <SelectorVersion etiqueta={t("ReferenciasVerEn")} />

      <ul className="flex flex-col gap-1.5">
        {visibles.map((ref) => {
          const etiqueta = formatearReferencia(
            { bookId: ref.bookId, capitulo: ref.chapter, versiculo: ref.verse, versiculoFin: ref.end && ref.end.chapter === ref.chapter ? ref.end.verse : null },
            t
          );
          const texto = textos[`${ref.bookId}:${ref.chapter}`]?.[String(ref.verse)];

          return (
            <li key={`${ref.bookId}-${ref.chapter}-${ref.verse}`}>
              <button
                type="button"
                onClick={() => irA(ref)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-left transition-colors hover:border-amber-400 hover:bg-amber-50 dark:border-neutral-800 dark:hover:border-purple-500 dark:hover:bg-purple-950/30"
              >
                <span className="text-xs font-semibold text-amber-700 dark:text-purple-300">{etiqueta}</span>
                {texto && <span className="mt-0.5 block line-clamp-2 text-sm text-neutral-700 dark:text-neutral-300">{aTextoPlano(texto)}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {refs.length > VISIBLES && (
        <button
          type="button"
          onClick={() => setExpandido((previo) => !previo)}
          className="self-center rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          {expandido ? t("ContraerTodo") : `${t("CargarMas")} (${refs.length - VISIBLES})`}
        </button>
      )}
    </div>
  );
};

PanelReferencias.propTypes = {
  bookId: PropTypes.number.isRequired,
  capitulo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  versiculo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default PanelReferencias;
