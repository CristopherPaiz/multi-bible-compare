import { useState, useEffect, useContext } from "react";
import HEBREO from "../assets/strongs/IndexHebrew.json";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";

var INITIAL_RESULTS = 10;
var INCREMENT = 30;

const TabGreek = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleResults, setVisibleResults] = useState(INITIAL_RESULTS);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(true);

  const { t } = useContext(LanguageContext);
  const { setStrong } = useContext(DataContext);

  const handleSearchTermChange = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    performSearch(term);
  };

  const performSearch = (term) => {
    setIsLoading(true);
    if (term === "") {
      setFilteredResults(HEBREO.slice(0, visibleResults));
      setIsLoading(false);
    } else {
      setTimeout(() => {
        setFilteredResults([]);
        setIsLoading(true);

        const normalizedSearchTerm = term
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

        const results = HEBREO.filter((item) => {
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
      }, 350);
    }
  };

  const handleLoadMore = () => {
    if (searchTerm === "") {
      setVisibleResults((prev) => prev + INCREMENT);
    } else {
      const results = HEBREO.filter((item) => {
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
      setFilteredResults(HEBREO.slice(0, visibleResults));
    }
  }, [visibleResults, searchTerm]);

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
      <div className="sticky -top-2 backdrop-blur-3xl flex-1 pt-3 -mt-3 h-20 flex justify-center items-center z-10 mb-3">
        <div className="relative rounded-lg w-64 overflow-hidden  before:absolute before:w-12 before:h-12 before:content[''] before:right-0 before:bg-yellow-100 dark:before:bg-yellow-900 before:rounded-full before:blur-lg  after:absolute after:-z-10 after:w-20 after:h-20 after:content[''] after:bg-purple-100  dark:after:bg-purple-900 after:right-12 after:top-3 after:rounded-full after:blur-lg">
          <input
            className="relative bg-transparent ring-0 outline-none border border-yellow-700 dark:border-purple-300 text-neutral-900 dark:text-neutral-100 placeholder-yellow-700 dark:placeholder-violet-300 text-sm rounded-lg focus:ring-yellow-500 dark:focus:ring-purple-500 placeholder-opacity-60 focus:border-yellow-500 dark:focus:border-purple-500  block w-full p-4 checked:bg-emerald-500"
            type="text"
            value={searchTerm}
            onChange={handleSearchTermChange}
            placeholder={t("PlaceholderInputStrongHebreo")}
          />
        </div>
      </div>
      {isLoading ? (
        <div className="h-full min-h-full w-full flex flex-col justify-center items-center m-auto">
          <span className="h-full min-h-full   w-full">{t("Cargando")}</span>
        </div>
      ) : filteredResults.length > 0 ? (
        <>
          {filteredResults.map((result) => (
            <button
              className="w-full relative my-[10px] hover:scale-110 sm:hover:scale-105"
              key={result.id}
              onClick={() => setStrong(result.id)}
            >
              <div className="relative flex justify-center">
                <div className="w-full h-[46px] rounded-2xl flex justify-between px-2 items-center bg-slate-100 bg-gradient-to-r from-violet-300 to-yellow-200 dark:bg-gradient-to-r dark:from-purple-800 dark:to-yellow-800">
                  <span className="text-center w-[50px]">{result.id}</span>
                  <span className="w-[50px] min-w-[50px] text-center text-sm pl-1 text-wrap p-1 text-ellipsis overflow-hidden dark:text-pink-200">
                    {result.le}
                  </span>
                </div>
                <div className="absolute flex px-2 items-center top-0 h-[50px] -my-[2px] rounded-2xl mr-[5px] sm:mr-[20px] bg-white border border-neutral-400 dark:border-white dark:bg-[#1c0330] w-[calc(100%-120px)] sm:w-[calc(100%-150px)]">
                  <span className="flex-1 overflow-hidden text-ellipsis text-wrap">{result.pl} </span>
                </div>
              </div>
            </button>
          ))}
          {filteredResults.length < INITIAL_RESULTS ? null : (
            <div className="flex justify-center m-auto mt-4">
              {showLoadMoreButton && (
                <button
                  className="text-center bg-yellow-400 dark:bg-purple-600 px-10 py-2 rounded-xl"
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
