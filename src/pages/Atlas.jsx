import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";
import { CRONOLOGIA, EPOCAS, ITINERARIOS, LUGARES, formatearAnio } from "../data/atlas";
import { parseReferencia, rutaDeReferencia } from "../utils/referencia";
import { codificarVersiones } from "../utils/versiones";

/**
 * Atlas: dónde y cuándo.
 *
 * ---------------------------------------------------------------------------
 * Por qué el mapa es esquemático
 * ---------------------------------------------------------------------------
 * Un mapa "de verdad" necesita teselas de un servidor de mapas. Esta app se
 * instala como PWA y tiene que servir para leer en una iglesia sin señal, así
 * que depender de una petición externa por cada movimiento del mapa la rompería
 * justo cuando más falta hace.
 *
 * La alternativa era dibujar las costas a mano. Se descartó: una costa dibujada
 * a ojo parece un mapa y no lo es, y un mapa que miente es peor que ninguno.
 *
 * Lo que queda es honesto y suficiente: las POSICIONES son reales (grados
 * decimales, proyección equirectangular), la retícula da la escala, y los
 * recorridos unen los puntos en el orden en que ocurrieron. Con eso se responde
 * lo que se pregunta al leer —cuánto hay de Antioquía a Jerusalén, por dónde
 * pasó Pablo antes de escribir a los filipenses— sin fingir cartografía.
 */

/** Encuadre del mundo bíblico: de Roma a Persépolis. */
const VISTA = { lonMin: 10, lonMax: 54, latMin: 25, latMax: 43 };
const ANCHO = 1000;

/*
 * Proyección equirectangular: longitud y latitud a X e Y, lineal.
 *
 * Deforma en latitudes altas, pero esta ventana va de 25° a 43°: en esa banda
 * la deformación es menor que el error de las propias identificaciones
 * arqueológicas. El factor `cos` de la latitud media corrige el aplastamiento
 * horizontal para que las distancias este-oeste no salgan estiradas.
 */
const LATITUD_MEDIA = ((VISTA.latMin + VISTA.latMax) / 2) * (Math.PI / 180);
const ALTO = Math.round((ANCHO * (VISTA.latMax - VISTA.latMin)) / ((VISTA.lonMax - VISTA.lonMin) * Math.cos(LATITUD_MEDIA)));

const proyectar = ({ lat, lon }) => ({
  x: ((lon - VISTA.lonMin) / (VISTA.lonMax - VISTA.lonMin)) * ANCHO,
  y: ((VISTA.latMax - lat) / (VISTA.latMax - VISTA.latMin)) * ALTO,
});

const COLOR_TIPO = {
  ciudad: "#d97706",
  monte: "#78716c",
  agua: "#0ea5e9",
  region: "#7c3aed",
};

const Atlas = () => {
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const { bibliasSeleccionadas } = useContext(DataContext);
  const navigate = useNavigate();

  const [epoca, setEpoca] = useState("todas");
  const [itinerario, setItinerario] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);

  const idioma = idiomaNavegador === "en" ? "en" : "es";
  const nombreDe = (item) => item[idioma] ?? item.es;

  const porId = useMemo(() => new Map(LUGARES.map((lugar) => [lugar.id, lugar])), []);

  const lugaresVisibles = useMemo(() => {
    if (itinerario) {
      const ruta = ITINERARIOS.find((item) => item.id === itinerario);
      const ids = new Set(ruta?.puntos ?? []);
      return LUGARES.filter((lugar) => ids.has(lugar.id));
    }
    if (epoca === "todas") return LUGARES;
    return LUGARES.filter((lugar) => lugar.epocas.includes(epoca));
  }, [epoca, itinerario]);

  const eventosVisibles = useMemo(() => {
    const lista = epoca === "todas" ? CRONOLOGIA : CRONOLOGIA.filter((evento) => evento.epoca === epoca);
    return [...lista].sort((a, b) => a.anio - b.anio);
  }, [epoca]);

  /** La línea del recorrido, ya proyectada. Los puntos desconocidos se saltan. */
  const trazado = useMemo(() => {
    if (!itinerario) return null;
    const ruta = ITINERARIOS.find((item) => item.id === itinerario);
    if (!ruta) return null;

    return ruta.puntos
      .map((id) => porId.get(id))
      .filter(Boolean)
      .map(proyectar)
      .map((punto) => `${punto.x.toFixed(1)},${punto.y.toFixed(1)}`)
      .join(" ");
  }, [itinerario, porId]);

  /** Abre la referencia de un evento en la pantalla de comparación. */
  const irAReferencia = (texto) => {
    const referencia = parseReferencia(texto);
    if (!referencia) return;
    const codigos = codificarVersiones(bibliasSeleccionadas);
    navigate(`${rutaDeReferencia(referencia)}${codigos ? `?v=${codigos}` : ""}`);
  };

  const botonFiltro = (activo) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
      activo ? "bg-amber-500 text-white dark:bg-purple-600" : "bg-black/5 text-neutral-700 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
    }`;

  return (
    <div className="mx-auto w-11/12 max-w-6xl pb-16 dark:text-white">
      <h1 className="animate-fade-in mt-7 text-center text-xl font-bold">{t("AtlasTitulo")}</h1>
      <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-neutral-600 dark:text-neutral-400">{t("AtlasIntro")}</p>

      {/* --- Filtros --- */}
      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setEpoca("todas");
            setItinerario(null);
          }}
          className={botonFiltro(epoca === "todas" && !itinerario)}
        >
          {t("AtlasTodas")}
        </button>
        {EPOCAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setEpoca(item.id);
              setItinerario(null);
            }}
            className={botonFiltro(epoca === item.id && !itinerario)}
          >
            {nombreDe(item)}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {ITINERARIOS.map((ruta) => (
          <button
            key={ruta.id}
            type="button"
            onClick={() => setItinerario((previo) => (previo === ruta.id ? null : ruta.id))}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              itinerario === ruta.id
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-neutral-300 text-neutral-600 hover:bg-black/5 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-white/10"
            }`}
          >
            {nombreDe(ruta)}
          </button>
        ))}
      </div>

      {/* --- Mapa --- */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-neutral-200 bg-[#eef4f8] p-2 dark:border-neutral-800 dark:bg-[#0d1620]">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label={t("AtlasMapaAlt")}
        >
          {/* Retícula cada 5°: da la escala sin dibujar costas inventadas. */}
          <g stroke="currentColor" className="text-neutral-300 dark:text-neutral-700" strokeWidth="1" opacity="0.6">
            {Array.from({ length: Math.floor((VISTA.lonMax - VISTA.lonMin) / 5) + 1 }, (_, i) => {
              const lon = VISTA.lonMin + i * 5;
              const { x } = proyectar({ lat: 0, lon });
              return <line key={`v${lon}`} x1={x} y1={0} x2={x} y2={ALTO} />;
            })}
            {Array.from({ length: Math.floor((VISTA.latMax - VISTA.latMin) / 5) + 1 }, (_, i) => {
              const lat = VISTA.latMin + i * 5;
              const { y } = proyectar({ lat, lon: 0 });
              return <line key={`h${lat}`} x1={0} y1={y} x2={ANCHO} y2={y} />;
            })}
          </g>

          {/* Etiquetas de la retícula, para leer las coordenadas. */}
          <g className="fill-neutral-400 dark:fill-neutral-600" fontSize="11">
            {Array.from({ length: Math.floor((VISTA.lonMax - VISTA.lonMin) / 5) + 1 }, (_, i) => {
              const lon = VISTA.lonMin + i * 5;
              const { x } = proyectar({ lat: 0, lon });
              return (
                <text key={`lv${lon}`} x={x + 3} y={ALTO - 5}>
                  {lon}°E
                </text>
              );
            })}
          </g>

          {trazado && (
            <polyline
              points={trazado}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              // Discontinua: el trazo une ciudades en orden, no reproduce el
              // camino real (que en media ruta fue por mar y no en línea recta).
              strokeDasharray="10 6"
              opacity="0.85"
            />
          )}

          {lugaresVisibles.map((lugar) => {
            const { x, y } = proyectar(lugar);
            const activo = seleccionado === lugar.id;
            return (
              <g key={lugar.id} onClick={() => setSeleccionado(activo ? null : lugar.id)} className="cursor-pointer">
                <circle
                  cx={x}
                  cy={y}
                  r={activo ? 8 : 5}
                  fill={COLOR_TIPO[lugar.tipo] ?? COLOR_TIPO.ciudad}
                  stroke="#fff"
                  strokeWidth="1.5"
                  opacity={lugar.incierto ? 0.55 : 1}
                />
                <text
                  x={x + 9}
                  y={y + 4}
                  fontSize="13"
                  className={`fill-neutral-700 dark:fill-neutral-200 ${activo ? "font-bold" : ""}`}
                  // Sin esto, el texto captura el clic destinado al círculo.
                  pointerEvents="none"
                >
                  {nombreDe(lugar)}
                  {lugar.incierto ? " (?)" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2 text-center text-[11px] text-neutral-500 dark:text-neutral-400">{t("AtlasNotaMapa")}</p>

      {seleccionado && porId.get(seleccionado) && (
        <div className="animate-fade-in mx-auto mt-3 max-w-md rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm font-bold">{nombreDe(porId.get(seleccionado))}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {porId.get(seleccionado).lat.toFixed(3)}°, {porId.get(seleccionado).lon.toFixed(3)}°
          </p>
          {porId.get(seleccionado).incierto && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t("AtlasUbicacionIncierta")}</p>}
        </div>
      )}

      {/* --- Línea de tiempo --- */}
      <h2 className="mt-10 text-center text-lg font-bold">{t("AtlasCronologia")}</h2>
      <p className="mx-auto mt-1 max-w-2xl text-center text-xs text-neutral-600 dark:text-neutral-400">{t("AtlasNotaFechas")}</p>

      <ol className="mt-5 flex flex-col">
        {eventosVisibles.map((evento) => (
          <li key={evento.id} className="flex gap-3">
            {/* El hilo vertical y el punto se dibujan con el propio elemento:
                una columna fija de ancho conocido evita que el texto largo
                descoloque la línea. */}
            <div className="flex w-24 shrink-0 flex-col items-end pt-0.5">
              <span className="text-xs font-bold tabular-nums text-neutral-700 dark:text-neutral-200">
                {evento.aproximada ? "c. " : ""}
                {formatearAnio(evento.anio, idioma)}
              </span>
            </div>

            <div className="relative flex w-4 shrink-0 justify-center">
              <span className="absolute inset-y-0 w-px bg-neutral-300 dark:bg-neutral-700"></span>
              <span className="relative mt-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:bg-purple-400 dark:ring-[#161519]"></span>
            </div>

            <div className="min-w-0 flex-1 pb-5">
              <p className="text-sm font-medium">{nombreDe(evento)}</p>
              {evento.refs && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {evento.refs.map((ref) => (
                    <button
                      key={ref}
                      type="button"
                      onClick={() => irAReferencia(ref)}
                      className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-white/10 dark:text-purple-300 dark:hover:bg-purple-900/50"
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Atlas;
