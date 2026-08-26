import { useContext, useState, useMemo } from "react";
import LanguageContext from "../context/LanguageContext";
import { BEBLIA_INFO, BIBLIAS_ATRIBUCION } from "../data/colaboradores";
import { CARACTERISTICAS_POR_BIBLIA, MAPA_CARACTERISTICAS } from "../data/biblias";

const About = () => {
  const { t } = useContext(LanguageContext);
  const [busqueda, setBusqueda] = useState("");
  const [idiomaSeleccionado, setIdiomaSeleccionado] = useState("Todos");

  const idiomasDisponibles = useMemo(() => {
    return ["Todos", ...Object.keys(BIBLIAS_ATRIBUCION)];
  }, []);

  const totalVersiones = useMemo(() => {
    return Object.values(BIBLIAS_ATRIBUCION).reduce((acc, curr) => acc + curr.length, 0);
  }, []);

  const versionesFiltradas = useMemo(() => {
    const query = busqueda.toLowerCase().trim();
    const resultado = {};

    for (const [idioma, lista] of Object.entries(BIBLIAS_ATRIBUCION)) {
      if (idiomaSeleccionado !== "Todos" && idioma !== idiomaSeleccionado) continue;

      const filtradas = lista.filter((item) => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.language.toLowerCase().includes(query) ||
          item.info.toLowerCase().includes(query)
        );
      });

      if (filtradas.length > 0) {
        resultado[idioma] = filtradas;
      }
    }

    return resultado;
  }, [busqueda, idiomaSeleccionado]);

  return (
    <div className="w-full overflow-hidden pb-16">
      <article className="animate-fade-in px-4 sm:px-6 py-3 justify-center w-[99%] sm:w-[850px] m-auto">
        <h1 className="text-2xl sm:text-3xl font-bold flex justify-center text-center mt-7 dark:text-white">
          {t("SobreProyecto")}
        </h1>

        <div className="mt-4 dark:text-white text-center text-sm sm:text-balance">
          {t("InfoSobreProyecto")}:
          <a
            href="https://github.com/CristopherPaiz"
            target="_blank"
            rel="noreferrer"
            style={{ fontWeight: "700", fontSize: 20 }}
            className="text-emerald-500 dark:text-emerald-400 flex flex-row gap-1 items-center justify-center mt-2 hover:underline"
          >
            {t("CristopherPaiz")}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
              <path d="M11 13l9 -9" />
              <path d="M15 4h5v5" />
            </svg>
          </a>
        </div>

        <p className="mt-4 dark:text-white text-left sm:text-center text-sm sm:text-balance leading-relaxed">
          {t("InfoSobreProyectoDos")}{" "}
          <a
            href="https://github.com/CristopherPaiz/multi-bible-compare"
            className="text-blue-500 dark:text-blue-400 font-semibold hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Multi Bible Compare
          </a>
          . {t("InfoSobreProyectoTres")}
        </p>
        <p className="mt-3 dark:text-gray-300 text-left sm:text-center text-sm sm:text-balance">
          {t("MasInfoSobreProyeto")}
        </p>

        {/* Disclaimer */}
        <div className="w-full m-auto px-4 py-5 bg-amber-500/15 border border-amber-500/30 rounded-xl overflow-hidden mt-6 shadow-sm">
          <h2 className="text-center text-lg font-bold mb-2 text-amber-900 dark:text-amber-300">DISCLAIMER</h2>
          <p className="text-gray-800 dark:text-gray-200 text-justify text-xs leading-relaxed">
            {t("DisclaimerBiblia")}
          </p>
        </div>

        {/* Fuente Principal: Beblia */}
        <div className="w-full mt-8 p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                🏛️ {BEBLIA_INFO.nombre}
              </h3>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                {BEBLIA_INFO.descripcion}
              </p>
            </div>
            <a
              href={BEBLIA_INFO.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition whitespace-nowrap self-start sm:self-center shadow"
            >
              {t("RepositorioBeblia")}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>

        {/* Sección de Versiones Bíblicas */}
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
            <div>
              <h2 className="text-2xl font-bold dark:text-white">{t("Colaboradores")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("VersionesRegistradasDesc", { count: totalVersiones })}
              </p>
            </div>

            {/* Buscador de versiones */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder={t("BuscarVersionPlaceholder")}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full text-xs px-3 py-2 pl-8 rounded-lg bg-gray-100 dark:bg-neutral-800 dark:text-white border border-gray-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Filtro por idioma */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {idiomasDisponibles.map((idioma) => (
              <button
                key={idioma}
                onClick={() => setIdiomaSeleccionado(idioma)}
                className={`text-xs px-3 py-1 rounded-full transition font-medium ${
                  idiomaSeleccionado === idioma
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-neutral-700"
                }`}
              >
                {idioma === "Todos" ? t("TodosLosIdiomas") : idioma}
              </button>
            ))}
          </div>

          {/* Lista de Versiones Agrupadas */}
          <div className="mt-6 space-y-6">
            {Object.keys(versionesFiltradas).length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                {t("NoVersionesEncontradas")}
              </p>
            ) : (
              Object.entries(versionesFiltradas).map(([idioma, lista]) => (
                <div key={idioma} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                      {idioma}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-gray-400">
                      {lista.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lista.map((item) => {
                      const feats = CARACTERISTICAS_POR_BIBLIA[item.rawDir] || [];

                      return (
                        <div
                          key={item.rawDir}
                          className="p-3.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700/80 shadow-xs hover:border-gray-300 dark:hover:border-neutral-600 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">
                                {item.title}
                              </h4>
                              {item.tipo && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                    item.tipo.includes("Dominio Público") || item.tipo.includes("Public Domain")
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                                  }`}
                                >
                                  {item.tipo}
                                </span>
                              )}
                            </div>
                            {item.editorial && (
                              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                {item.editorial}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                              {item.info}
                            </p>

                            {feats.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-2">
                                {feats.map((featKey) => {
                                  const info = MAPA_CARACTERISTICAS[featKey];
                                  if (!info) return null;
                                  return (
                                    <span
                                      key={featKey}
                                      title={t(`Feat_${featKey}_desc`)}
                                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-medium ${info.clase}`}
                                    >
                                      <span>{info.icono}</span>
                                      <span>{t(`Feat_${featKey}`)}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {item.link && (
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-neutral-700/50">
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                {t("VerFuenteLicencia")}
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </article>
    </div>
  );
};

export default About;
