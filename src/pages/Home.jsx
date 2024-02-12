import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";

const Home = () => {
  const { idiomaNavegador, t, cambiarIdioma } = useContext(LanguageContext);
  return (
    <>
      <button onClick={() => cambiarIdioma()} className="bg-slate-400 p-5">
        Español
      </button>
      <h1 className="">
        {t("bienvenida")} {idiomaNavegador}
      </h1>
    </>
  );
};

export default Home;
