import { useContext } from "react";
import ListBooks from "../components/ListBooks";
import DataContext from "../context/DataContext";
import ListSubBooks from "../components/ListSubBooks";

const Compare = () => {
  const { bibliasSeleccionadas, bibliasSeleccionadasDatos } = useContext(DataContext);

  return (
    <div className="dark:text-white">
      <ListBooks />
      {bibliasSeleccionadas.length > 0 ? <ListSubBooks /> : <h1>No hay nada seleccionado</h1>}
      {/* {console.log(bibliasSeleccionadasDatos)} */}
    </div>
  );
};

export default Compare;
