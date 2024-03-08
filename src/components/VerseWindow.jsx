import { useContext, useEffect, useState } from "react";
import DataContext from "../context/DataContext";
import PropTypes from "prop-types";
import VerseSingle from "./VerseSingle";
import LanguageContext from "../context/LanguageContext";

const VerseWindow = ({ biblia }) => {
  const { libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero } = useContext(DataContext);
  const [tipoTestamento, setTipoTestamento] = useState("");
  const [rutaFinal, setRutaFinal] = useState("");
  const [capituloSeleccionado, setCapituloSeleccionado] = useState({});
  const [idioma, setIdioma] = useState("");
  const { t } = useContext(LanguageContext);

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
        const tipoTestamentoVersiculo = tipoTestamento === "Old" ? t("AntiguoTestamento") : t("NuevoTestamento");
        setCapituloSeleccionado(t("NoExisteVersiculoParte1") + tipoTestamentoVersiculo + t("NoExisteVersiculoParte2"));
      }
    };
    if (rutaFinal) {
      obtenerJSON();
    }
  }, [rutaFinal, versiculoSeleccionadoNumero, tipoTestamento, t]);

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
        return "iw";
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
    <>
      <VerseSingle texto={capituloSeleccionado} nombre={biblia} iso={idioma} />
    </>
  );
};

VerseWindow.propTypes = {
  biblia: PropTypes.string.isRequired,
};

export default VerseWindow;
