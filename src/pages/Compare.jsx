import { useContext } from "react";
import ListBooks from "../components/ListBooks";
import DataContext from "../context/DataContext";
import ListSubBooks from "../components/ListSubBooks";
import ListChapters from "../components/ListChapters";
import ListVerses from "../components/ListVerses";

const Compare = () => {
  const { bibliasSeleccionadas, libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero } = useContext(DataContext);

  return (
    <div className="dark:text-white">
      <ListBooks />
      {bibliasSeleccionadas.length > 0 && <ListSubBooks />}
      {libroSeleccionado.length > 0 && <ListChapters />}
      {libroSeleccionado.length > 0 && <ListVerses />}
      {bibliasSeleccionadas.length > 0 && libroSeleccionado.length > 0 && capituloSeleccionadoNumero && versiculoSeleccionadoNumero && (
        <div>
          <h1 className="font-bold">Bilbia Seleccionadas</h1>
          <ul>
            {bibliasSeleccionadas.map((biblia, index) => (
              <li key={index}>{biblia}</li>
            ))}
          </ul>
          <h1 className="font-bold">Libro Seleccionado</h1>
          <ul>
            <li>{libroSeleccionado}</li>
          </ul>
          <h1 className="font-bold">Capítulo Seleccionado</h1>
          <ul>
            <li>{capituloSeleccionadoNumero}</li>
          </ul>
          <h1 className="font-bold">Versículo Número Seleccionado</h1>
          <ul>
            <li>{versiculoSeleccionadoNumero}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Compare;
