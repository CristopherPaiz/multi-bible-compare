import { createContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import es from "../locales/es.json";
import en from "../locales/en.json";

const LanguageContext = createContext();
const archivosIdioma = [es, en];
const lenguajes = ["es", "en"];

export const LanguageProvider = ({ children }) => {
  const [idiomaNavegador, setIdiomaNavegador] = useState("es");

  useEffect(() => {
    if (!localStorage.getItem("idioma")) {
      localStorage.setItem("idioma", "es");
    }

    let idiomaInicial = localStorage.getItem("idioma");

    if (!lenguajes.includes(idiomaInicial)) {
      idiomaInicial = "es";
    }

    const indexIdioma = lenguajes.indexOf(idiomaInicial);
    setIndiceArchivo(indexIdioma);
    setIdiomaNavegador(idiomaInicial);
  }, []);

  const [indiceArchivo, setIndiceArchivo] = useState(0);

  const cambiarIdioma = () => {
    const nuevoIndice = (indiceArchivo + 1) % archivosIdioma.length;
    setIndiceArchivo(nuevoIndice);

    const nuevoIdioma = lenguajes[nuevoIndice];
    setIdiomaNavegador(nuevoIdioma);

    localStorage.setItem("idioma", nuevoIdioma);
  };

  const t = (clave) => {
    const traducciones = archivosIdioma.map((archivo) => archivo[clave]);

    return traducciones[indiceArchivo] || clave;
  };

  return <LanguageContext.Provider value={{ idiomaNavegador, cambiarIdioma, t }}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
