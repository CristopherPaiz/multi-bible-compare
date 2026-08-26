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

  /**
   * Traduce una clave y sustituye variables con la forma `{nombre}`.
   *
   *   t("BuscarMinimo", { min: 3 })  ->  "Escribe al menos 3 caracteres"
   *
   * Antes el segundo argumento se ignoraba en silencio: llamadas como
   * `t("MaxSelectionReached", { max })` ya lo pasaban y el número quedaba
   * quemado en el texto traducido. Es compatible hacia atrás: sin `variables`
   * el comportamiento es idéntico al anterior.
   */
  const t = (clave, variables) => {
    const traducciones = archivosIdioma.map((archivo) => archivo[clave]);
    const texto = traducciones[indiceArchivo] || clave;

    if (!variables) return texto;

    return texto.replace(/\{(\w+)\}/g, (coincidencia, nombre) =>
      Object.prototype.hasOwnProperty.call(variables, nombre) ? String(variables[nombre]) : coincidencia
    );
  };

  return <LanguageContext.Provider value={{ idiomaNavegador, cambiarIdioma, t }}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
