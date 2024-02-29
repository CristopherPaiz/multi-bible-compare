import { useContext, useEffect, useState } from "react";
import DataContext from "../context/DataContext";

const StrongSingle = () => {
  const { strongData, cargandoStrong, strong } = useContext(DataContext);
  const [strongIndividual, setStrongIndividual] = useState("");

  useEffect(() => {
    if (!cargandoStrong) {
      const obtenerStrong = () => {
        const strongObj = strongData.find((obj) => obj.id === strong);
        return strongObj ? strongObj : "";
      };
      setStrongIndividual(obtenerStrong);
    }
  }, [strongData, strong, cargandoStrong]);

  return (
    <>
      <div className="z-[9999999] h-[50%] w-[80%] border border-yellow-500 dark:border-purple-500 bg-yellow-300 dark:bg-purple-300 text-black dark:text-white overflow-y-scroll no-scrollbar">
        {cargandoStrong ? (
          <p>Cargando...</p>
        ) : (
          <div className="">
            <h1>ID: {strongIndividual.id}</h1>
            <h1>LEXEMA: {strongIndividual.le}</h1>
            <h1>TRANSLITERACIÓN: {strongIndividual.pl}</h1>
            <h1>PRONUNCIACIÓN: {strongIndividual.ps}</h1>
            <h1>TITULO: {strongIndividual.ti}</h1>
            <div dangerouslySetInnerHTML={{ __html: strongIndividual.df }}></div>
          </div>
        )}
      </div>
      {/* BACKGROUND MODAL */}
      <div className="fixed w-full h-full bg-black/40 z-[999999]"></div>
    </>
  );
};

export default StrongSingle;
