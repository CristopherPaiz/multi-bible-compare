import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";
import { CRONOLOGIA, EPOCAS, ITINERARIOS, LUGARES, formatearAnio } from "../data/atlas";
import { parseReferencia, rutaDeReferencia } from "../utils/referencia";
import { codificarVersiones } from "../utils/versiones";
import { VISTA, ANCHO, ALTO, proyectar } from "../utils/mapaProyeccion";
import { TIERRA, LAGOS } from "../data/atlasCostas";
import { useMapaZoom } from "../hooks/useMapaZoom";

/**
 * Atlas: dónde y cuándo.
 *
 * ---------------------------------------------------------------------------
 * De dónde salen las costas
 * ---------------------------------------------------------------------------
 * De Natural Earth, que es dominio público, recortadas al encuadre y
 * convertidas a un `<path>` de SVG por `scripts/build-atlas-map.mjs`. Viajan
 * como código, no como petición: son 28 KB dentro del trozo del atlas, que ya
 * se carga aparte.
 *
 * Se descartaron las dos alternativas obvias. Un mapa de teselas
 * (OpenStreetMap y compañía) necesita una petición por cuadro y por nivel de
 * zoom, y esta app se instala como PWA para leer sin señal: un mapa en blanco
 * justo cuando más falta hace. Y dibujar las costas a mano se descartó porque
 * una costa a ojo PARECE un mapa sin serlo, y un mapa que miente es peor que
 * ninguno.
 *
 * Lo que sí es una simplificación consciente: a la resolución de 50 m las islas
 * muy pequeñas —Patmos entre ellas— no existen como polígono. Su marcador se
 * pinta igual, encima del mar.
 *
 * ---------------------------------------------------------------------------
 * Por qué dos pestañas y no una página larga
 * ---------------------------------------------------------------------------
 * El mapa y la cronología responden a preguntas distintas —dónde y cuándo— y
 * nadie mira las dos a la vez. Apiladas, en un móvil había que pasar el mapa
 * entero y dos filas de filtros para llegar a la lista, y al volver arriba se
 * perdía el sitio. Separadas, cada vista empieza donde el pulgar la deja.
 *
 * El filtro de época es el MISMO en las dos: es la pregunta común ("enséñame
 * solo el destierro"), y duplicarlo obligaría a responderla dos veces.
 */

const COLOR_TIPO = {
  ciudad: "#d97706",
  monte: "#78716c",
  agua: "#0ea5e9",
  region: "#7c3aed",
};

/**
 * Fila de fichas que se desplaza a lo ancho en vez de envolver.
 *
 * Envolviendo, las siete épocas ocupaban tres líneas en un móvil y empujaban el
 * mapa fuera de la pantalla: se entraba al atlas y lo primero era un muro de
 * botones. En una fila que se arrastra, el alto es fijo pase lo que pase.
 */
const FILA_FICHAS = "flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const Atlas = () => {
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const { bibliasSeleccionadas } = useContext(DataContext);
  const navigate = useNavigate();

  const [pestana, setPestana] = useState("mapa");
  const [epoca, setEpoca] = useState("todas");
  const [itinerario, setItinerario] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);

  const { svgRef, viewBox, escala, ampliado, gestos, huboArrastre, acercarCentro, reiniciar, PASO } = useMapaZoom();

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

  const ficha = (activo) =>
    `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
      activo
        ? "bg-amber-500 text-white dark:bg-purple-600"
        : "bg-black/5 text-neutral-700 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/20"
    }`;

  const pestanaClase = (activa) =>
    `flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      activa
        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
    }`;

  const botonMapa =
    "grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white/90 text-neutral-700 shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-40 dark:border-white/10 dark:bg-neutral-900/90 dark:text-neutral-200 dark:hover:bg-neutral-900";

  const lugarActivo = seleccionado ? porId.get(seleccionado) : null;

  return (
    <div className="mx-auto w-11/12 max-w-5xl pb-16 dark:text-white">
      <h1 className="animate-fade-in mt-6 text-center text-xl font-bold">{t("AtlasTitulo")}</h1>
      <p className="mx-auto mt-1.5 max-w-xl text-center text-xs text-neutral-600 dark:text-neutral-400">{t("AtlasIntro")}</p>

      {/* Las pestañas van arriba del todo: así se ve desde el principio que hay
          dos vistas, y no una página que no se acaba. */}
      <div role="tablist" className="mx-auto mt-4 flex max-w-sm gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/10">
        <button type="button" role="tab" aria-selected={pestana === "mapa"} onClick={() => setPestana("mapa")} className={pestanaClase(pestana === "mapa")}>
          {t("AtlasPestanaMapa")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "cronologia"}
          onClick={() => setPestana("cronologia")}
          className={pestanaClase(pestana === "cronologia")}
        >
          {t("AtlasCronologia")}
        </button>
      </div>

      {/* El filtro de época es común a las dos vistas. */}
      <div className={`${FILA_FICHAS} mt-4`}>
        <button
          type="button"
          onClick={() => {
            setEpoca("todas");
            setItinerario(null);
          }}
          className={ficha(epoca === "todas")}
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
            className={ficha(epoca === item.id)}
          >
            {nombreDe(item)}
          </button>
        ))}
      </div>

      {pestana === "mapa" ? (
        <>
          <div className={`${FILA_FICHAS} mt-1.5`}>
            {ITINERARIOS.map((ruta) => (
              <button
                key={ruta.id}
                type="button"
                onClick={() => setItinerario((previo) => (previo === ruta.id ? null : ruta.id))}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  itinerario === ruta.id
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-neutral-300 text-neutral-600 hover:bg-black/5 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-white/10"
                }`}
              >
                {nombreDe(ruta)}
              </button>
            ))}
          </div>

          <div className="relative mt-3 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            {/*
              `touch-none` es obligatorio: sin él, el navegador se queda el
              gesto para desplazar la página y el arrastre del mapa nunca llega.
              A cambio, sobre el mapa no se desplaza la página — que es cómo se
              comporta cualquier mapa y por lo que el alto va acotado.
            */}
            <svg ref={svgRef} viewBox={viewBox} className="block h-auto w-full touch-none select-none" role="img" aria-label={t("AtlasMapaAlt")} {...gestos}>
              {/*
                El mar es el fondo y la tierra se pinta encima. Al revés —el mar
                como polígonos— habría que recortar el Mediterráneo, el Rojo, el
                Caspio y el Pérsico uno por uno; así basta un rectángulo y las
                costas salen gratis del contorno de la tierra.
              */}
              <rect x="0" y="0" width={ANCHO} height={ALTO} className="fill-[#cfe3ee] dark:fill-[#0b1a26]" />
              <path d={TIERRA} className="fill-[#e9e3d3] stroke-[#c3b9a0] dark:fill-[#1e2a20] dark:stroke-[#3a4a3c]" strokeWidth={0.8 * escala} />
              {/*
                Los lagos van DESPUÉS de la tierra y del color del mar: el mar
                Muerto y el de Galilea caen dentro del polígono continental, así
                que pintados antes quedarían tapados.
              */}
              <path d={LAGOS} className="fill-[#cfe3ee] dark:fill-[#0b1a26]" />

              <g stroke="currentColor" className="text-neutral-400 dark:text-neutral-600" strokeWidth={escala} opacity="0.3">
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

              {trazado && (
                <polyline
                  points={trazado}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth={3 * escala}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  // Discontinua: el trazo une ciudades en orden, no reproduce el
                  // camino real (que en media ruta fue por mar y no en recta).
                  strokeDasharray={`${10 * escala} ${6 * escala}`}
                  opacity="0.85"
                />
              )}

              {lugaresVisibles.map((lugar) => {
                const { x, y } = proyectar(lugar);
                const activo = seleccionado === lugar.id;
                return (
                  <g
                    key={lugar.id}
                    // Tras arrastrar el mapa, el marcador que quedaba debajo al
                    // soltar se seleccionaba solo: el `click` llega despues del
                    // `pointerup`. Se ignora si el gesto recorrio distancia.
                    onClick={() => {
                      if (huboArrastre()) return;
                      setSeleccionado(activo ? null : lugar.id);
                    }}
                    className="cursor-pointer"
                  >
                    {/*
                      Todo se multiplica por `escala`, que encoge al acercarse.
                      Así el marcador mide lo mismo EN PANTALLA a cualquier
                      aumento: uno se acerca al terreno, no a los iconos.
                    */}
                    <circle
                      cx={x}
                      cy={y}
                      r={(activo ? 8 : 5) * escala}
                      fill={COLOR_TIPO[lugar.tipo] ?? COLOR_TIPO.ciudad}
                      stroke="#fff"
                      strokeWidth={1.5 * escala}
                      opacity={lugar.incierto ? 0.55 : 1}
                    />
                    <text
                      x={x + 9 * escala}
                      y={y + 4 * escala}
                      fontSize={13 * escala}
                      // Halo del color del papel: sin él, un nombre sobre la
                      // línea de costa se pierde contra el contorno.
                      stroke="currentColor"
                      strokeWidth={3 * escala}
                      paintOrder="stroke"
                      className={`fill-neutral-800 text-[#e9e3d3] dark:fill-neutral-100 dark:text-[#111b14] ${activo ? "font-bold" : ""}`}
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

            {/* El pellizco basta en móvil, pero un botón visible es lo único
                que descubre quien no se atreve a probar gestos. */}
            <div className="absolute right-2 top-2 flex flex-col gap-1.5">
              <button type="button" onClick={() => acercarCentro(PASO)} aria-label={t("AtlasAcercar")} title={t("AtlasAcercar")} className={botonMapa}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button type="button" onClick={() => acercarCentro(1 / PASO)} aria-label={t("AtlasAlejar")} title={t("AtlasAlejar")} className={botonMapa}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <button type="button" onClick={reiniciar} disabled={!ampliado} aria-label={t("AtlasReiniciar")} title={t("AtlasReiniciar")} className={botonMapa}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 3v6h6M21 21v-6h-6" />
                  <path d="M21 9a9 9 0 0 0-15-3.7L3 9M3 15a9 9 0 0 0 15 3.7l3-3.7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Leyenda y aviso en letra pequeña: son datos de servicio y no deben
              competir con el mapa por la atención. */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {Object.entries(COLOR_TIPO).map(([tipo, color]) => (
              <span key={tipo} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }}></span>
                {t(`AtlasTipo_${tipo}`)}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-neutral-500 dark:text-neutral-400">{t("AtlasNotaMapa")}</p>

          {lugarActivo && (
            <div className="animate-fade-in mx-auto mt-3 max-w-md rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-sm font-bold">{nombreDe(lugarActivo)}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {lugarActivo.lat.toFixed(3)}°, {lugarActivo.lon.toFixed(3)}°
              </p>
              {lugarActivo.incierto && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t("AtlasUbicacionIncierta")}</p>}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mx-auto mt-3 max-w-xl text-center text-[11px] text-neutral-500 dark:text-neutral-400">{t("AtlasNotaFechas")}</p>

          <ol className="mx-auto mt-4 flex max-w-2xl flex-col">
            {eventosVisibles.map((evento) => (
              <li key={evento.id} className="flex gap-3">
                {/*
                  En escritorio el año va en su propia columna, alineado contra
                  el hilo. En móvil esa columna se comía un tercio del ancho
                  para cinco caracteres, así que ahí el año pasa a ser una
                  etiqueta encima del texto.
                */}
                <div className="hidden w-24 shrink-0 justify-end pt-0.5 sm:flex">
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
                  <span className="mb-0.5 block text-[11px] font-bold tabular-nums text-amber-700 dark:text-purple-300 sm:hidden">
                    {evento.aproximada ? "c. " : ""}
                    {formatearAnio(evento.anio, idioma)}
                  </span>
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
        </>
      )}
    </div>
  );
};

export default Atlas;
