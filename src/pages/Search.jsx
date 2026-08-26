import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { buscar, listarBiblias, LARGO_MINIMO } from "../services/searchSource";
import { getDataSource, onDataSourceChange, setDataSource, SOURCES } from "../config/dataSource";

const POR_PAGINA = 25;
const RETARDO_MS = 400;

const Search = () => {
  const { t } = useContext(LanguageContext);
  const { libros, setLibroSeleccionado, setCapituloSeleccionadoNumero, setVersiculoSeleccionadoNumero, bibliasSeleccionadas } =
    useContext(DataContext);
  const navigate = useNavigate();

  const [texto, setTexto] = useState("");
  const [termino, setTermino] = useState("");
  const [bibliaId, setBibliaId] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [resultados, setResultados] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [fuente, setFuente] = useState(getDataSource);
  useEffect(() => onDataSourceChange(setFuente), []);
  const disponible = fuente === SOURCES.TURSO;

  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // El SearchBar de la plantilla trae debounce; aquí se replica para no
  // disparar una consulta por tecla.
  useEffect(() => {
    const id = setTimeout(() => {
      setTermino(texto.trim());
      setPagina(1);
    }, RETARDO_MS);
    return () => clearTimeout(id);
  }, [texto]);

  // Catálogo de versiones para el selector. Se preselecciona la primera que el
  // usuario ya tenga elegida en Comparar, que es lo que probablemente lee.
  useEffect(() => {
    if (!disponible) return;
    const controller = new AbortController();

    listarBiblias({ signal: controller.signal })
      .then((lista) => {
        setCatalogo(lista);
        setBibliaId((actual) => {
          if (actual) return actual;
          const preferida = lista.find((b) => bibliasSeleccionadas?.includes(b.legacyPath));
          return preferida?.id ?? lista[0]?.id ?? null;
        });
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError(e.message);
      });

    return () => controller.abort();
  }, [disponible, bibliasSeleccionadas]);

  useEffect(() => {
    if (!disponible || termino.length < LARGO_MINIMO || !bibliaId) {
      setResultados(null);
      return;
    }

    const controller = new AbortController();
    setCargando(true);
    setError(null);

    buscar({ q: termino, bibles: [bibliaId], page: pagina, limit: POR_PAGINA, signal: controller.signal })
      .then(setResultados)
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e.message);
        setResultados(null);
      })
      .finally(() => setCargando(false));

    return () => controller.abort();
  }, [termino, bibliaId, pagina, disponible]);

  const nombreBiblia = useMemo(() => {
    const encontrada = catalogo.find((b) => b.id === bibliaId);
    return encontrada ? `${encontrada.name} (${encontrada.year ?? ""})` : "";
  }, [catalogo, bibliaId]);

  const irAlVersiculo = (hit) => {
    setLibroSeleccionado(`book${hit.bookId}`);
    setCapituloSeleccionadoNumero(hit.chapter);
    setVersiculoSeleccionadoNumero(hit.verse);
    navigate("/compare");
  };

  // --- La búsqueda no existe en el CDN: se explica en vez de fallar ---
  if (!disponible) {
    return (
      <div className="animate-fade-in mx-auto mt-10 w-11/12 max-w-lg rounded-lg bg-amber-100 p-5 text-center dark:bg-amber-900/40">
        <h1 className="mb-2 text-lg font-bold dark:text-white">{t("Buscar")}</h1>
        <p className="text-sm text-gray-800 dark:text-gray-200">{t("BuscarNoDisponible")}</p>
        <button
          onClick={() => setDataSource(SOURCES.TURSO)}
          className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("BuscarActivarApi")}
        </button>
      </div>
    );
  }

  const total = resultados?.pagination?.total ?? 0;
  const totalPaginas = resultados?.pagination?.totalPages ?? 0;

  return (
    <div className="animate-fade-in mx-auto mt-6 w-11/12 max-w-3xl pb-24">
      <h1 className="mb-4 text-center text-xl font-bold dark:text-white">{t("Buscar")}</h1>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("BuscarPlaceholder")}
          aria-label={t("Buscar")}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-neutral-800 dark:text-white"
        />
        <select
          value={bibliaId ?? ""}
          onChange={(e) => {
            setBibliaId(Number(e.target.value));
            setPagina(1);
          }}
          aria-label={t("FuenteDatos")}
          className="min-w-0 rounded-md border border-gray-300 px-2 py-2 text-sm sm:max-w-[16rem] dark:border-gray-600 dark:bg-neutral-800 dark:text-white"
        >
          {catalogo.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.year ? `(${b.year})` : ""}
            </option>
          ))}
        </select>
      </div>

      {texto.trim().length > 0 && texto.trim().length < LARGO_MINIMO && (
        <p className="mt-3 text-center text-xs text-gray-600 dark:text-gray-400">{t("BuscarMinimo", { min: LARGO_MINIMO })}</p>
      )}

      {error && <p className="mt-4 rounded-md bg-red-100 p-3 text-center text-sm text-red-800 dark:bg-red-900/40 dark:text-red-200">{error}</p>}

      {cargando && (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-gray-200 dark:bg-neutral-700"></div>
          ))}
        </div>
      )}

      {!cargando && resultados && (
        <>
          <p className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
            {t("BuscarResultados", { total, biblia: nombreBiblia })}
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {resultados.data.map((hit) => (
              <li key={`${hit.bibleId}-${hit.bookId}-${hit.chapter}-${hit.verse}`}>
                <button
                  onClick={() => irAlVersiculo(hit)}
                  className="w-full rounded-md bg-white p-3 text-left shadow-sm transition hover:bg-amber-50 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  <span className="block text-xs font-bold text-amber-700 dark:text-amber-400">
                    {libros?.[`book${hit.bookId}`] ?? `Libro ${hit.bookId}`} {hit.chapter}:{hit.verse}
                  </span>
                  <span
                    className="mt-1 block text-sm text-gray-800 dark:text-gray-200 [&_mark]:bg-amber-300 [&_mark]:text-black dark:[&_mark]:bg-amber-500"
                    dangerouslySetInnerHTML={{ __html: hit.snippet }}
                  ></span>
                </button>
              </li>
            ))}
          </ul>

          {total === 0 && <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">{t("BuscarSinResultados")}</p>}

          {totalPaginas > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="rounded-md bg-gray-200 px-3 py-1 text-sm disabled:opacity-40 dark:bg-neutral-700 dark:text-white"
              >
                {t("BuscarAnterior")}
              </button>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {pagina} / {totalPaginas}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
                className="rounded-md bg-gray-200 px-3 py-1 text-sm disabled:opacity-40 dark:bg-neutral-700 dark:text-white"
              >
                {t("BuscarSiguiente")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Search;
