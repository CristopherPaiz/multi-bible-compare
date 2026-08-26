import { useContext } from "react";
import VerseWindow from "./VerseWindow";
import DataContext from "../context/DataContext";

const Verses = () => {
  const { bibliasSeleccionadas } = useContext(DataContext);

  return (
    <>
      {bibliasSeleccionadas.length > 0 && (
        <div className="w-11/12 m-auto my-10">
          <div className="flex flex-wrap gap-y-16 gap-x-4 space-evenly justify-center">
            {bibliasSeleccionadas.map((biblia, index) => (
              <VerseWindow key={index} biblia={biblia} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Verses;
