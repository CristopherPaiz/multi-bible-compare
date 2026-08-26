import History from "../components/History";
import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext";

const HistoryPage = () => {
  const { versiculoSeleccionadoNumero } = useContext(DataContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (versiculoSeleccionadoNumero === 0) {
      navigate("/compare");
    }
  }, [versiculoSeleccionadoNumero, navigate]);

  return (
    <>
      <History />
    </>
  );
};

export default HistoryPage;
