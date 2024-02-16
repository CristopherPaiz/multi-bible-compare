import { useContext, useEffect, useState } from "react";
import DataContext from "../context/DataContext";
import PropTypes from "prop-types";
import VerseSingle from "./VerseSingle";

const VerseWindow = ({ biblia }) => {
  const { libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero } = useContext(DataContext);
  const [tipoTestamento, setTipoTestamento] = useState("");
  const [rutaFinal, setRutaFinal] = useState("");
  const [capituloSeleccionado, setCapituloSeleccionado] = useState({});
  //   const [ExisteLibro, setExisteLibro] = useState(true);

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
    const obternerRuta = () => {
      const ruta = `../assets/bibles/${biblia}/${tipoTestamento}/${libroSeleccionado}/chapter${capituloSeleccionadoNumero}.json`;
      setRutaFinal(ruta);
    };
    if (tipoTestamento) {
      obternerRuta();
    }
  }, [biblia, capituloSeleccionadoNumero, libroSeleccionado, tipoTestamento]);

  //3. Importar el archivo JSON
  useEffect(() => {
    const importarJSON = async () => {
      try {
        const data = await import(rutaFinal);
        setCapituloSeleccionado(data.default);
      } catch (error) {
        setCapituloSeleccionado("No existe el Versículo seleccionado");
        return;
      }
    };
    if (rutaFinal) {
      importarJSON();
    }
  }, [rutaFinal, versiculoSeleccionadoNumero]);

  return (
    <>
      <VerseSingle texto={capituloSeleccionado} versiculoNumero={versiculoSeleccionadoNumero} />
    </>
  );
};

VerseWindow.propTypes = {
  biblia: PropTypes.string.isRequired,
};

export default VerseWindow;
