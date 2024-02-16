import { useContext } from "react";
import VerseWindow from "./VerseWindow";
import DataContext from "../context/DataContext";

const Verses = () => {
  const { bibliasSeleccionadas } = useContext(DataContext);

  return (
    <>
      {bibliasSeleccionadas.length > 0 && (
        <>
          <div className="flex flex-wrap gap-y-10 gap-x-2">
            {bibliasSeleccionadas.map((biblia, index) => (
              <VerseWindow key={index} biblia={biblia} />
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default Verses;
