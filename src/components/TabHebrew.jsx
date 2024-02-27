import { useState, useEffect } from "react";
import HEBREO from "../assets/strongs/IndexHebrew.json";

var INITIAL_RESULTS = 10;
var INCREMENT = 30;

const TabHebrew = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleResults, setVisibleResults] = useState(INITIAL_RESULTS);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(true);

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
      setFilteredResults(HEBREO.slice(0, visibleResults));
      setIsLoading(false);
    } else {
      setFilteredResults([]);
      setIsLoading(true);

      const normalizedSearchTerm = term
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      const searchTimeout = setTimeout(() => {
        const results = HEBREO.filter((item) => {
          const leNormalized = item.le
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          const plNormalized = item.pl
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          return leNormalized.includes(normalizedSearchTerm) || plNormalized.includes(normalizedSearchTerm);
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
      const results = HEBREO.filter((item) => {
        const leNormalized = item.le
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const plNormalized = item.pl
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return leNormalized.includes(searchTerm) || plNormalized.includes(searchTerm);
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
    } else {
      const results = HEBREO.filter((item) => {
        const leNormalized = item.le
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const plNormalized = item.pl
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return leNormalized.includes(searchTerm) || plNormalized.includes(searchTerm);
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
      <div
        id="busqueda"
        className="sticky -top-2 dark:bg-gray-800 flex-1 pt-3 -mt-3 h-20 flex justify-center items-center"
      >
        <input
          className="text-black mb-3 dark:text-white px-4 py-2 rounded-md w-[100%] bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 "
          type="text"
          value={searchTerm}
          onChange={handleSearchTermChange}
          placeholder="Buscar en hebreo..."
        />
      </div>
      {isLoading ? (
        <div>Cargando...</div>
      ) : filteredResults.length > 0 ? (
        <>
          {filteredResults.map((result) => (
            <div className="bg-neutral-100 dark:bg-neutral-700 p-2 m-1" key={result.id}>
              <p>Lexema: {result.le} </p>
              <p>Pronunciacón: {result.pl} </p>
            </div>
          ))}
          {filteredResults.length < INITIAL_RESULTS ? null : (
            <div className="flex justify-center m-auto mt-4">
              {showLoadMoreButton && (
                <button
                  className="text-center bg-blue-300 dark:bg-blue-700 px-5 py-2 rounded-lg"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  Cargar más...
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div>No se encontraron resultados</div>
      )}
    </>
  );
};

export default TabHebrew;
