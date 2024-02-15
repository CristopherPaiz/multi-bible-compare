import { useContext, useEffect } from "react";
import ListBooks from "../components/ListBooks";
import DataContext from "../context/DataContext";
import ListSubBooks from "../components/ListSubBooks";
import ListChapters from "../components/ListChapters";

const Compare = () => {
  const { bibliasSeleccionadas, flagLibros } = useContext(DataContext);

  useEffect(() => {}, []);

  return (
    <div className="dark:text-white">
      <ListBooks />
      {bibliasSeleccionadas.length > 0 && <ListSubBooks />}
      {flagLibros && <ListChapters />}
    </div>
  );
};

export default Compare;
