import { createContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import es from "../locales/es.json";
import en from "../locales/en.json";

const LanguageContext = createContext();
const archivosIdioma = [es, en];

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

  // Funciones para el cambio de idioma
  const [indiceArchivo, setIndiceArchivo] = useState(0);

  const cambiarIdioma = () => {
    setIndiceArchivo((indice) => (indice + 1) % archivosIdioma.length);
  };

  const t = (clave) => {
    const traducciones = archivosIdioma.map((archivo) => archivo[clave]);

    return traducciones[indiceArchivo] || clave;
  };

  // funciones que rotornamos para que puedan usarse en otros lados
  return <LanguageContext.Provider value={{ idiomaNavegador, cambiarIdioma, t }}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
