import { createContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [idiomaNavegador, setIdiomaNavegador] = useState("es");

  //Saber el idioma del Navegador
  useEffect(() => {
    if (localStorage.getItem("idioma")) {
      setIdiomaNavegador(localStorage.getItem("idioma"));
    } else {
      setIdiomaNavegador(navigator.language);
    }
  }, [idiomaNavegador]);

  

  return <LanguageContext.Provider value={{ idiomaNavegador }}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
