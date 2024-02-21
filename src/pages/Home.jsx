import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext";

const Home = () => {
  const { paginaInicio } = useContext(DataContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (paginaInicio === "/compare") {
      navigate("/compare");
    }
  }, [paginaInicio, navigate]);

  return <div>Home</div>;
};

export default Home;
