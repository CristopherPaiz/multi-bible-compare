import { useContext } from "react";
import ListBooks from "../components/ListBooks";
import DataContext from "../context/DataContext";
import ListSubBooks from "../components/ListSubBooks";
import ListChapters from "../components/ListChapters";
import ListVerses from "../components/ListVerses";
import Verses from "../components/Verses";
import History from "../components/History";
import BarraEstudio from "../components/estudio/BarraEstudio";
import { useSincronizarURL } from "../hooks/useSincronizarURL";

const Compare = () => {
  const { bibliasSeleccionadas, libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero } =
    useContext(DataContext);

  // La referencia leída viaja en la dirección: recargar o compartir el enlace
  // abre el mismo pasaje con las mismas versiones.
  useSincronizarURL();

  return (
    <div className="dark:text-white">
      <ListBooks />
      {bibliasSeleccionadas.length > 0 && <ListSubBooks />}
      {libroSeleccionado.length > 0 && <ListChapters />}
      {capituloSeleccionadoNumero !== 0 && <ListVerses />}
      {bibliasSeleccionadas.length > 0 &&
        libroSeleccionado.length > 0 &&
        capituloSeleccionadoNumero !== 0 &&
        versiculoSeleccionadoNumero !== 0 && <Verses />}
      {versiculoSeleccionadoNumero === 0 && <History />}
      {/* Va al final del documento y se pega abajo: es el sitio donde no tapa
          el texto y sigue al alcance del pulgar en móvil. */}
      <BarraEstudio />
    </div>
  );
};

export default Compare;
