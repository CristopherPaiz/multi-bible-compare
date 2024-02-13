import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";

const Home = () => {
  const { idiomaNavegador, t } = useContext(LanguageContext);
  return (
    <>
      <h1 className="">
        {t("bienvenida")} {idiomaNavegador}
      </h1>
    </>
  );
};

export default Home;
