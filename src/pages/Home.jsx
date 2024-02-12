import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";

const Home = () => {
  const { idiomaNavegador } = useContext(LanguageContext);
  return (
    <>
      <h1 className="">Homepage: {idiomaNavegador}</h1>
    </>
  );
};

export default Home;
