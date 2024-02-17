import { useContext, useEffect, useState } from "react";
import DataContext from "../context/DataContext";
import PropTypes from "prop-types";
import VerseSingle from "./VerseSingle";

const VerseWindow = ({ biblia }) => {
  const { libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero } = useContext(DataContext);
  const [tipoTestamento, setTipoTestamento] = useState("");
  const [rutaFinal, setRutaFinal] = useState("");
  const [capituloSeleccionado, setCapituloSeleccionado] = useState({});
  const [idioma, setIdioma] = useState("");

  //1. Determinar el tipo de testamento
  useEffect(() => {
    const tipoTestamento = () => {
      const tipo1 = libroSeleccionado.split("book")[1];
      setTipoTestamento(tipo1 <= 39 ? "Old" : "New");
    };
    tipoTestamento();
  }, [libroSeleccionado]);

  //2. Obtener la ruta final para el archivo JSON
  useEffect(() => {
    const obtenerRuta = () => {
      const ruta = `https://raw.githubusercontent.com/CristopherPaiz/multi-bible-compare/main/src/assets/bibles/${biblia}/${tipoTestamento}/${libroSeleccionado}/chapter${capituloSeleccionadoNumero}.json`;
      setRutaFinal(ruta);
    };
    if (tipoTestamento) {
      obtenerRuta();
    }
  }, [biblia, capituloSeleccionadoNumero, libroSeleccionado, tipoTestamento]);

  //3. Obtener el archivo JSON mediante fetch
  useEffect(() => {
    const obtenerJSON = async () => {
      try {
        const response = await fetch(rutaFinal);
        if (!response.ok) {
          throw new Error("Error al obtener el JSON");
        }
        const data = await response.json();
        setCapituloSeleccionado(data);
      } catch (error) {
        setCapituloSeleccionado("No existe el Versículo seleccionado");
      }
    };
    if (rutaFinal) {
      obtenerJSON();
    }
  }, [rutaFinal, versiculoSeleccionadoNumero]);

  // Retorna el ISO code del idioma
  const IdiomaAcodigo = async (idiomaVal) => {
    switch (idiomaVal) {
      case "Español":
        return "es";
      case "English":
        return "en";
      case "Esperanto":
        return "eo";
      case "Greek":
        return "el";
      case "Hebrew":
        return "he";
      case "Latin":
        return "la";
      default:
        return "no";
    }
  };

  useEffect(() => {
    // Obtener el ISO code del idioma a partir del nombre de la biblia
    const obtenerIdioma = async () => {
      const idiomaVal = biblia.split(". ")[1].split(" -")[0] ?? "Desconocido";
      const code = await IdiomaAcodigo(idiomaVal);
      setIdioma(code);
    };
    obtenerIdioma();
  }, [biblia]);

  return (
    <div>
      <VerseSingle texto={capituloSeleccionado} nombre={biblia} iso={idioma} />
    </div>
  );
};

VerseWindow.propTypes = {
  biblia: PropTypes.string.isRequired,
};

export default VerseWindow;
