import { useContext } from "react";
import ListBooks from "../components/ListBooks";
import DataContext from "../context/DataContext";
import ListSubBooks from "../components/ListSubBooks";
import ListChapters from "../components/ListChapters";
import ListVerses from "../components/ListVerses";

const Compare = () => {
  const { bibliasSeleccionadas, libroSeleccionado, capituloSeleccionado, versiculoSeleccionadoNumero } = useContext(DataContext);

  return (
    <div className="dark:text-white">
      <ListBooks />
      {bibliasSeleccionadas.length > 0 && <ListSubBooks />}
      {libroSeleccionado.length > 0 && <ListChapters />}
      {libroSeleccionado.length > 0 && <ListVerses />}
      {versiculoSeleccionadoNumero && (
        <>
          {console.log("Biblias", bibliasSeleccionadas)}
          {console.log("libro seleccionado: ", libroSeleccionado)}
          {console.log("capitulo seleccionado: ", capituloSeleccionado + 1)}
          {console.log("versiculo seleccionado numero: ", versiculoSeleccionadoNumero)}
        </>
      )}
    </div>
  );
};

export default Compare;
