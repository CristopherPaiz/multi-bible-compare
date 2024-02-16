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
    let idiomaInicial;
    if (localStorage.getItem("idioma")) {
      idiomaInicial = localStorage.getItem("idioma");
    } else {
      idiomaInicial = navigator.language;
    }
    const indexIdioma = lenguajes.indexOf(idiomaInicial);
    setIndiceArchivo(indexIdioma !== -1 ? indexIdioma : 0);
    setIdiomaNavegador(idiomaInicial);
  }, []);

  // Funciones para el cambio de idioma
  const [indiceArchivo, setIndiceArchivo] = useState(0);

  const cambiarIdioma = () => {
    const nuevoIndice = (indiceArchivo + 1) % archivosIdioma.length;
    setIndiceArchivo(nuevoIndice);

    const nuevoIdioma = archivosIdioma[nuevoIndice].idioma;
    setIdiomaNavegador(nuevoIdioma);

    localStorage.setItem("idioma", lenguajes[nuevoIndice]); // Actualizar el idioma en localStorage
  };

  const t = (clave) => {
    const traducciones = archivosIdioma.map((archivo) => archivo[clave]);

    return traducciones[indiceArchivo] || clave;
  };

  // funciones que retornamos para que puedan usarse en otros lados
  return <LanguageContext.Provider value={{ idiomaNavegador, cambiarIdioma, t }}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
