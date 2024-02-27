import { useState, useEffect } from "react";
import HEBREO from "../assets/strongs/IndexHebrew.json";

const INITIAL_RESULTS = 10;
const INCREMENT = 10;

const TabHebrew = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleResults, setVisibleResults] = useState(INITIAL_RESULTS);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearchTermChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);

    clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        performSearch(term);
      }, 150)
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
      }, 150);

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

  return (
    <>
      <input
        className="text-black mb-3 dark:text-white px-4 py-2 rounded-md w-full bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 "
        type="text"
        value={searchTerm}
        onChange={handleSearchTermChange}
        placeholder="Buscar en hebreo..."
      />
      {isLoading ? (
        <div>Cargando...</div>
      ) : (
        <div>
          {filteredResults.map((result) => (
            <div className="bg-neutral-100 dark:bg-neutral-700 p-2 m-1" key={result.id}>
              <p>Lexema: {result.le} </p>
              <p>Pronunciacón: {result.pl} </p>
            </div>
          ))}
          {filteredResults.length < INITIAL_RESULTS ? null : (
            <div className="flex justify-center m-auto mt-4">
              <button
                className="text-center bg-blue-300 dark:bg-blue-700 px-5 py-2 rounded-lg"
                onClick={handleLoadMore}
              >
                Cargar más...
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TabHebrew;
