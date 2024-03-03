import { useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import DataContext from "../context/DataContext";
import BG from "/bibleBackground.webp";
import LanguageContext from "../context/LanguageContext";

const Home = () => {
  const { paginaInicio } = useContext(DataContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (paginaInicio === "/compare") {
      navigate("/compare");
    }
  }, [paginaInicio, navigate]);

  return (
    <div className="mt-6 p-8 flex-col flex items-center justify-center text-white mb-6">
      <div
        className="animate-fade-in"
        style={{
          position: "fixed",
          zIndex: -5,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.3))",
        }}
      ></div>
      <img src={BG} className="animate-fade-in fixed -z-20 object-cover h-full sm:h-auto sm:w-full bottom-0" />
      <article className="animate-fade-in sm:max-w-[600px] px-4 flex flex-col justify-center items-center">
        <h1 className="mt-10 sm:mt-4 text-7xl sm:text-8xl font-bold text-center mb-2">Biblian</h1>
        <p className="text-center font-bold sm:font-extrabold w-[260px] sm:w-[320px] mb-12">{t("Compara")}</p>
        <p className="text-center text-balance">{t("PS_parrafo1")}</p>
        <p className="text-center text-balance mb-12">{t("PS_parrafo2")}</p>
        <Link
          to="/compare"
          className="bg-[#a97109] hover:bg-[#634b1d] dark:bg-purple-500 dark:hover:bg-purple-700 text-white font-bold py-3 px-5 rounded-md w-[150px] m-auto text-center"
        >
          {t("Empezar")}
        </Link>
      </article>
    </div>
  );
};

export default Home;
