import { useContext } from "react";
import VerseWindow from "./VerseWindow";
import DataContext from "../context/DataContext";

/**
 * Rejilla de comparación.
 *
 * Antes era `flex flex-wrap` y cada panel se encogía a su contenido: en móvil
 * no se notaba porque solo cabe uno por fila, pero en escritorio quedaban de
 * anchos distintos y sin alinear entre filas.
 *
 * Con `auto-fill` + `minmax(..., 1fr)` el navegador mete tantas columnas como
 * quepan y les da el MISMO ancho, repartiendo el sobrante. El mínimo lo elige
 * el usuario en Ajustes.
 *
 * El `min(100%, ...)` es la parte importante en móvil: sin él, una pantalla más
 * angosta que el mínimo desbordaría horizontalmente en vez de bajar a una sola
 * columna.
 */
const Verses = () => {
  const { bibliasSeleccionadas, anchoColumna } = useContext(DataContext);

  if (bibliasSeleccionadas.length === 0) return null;

  return (
    <div className="mx-auto my-8 w-11/12 max-w-[1800px]">
      <div
        // Mas separacion VERTICAL que horizontal: en movil los paneles caen en
        // una sola columna y sin aire entre ellos el final de uno y la cabecera
        // del siguiente se leian como el mismo bloque.
        className="grid items-stretch gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${anchoColumna}px), 1fr))` }}
      >
        {bibliasSeleccionadas.map((biblia) => (
          <VerseWindow key={biblia} biblia={biblia} />
        ))}
      </div>
    </div>
  );
};

export default Verses;
