import History from "../components/History";
import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext";

const HistoryPage = () => {
  const { versiculoSeleccionadoNumero, setHistory } = useContext(DataContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (versiculoSeleccionadoNumero === 0) {
      navigate("/compare");
    }
  }, [versiculoSeleccionadoNumero, navigate]);

  useEffect(() => {
    // Recuperar historial del LocalStorage al montar el componente
    const storedHistory = localStorage.getItem("history");
    if (storedHistory) {
      const parsedHistory = JSON.parse(storedHistory);
      setHistory(parsedHistory);
    }
  }, [setHistory]);

  return (
    <>
      <History />
    </>
  );
};

export default HistoryPage;
