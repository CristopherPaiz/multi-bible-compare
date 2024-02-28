import { useState, useEffect, useContext } from "react";
import GRIEGO from "../assets/strongs/IndexGreek.json";
import LanguageContext from "../context/LanguageContext";

var INITIAL_RESULTS = 10;
var INCREMENT = 30;

const TabGreek = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleResults, setVisibleResults] = useState(INITIAL_RESULTS);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(true);

  const { t } = useContext(LanguageContext);

  const handleSearchTermChange = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        performSearch(term);
      }, 200)
    );
  };

  const performSearch = (term) => {
    setIsLoading(true);

    if (term === "") {
      setFilteredResults(GRIEGO.slice(0, visibleResults));
      setIsLoading(false);
    } else {
      setFilteredResults([]);
      setIsLoading(true);

      const normalizedSearchTerm = term
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      const searchTimeout = setTimeout(() => {
        const results = GRIEGO.filter((item) => {
          const leNormalized = item.le
            ?.normalize("NFD")
            ?.replace(/[\u0300-\u036f]/g, "")
            ?.toLowerCase();
          const plNormalized = item.pl
            ?.normalize("NFD")
            ?.replace(/[\u0300-\u036f]/g, "")
            ?.toLowerCase();
          const idNormalized = item.id.toLowerCase();
          return (
            leNormalized?.includes(normalizedSearchTerm) ||
            plNormalized?.includes(normalizedSearchTerm) ||
            idNormalized?.includes(normalizedSearchTerm)
          );
        });

        setFilteredResults(results.slice(0, visibleResults));
        setIsLoading(false);
      }, 200);

      setSearchTimeout(searchTimeout);
    }
  };

  const handleLoadMore = () => {
    if (searchTerm === "") {
      setVisibleResults((prev) => prev + INCREMENT);
    } else {
      const results = GRIEGO.filter((item) => {
        const leNormalized = item.le
          ?.normalize("NFD")
          ?.replace(/[\u0300-\u036f]/g, "")
          ?.toLowerCase();
        const plNormalized = item.pl
          ?.normalize("NFD")
          ?.replace(/[\u0300-\u036f]/g, "")
          ?.toLowerCase();
        const idNormalized = item.id.toLowerCase();
        return (
          leNormalized?.includes(searchTerm) || plNormalized?.includes(searchTerm) || idNormalized?.includes(searchTerm)
        );
      });

      const startIndex = visibleResults;
      const endIndex = visibleResults + INCREMENT;
      setFilteredResults((prevResults) => [...prevResults, ...results.slice(startIndex, endIndex)]);
      setVisibleResults(endIndex);

      if (results.length <= endIndex) {
        setShowLoadMoreButton(false);
      }
    }
  };

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredResults(GRIEGO.slice(0, visibleResults));
    } else {
      const results = GRIEGO.filter((item) => {
        const leNormalized = item.le
          ?.normalize("NFD")
          ?.replace(/[\u0300-\u036f]/g, "")
          ?.toLowerCase();
        const plNormalized = item.pl
          ?.normalize("NFD")
          ?.replace(/[\u0300-\u036f]/g, "")
          ?.toLowerCase();
        const idNormalized = item.id.toLowerCase();

        return (
          leNormalized?.includes(searchTerm) || plNormalized?.includes(searchTerm) || idNormalized?.includes(searchTerm)
        );
      });
      setFilteredResults(results.slice(0, visibleResults));
    }
  }, [searchTerm, visibleResults]);

  useEffect(() => {
    if (searchTerm === "") {
      return;
    } else {
      setShowLoadMoreButton(true);
      setVisibleResults(INITIAL_RESULTS);
    }
  }, [searchTerm]);

  return (
    <>
      <div className="sticky -top-2 backdrop-blur-md flex-1 pt-3 -mt-3 h-20 flex justify-center items-center">
        <input
          className="text-black mb-3 dark:text-white px-4 py-2 rounded-md w-[100%] bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 "
          type="text"
          value={searchTerm}
          onChange={handleSearchTermChange}
          placeholder={t("PlaceholderInputStrongGriego")}
        />
      </div>
      {isLoading ? (
        <div className="h-full min-h-full w-full flex flex-col justify-center items-center m-auto">
          <span className="h-full min-h-full   w-full">{t("Cargando")}</span>
        </div>
      ) : filteredResults.length > 0 ? (
        <>
          {filteredResults.map((result) => (
            <button
              className="bg-neutral-100 flex dark:bg-neutral-700 p-3 my-1 rounded-lg w-full text-left cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors duration-200 focus:outline-none focus:ring focus:ring-blue-400 dark:focus:ring-blue-400"
              key={result.id}
            >
              <span className="w-14 dark:text-cyan-300">{result.id} </span>
              <span className="flex-1 flex-nowrap text-ellipsis">{result.pl} </span>
              <span className="w-20 text-right text-sm dark:text-pink-200">{result.le} </span>
            </button>
          ))}
          {filteredResults.length < INITIAL_RESULTS ? null : (
            <div className="flex justify-center m-auto mt-4">
              {showLoadMoreButton && (
                <button
                  className="text-center bg-blue-300 dark:bg-blue-700 px-5 py-2 rounded-lg"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {t("CargarMas")}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div>{t("NoResultados")}</div>
      )}
    </>
  );
};

export default TabGreek;
