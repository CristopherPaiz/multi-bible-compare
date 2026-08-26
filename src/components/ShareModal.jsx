import { useContext, useState, useEffect, useRef, useMemo } from "react";
import { toPng } from "html-to-image";
import LanguageContext from "../context/LanguageContext";
import COLORS from "../assets/colors.json";
import DataContext from "../context/DataContext";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";
import { useBloquearScroll } from "../hooks/useBloquearScroll";

/** Colores de texto, con nombre para el `aria-label`. */
const COLORES_TEXTO = [
  { valor: "#111827", clave: "negro" },
  { valor: "#ffffff", clave: "blanco" },
  { valor: "#fde047", clave: "amarillo" },
  { valor: "#60a5fa", clave: "azul" },
  { valor: "#4ade80", clave: "verde" },
  { valor: "#f87171", clave: "rojo" },
  { valor: "#c084fc", clave: "morado" },
  { valor: "#9ca3af", clave: "gris" },
  { valor: "#fb923c", clave: "naranja" },
  { valor: "#f9a8d4", clave: "rosa" },
  { valor: "#a16207", clave: "cafe" },
];

/**
 * Tipografías. Todas son del SISTEMA: nada que descargar, así que la tarjeta se
 * genera igual sin conexión y no depende de ningún CDN.
 *
 * Cada entrada es una pila con alternativas para Windows, macOS/iOS, Android y
 * Linux, y termina en una familia genérica para que nunca quede sin fuente.
 */
const TIPOGRAFIAS = [
  { clave: "serif", etiqueta: "Serif", pila: "Georgia, 'Times New Roman', 'Noto Serif', serif" },
  { clave: "clasica", etiqueta: "Clásica", pila: "'Palatino Linotype', Palatino, 'Book Antiqua', 'URW Palladio L', Georgia, serif" },
  { clave: "sans", etiqueta: "Sans", pila: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  { clave: "redonda", etiqueta: "Redonda", pila: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', Verdana, sans-serif" },
  { clave: "titular", etiqueta: "Titular", pila: "'Arial Black', 'Arial Bold', Impact, 'Haettenschweiler', sans-serif" },
  { clave: "maquina", etiqueta: "Máquina", pila: "ui-monospace, 'Cascadia Mono', Consolas, 'DejaVu Sans Mono', 'Courier New', monospace" },
];

/** Proporciones de la tarjeta. Cuadrado va bien en casi cualquier red. */
const FORMATOS = [
  { clave: "cuadrado", ratio: 1, etiqueta: "1:1" },
  { clave: "vertical", ratio: 4 / 5, etiqueta: "4:5" },
  { clave: "historia", ratio: 9 / 16, etiqueta: "9:16" },
];

const ShareModal = () => {
  const {
    setCompartir,
    compartir,
    textoCompartir,
    textoCompartirTraducido,
    versiculoCompartir,
    nombreBibliaCompartir,
    libroSeleccionado,
    capituloSeleccionadoNumero,
  } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  useHistoryBlocker(compartir, () => setCompartir(false));
  useBloquearScroll(compartir);

  const fondos = useMemo(() => Object.values(COLORS), []);

  const [fondo, setFondo] = useState(fondos[0]);
  const [colorTexto, setColorTexto] = useState(COLORES_TEXTO[1].valor);
  const [formato, setFormato] = useState(FORMATOS[0]);
  const [tipografia, setTipografia] = useState(TIPOGRAFIAS[0]);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // Solo aplica si el usuario tradujo el versículo antes de compartir.
  const [usarTraducido, setUsarTraducido] = useState(false);

  const hayTraduccion = Boolean(textoCompartirTraducido);

  // Al abrir con una traducción disponible se ofrece esa por defecto: si el
  // usuario se tomó el trabajo de traducir, es lo que quiere compartir.
  useEffect(() => {
    if (compartir) setUsarTraducido(Boolean(textoCompartirTraducido));
  }, [compartir, textoCompartirTraducido]);

  const modalRef = useRef(null);
  const tarjetaRef = useRef(null);

  useEffect(() => {
    if (!compartir) return;
    const alTocarFuera = (evento) => {
      if (modalRef.current && !modalRef.current.contains(evento.target)) setCompartir(false);
    };
    const alPresionarEscape = (evento) => {
      if (evento.key === "Escape") setCompartir(false);
    };
    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alPresionarEscape);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alPresionarEscape);
    };
  }, [compartir, setCompartir]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(id);
  }, [aviso]);

  // El texto ya viene limpio de marcado desde el contexto.
  const versiculoOriginal = (textoCompartir?.[versiculoCompartir] ?? "").trim();
  const versiculo = (usarTraducido && hayTraduccion ? textoCompartirTraducido : versiculoOriginal).trim();
  const nombreBiblia = (nombreBibliaCompartir.split("-")[1] ?? nombreBibliaCompartir).replace("ccc", "cc").trim();
  const referencia = `${t(libroSeleccionado)} ${capituloSeleccionadoNumero}:${versiculoCompartir}`;

  /**
   * Tamaño de letra por longitud, en `cqw` (porcentaje del ANCHO del contenedor).
   * Antes eran píxeles fijos, así que la tarjeta se veía bien en móvil y con
   * letra minúscula en escritorio. Con unidades de contenedor escala sola.
   */
  /**
   * Tamaño que hace que el versículo QUEPA entero. Es el punto de partida y el
   * 100% del deslizador: la tarjeta nunca se abre con texto cortado.
   */
  const tamanoAjustado = useMemo(() => {
    const largo = versiculo.length;
    if (largo > 520) return 3.1;
    if (largo > 380) return 3.6;
    if (largo > 260) return 4.2;
    if (largo > 150) return 5;
    if (largo > 70) return 6;
    return 7.2;
  }, [versiculo]);

  // Multiplicador del deslizador. 1 = el tamaño que cabe; por encima el usuario
  // agranda a sabiendas de que puede recortarse.
  const [escala, setEscala] = useState(1);

  // Al cambiar de texto (original/traducido) se vuelve al tamaño que cabe.
  useEffect(() => {
    setEscala(1);
  }, [versiculo, formato]);

  const tamanoTexto = tamanoAjustado * escala;
  const seDesborda = escala > 1;

  const textoParaCopiar = `"${versiculo}"\n\n${referencia} — ${nombreBiblia}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoParaCopiar);
      setAviso({ tipo: "ok", texto: t("CompartirCopiado") });
      return;
    } catch {
      // `navigator.clipboard` falla si el documento no tiene el foco, si el
      // contexto no es seguro (http) o en navegadores viejos. Se cae al método
      // clásico antes de dar el error por perdido.
    }
    try {
      const area = document.createElement("textarea");
      area.value = textoParaCopiar;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      setAviso(ok ? { tipo: "ok", texto: t("CompartirCopiado") } : { tipo: "error", texto: t("CompartirErrorCopiar") });
    } catch {
      setAviso({ tipo: "error", texto: t("CompartirErrorCopiar") });
    }
  };

  const descargar = async () => {
    if (!tarjetaRef.current) return;
    setGuardando(true);
    try {
      // PNG y `pixelRatio: 2`: el JPEG anterior salía a la resolución exacta de
      // pantalla, así que la imagen compartida se veía borrosa.
      const dataUrl = await toPng(tarjetaRef.current, { cacheBust: true, pixelRatio: 2 });
      const enlace = document.createElement("a");
      enlace.download = `${t(libroSeleccionado)}-${capituloSeleccionadoNumero}.${versiculoCompartir}.png`;
      enlace.href = dataUrl;
      enlace.click();
      setAviso({ tipo: "ok", texto: t("CompartirGuardado") });
    } catch (error) {
      console.error("No se pudo generar la imagen:", error);
      setAviso({ tipo: "error", texto: t("CompartirErrorGuardar") });
    } finally {
      setGuardando(false);
    }
  };

  if (!compartir) return null;

  const swatch =
    "h-9 w-9 shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-white/50 hover:ring-offset-2 hover:ring-offset-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-900";
  /*
 * Anillo EXTERIOR: se ve mejor cuál está elegido que uno interior. Se dibuja
 * 4px por fuera del círculo (2 de hueco + 2 de anillo), así que los
 * contenedores llevan `p-2` y `gap-3` para que nunca lo recorte el overflow.
 * Tampoco se escala el círculo, que era lo que lo empujaba fuera del hueco.
 */
const seleccionado = "ring-2 ring-white ring-offset-2 ring-offset-neutral-900";

  return (
    <div className="fixed inset-0 z-[99999999999] flex items-center justify-center bg-black/85 p-3 sm:p-6" role="dialog" aria-modal="true">
      <div
        ref={modalRef}
        className="relative flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-2xl lg:max-w-4xl lg:flex-row"
      >
        {/* ---------------- Vista previa ---------------- */}
        <div className="flex shrink-0 items-center justify-center bg-neutral-950/60 p-4 lg:w-1/2 lg:p-6">
          {/*
            El tope se calcula sobre el ALTO disponible, no solo el ancho: con
            `maxWidth: 62dvh` fijo, el formato 9:16 crecía a 711px de alto
            dentro de una columna de 500 y se salía. Multiplicando por la
            proporción, la altura resultante se mantiene constante y es el ancho
            el que se encoge en los formatos verticales.
          */}
          <div
            className="w-full"
            style={{ maxWidth: `min(100%, ${(62 * formato.ratio).toFixed(1)}dvh)`, containerType: "inline-size" }}
          >
            <div
              ref={tarjetaRef}
              style={{
                backgroundImage: fondo,
                color: colorTexto,
                aspectRatio: String(formato.ratio),
              }}
              className="flex w-full flex-col justify-between rounded-xl p-[7cqw]"
            >
              <div className="text-left">
                <p className="text-[3.2cqw] font-semibold uppercase tracking-[0.18em] opacity-80">{nombreBiblia}</p>
              </div>

              {/* `min-h-0` + `overflow-hidden`: sin ellos un versículo muy
                  largo empujaba el pie de la tarjeta fuera del recuadro. */}
              <blockquote className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-[2cqw] text-center">
                <p
                  style={{
                    fontSize: `${tamanoTexto.toFixed(2)}cqw`,
                    fontFamily: tipografia.pila,
                    // Con el deslizador por encima de 1 el texto puede no caber:
                    // se recorta con puntos suspensivos en vez de desbordar.
                    ...(seDesborda
                      ? { display: "-webkit-box", WebkitLineClamp: 99, WebkitBoxOrient: "vertical", overflow: "hidden" }
                      : {}),
                  }}
                  className="max-h-full text-balance leading-snug"
                >
                  <span className="opacity-50">“</span>
                  {versiculo}
                  <span className="opacity-50">”</span>
                </p>
              </blockquote>

              <div className="flex items-end justify-between gap-2">
                <p className="text-[3.6cqw] font-bold tracking-wide" style={{ fontFamily: tipografia.pila }}>{referencia}</p>
                <p className="text-[2.6cqw] font-medium opacity-60">Biblian</p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- Controles ---------------- */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-0 pt-4 lg:px-6 lg:pt-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{t("CompartirTitulo")}</h2>
              <p className="truncate text-xs text-neutral-400">{referencia}</p>
            </div>
            <button
              onClick={() => setCompartir(false)}
              aria-label={t("Cerrar")}
              className="shrink-0 rounded-full bg-neutral-800 px-3 py-1 text-lg leading-none text-neutral-300 hover:bg-neutral-700"
            >
              &times;
            </button>
          </div>

          {/*
            Todos los `fieldset` llevan `min-w-0`. Son hijos de un contenedor
            flex en columna, donde `min-width: auto` impide encoger por debajo
            del contenido: sin él, las tiras con scroll horizontal crecían más
            que el modal y quedaban recortadas en vez de poder desplazarse.
          */}
          {hayTraduccion && (
            <fieldset className="mb-4 min-w-0">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">{t("CompartirQueTexto")}</legend>
              <div className="flex gap-2">
                {[
                  { valor: false, etiqueta: t("CompartirOriginal") },
                  { valor: true, etiqueta: t("CompartirTraducido") },
                ].map((opcion) => (
                  <button
                    key={String(opcion.valor)}
                    onClick={() => setUsarTraducido(opcion.valor)}
                    aria-pressed={usarTraducido === opcion.valor}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      usarTraducido === opcion.valor ? "bg-white text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    {opcion.etiqueta}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="mb-4 min-w-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">{t("CompartirTipografia")}</legend>
            <div className="no-scrollbarVerse flex gap-2 overflow-x-auto pb-1">
              {TIPOGRAFIAS.map((f) => (
                <button
                  key={f.clave}
                  onClick={() => setTipografia(f)}
                  aria-pressed={tipografia.clave === f.clave}
                  style={{ fontFamily: f.pila }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    tipografia.clave === f.clave ? "bg-white text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4 min-w-0">
            <legend className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <span>{t("CompartirTamanoTexto")}</span>
              <span className="tabular-nums text-neutral-500">{Math.round(escala * 100)}%</span>
            </legend>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500" aria-hidden="true">A</span>
              <input
                type="range"
                min="0.6"
                max="2"
                step="0.05"
                value={escala}
                onChange={(e) => setEscala(Number(e.target.value))}
                aria-label={t("CompartirTamanoTexto")}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-white"
              />
              <span className="text-lg text-neutral-500" aria-hidden="true">A</span>
              {escala !== 1 && (
                <button
                  onClick={() => setEscala(1)}
                  className="rounded px-2 py-1 text-[10px] font-semibold text-neutral-300 hover:bg-neutral-800"
                >
                  {t("CompartirAjustar")}
                </button>
              )}
            </div>
          </fieldset>

          <fieldset className="mb-4 min-w-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">{t("CompartirFormato")}</legend>
            <div className="flex gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f.clave}
                  onClick={() => setFormato(f)}
                  aria-pressed={formato.clave === f.clave}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    formato.clave === f.clave ? "bg-white text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4 min-w-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">{t("CompartirFondo")}</legend>
            {/* Tira con scroll en móvil, rejilla en escritorio: son 169 fondos y
                en pantalla ancha sobra sitio para verlos de golpe. */}
            <div className="no-scrollbarVerse flex gap-3 overflow-x-auto p-2 overscroll-contain lg:grid lg:max-h-44 lg:grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] lg:place-items-center lg:gap-3 lg:overflow-y-auto">
              {fondos.map((color, indice) => (
                <button
                  key={indice}
                  onClick={() => setFondo(color)}
                  aria-label={`${t("CompartirFondo")} ${indice + 1}`}
                  aria-pressed={fondo === color}
                  style={{ backgroundImage: color }}
                  className={`${swatch} ${fondo === color ? seleccionado : ""}`}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-5 min-w-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">{t("CompartirColorTexto")}</legend>
            <div className="no-scrollbarVerse flex gap-3 overflow-x-auto p-2">
              {COLORES_TEXTO.map((c) => (
                <button
                  key={c.valor}
                  onClick={() => setColorTexto(c.valor)}
                  aria-label={c.clave}
                  aria-pressed={colorTexto === c.valor}
                  style={{ background: c.valor, border: "1px solid rgba(255,255,255,0.25)" }}
                  className={`${swatch} ${colorTexto === c.valor ? seleccionado : ""}`}
                />
              ))}
            </div>
          </fieldset>

          {/*
            Pegados abajo: en móvil la columna de controles hace scroll interno
            y las acciones principales caían fuera de la pantalla (medido: y=899
            en un viewport de 873). Así siempre se alcanzan sin buscar.
          */}
          <div className="sticky bottom-0 -mx-4 mt-auto flex flex-row gap-2 border-t border-neutral-800 bg-neutral-900 px-4 pb-4 pt-3 lg:-mx-6 lg:px-6">
            <button
              onClick={descargar}
              disabled={guardando}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {guardando ? t("CompartirGuardando") : t("CompartirDescargar")}
            </button>
            <button
              onClick={copiar}
              className="flex-1 rounded-lg bg-neutral-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-600"
            >
              {t("CompartirCopiar")}
            </button>
          </div>

          {aviso && (
            <p
              role="status"
              className={`sticky bottom-0 -mx-4 mt-2 rounded-lg px-3 py-2 text-center text-xs lg:-mx-6 ${
                aviso.tipo === "ok" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
              }`}
            >
              {aviso.texto}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
