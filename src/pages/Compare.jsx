import { useContext } from "react";
import ListBooks from "../components/ListBooks";
import DataContext from "../context/DataContext";
import ListSubBooks from "../components/ListSubBooks";
import ListChapters from "../components/ListChapters";
import ListVerses from "../components/ListVerses";
import Verses from "../components/Verses";
import History from "../components/History";

const Compare = () => {
  const { bibliasSeleccionadas, libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero } =
    useContext(DataContext);

  return (
    <div className="animate-fade-in dark:text-white">
      <ListBooks />
      {bibliasSeleccionadas.length > 0 && <ListSubBooks />}
      {libroSeleccionado.length > 0 && <ListChapters />}
      {capituloSeleccionadoNumero !== 0 && <ListVerses />}
      {bibliasSeleccionadas.length > 0 &&
        libroSeleccionado.length > 0 &&
        capituloSeleccionadoNumero !== 0 &&
        versiculoSeleccionadoNumero !== 0 && <Verses />}
      {versiculoSeleccionadoNumero === 0 && <History />}
    </div>
  );
};

export default Compare;
