import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import AnotacionesContext from "../../context/AnotacionesContext";
import LanguageContext from "../../context/LanguageContext";

/**
 * Notas del versículo abierto.
 *
 * Varias notas por versículo y no una sola: un versículo estudiado dos veces
 * con seis meses de diferencia produce dos ideas distintas, y machacar la
 * primera con la segunda es perder trabajo del usuario. Cada una lleva su
 * fecha, así que se puede ver cuál es de cuándo.
 */
const PanelNotas = ({ bookId, capitulo, versiculo, referencia }) => {
  const { t } = useContext(LanguageContext);
  const { notasDe, agregarNota, editarNota, eliminarNota } = useContext(AnotacionesContext);

  const notas = notasDe(bookId, capitulo, versiculo);

  const [borrador, setBorrador] = useState("");
  const [editando, setEditando] = useState(null);
  const areaRef = useRef(null);

  // Al cambiar de versículo el borrador deja de tener sentido: era para otro
  // pasaje y guardarlo aquí lo pondría en el equivocado.
  useEffect(() => {
    setBorrador("");
    setEditando(null);
  }, [bookId, capitulo, versiculo]);

  useEffect(() => {
    areaRef.current?.focus();
  }, [editando]);

  const guardar = () => {
    const texto = borrador.trim();
    if (!texto) return;

    if (editando) editarNota(editando, texto);
    else agregarNota(bookId, capitulo, versiculo, texto);

    setBorrador("");
    setEditando(null);
  };

  const empezarEdicion = (nota) => {
    setEditando(nota.id);
    setBorrador(nota.texto);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{referencia}</p>

      <div className="flex flex-col gap-2">
        <textarea
          ref={areaRef}
          value={borrador}
          onChange={(evento) => setBorrador(evento.target.value)}
          onKeyDown={(evento) => {
            // Ctrl+Enter guarda: Enter a secas tiene que seguir haciendo salto
            // de línea, que en una nota de estudio se usa constantemente.
            if ((evento.ctrlKey || evento.metaKey) && evento.key === "Enter") {
              evento.preventDefault();
              guardar();
            }
          }}
          rows={3}
          maxLength={4000}
          placeholder={t("NotasPlaceholder")}
          className="w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-purple-400"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400">{t("NotasAtajoGuardar")}</span>
          <div className="flex gap-2">
            {editando && (
              <button
                type="button"
                onClick={() => {
                  setEditando(null);
                  setBorrador("");
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
              >
                {t("Cancelar")}
              </button>
            )}
            <button
              type="button"
              onClick={guardar}
              disabled={!borrador.trim()}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-40 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              {editando ? t("NotasActualizar") : t("NotasGuardar")}
            </button>
          </div>
        </div>
      </div>

      {notas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notas.map((nota) => (
            <li key={nota.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/60">
              <p className="whitespace-pre-wrap break-words text-sm text-neutral-800 dark:text-neutral-200">{nota.texto}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-neutral-400">{(nota.editadoEn ?? nota.creadoEn ?? "").slice(0, 10)}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => empezarEdicion(nota)}
                    className="rounded px-2 py-1 text-[11px] font-medium text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
                  >
                    {t("NotasEditar")}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarNota(nota.id)}
                    className="rounded px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {t("NotasEliminar")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

PanelNotas.propTypes = {
  bookId: PropTypes.number.isRequired,
  capitulo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  versiculo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  referencia: PropTypes.string.isRequired,
};

export default PanelNotas;
