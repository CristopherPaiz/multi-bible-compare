import { useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";

const History = () => {
  const navigate = useNavigate();

  const {
    history,
    libros,
    eliminarElementoHistorial,
    setearHistorial,
    bibliasSeleccionadas,
    capituloSeleccionadoNumero,
    libroSeleccionado,
    versiculoSeleccionadoNumero,
  } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  const TipoTestamento = (libro) => {
    const tipo = libro.split("book")[1];
    if (tipo < 40) {
      return t("shortAntiguoTestamento");
    } else {
      return t("shortNuevoTestamento");
    }
  };

  const comprobarRuta = (ruta) => {
    const mismasBiblias =
      bibliasSeleccionadas.length === ruta.bibliasSeleccionadas.length &&
      bibliasSeleccionadas.every((biblia, index) => {
        return biblia.id === ruta.bibliasSeleccionadas[index].id;
      });

    if (
      mismasBiblias &&
      capituloSeleccionadoNumero === ruta.capituloSeleccionadoNumero &&
      libroSeleccionado === ruta.libroSeleccionado &&
      versiculoSeleccionadoNumero === ruta.versiculoSeleccionadoNumero
    ) {
      navigate("/compare");
    } else {
      setearHistorial(ruta);
      navigate("/compare");
    }
  };

  const reversedKeys = Object.keys(history).reverse();

  return (
    <article className="bg-[#ffe8bd] dark:bg-[#332154] mt-8 border-2 border-[#ae7c20] dark:border-[#9054ff] rounded max-h-[60vh] min-h-[60vh] h-[60vh] w-10/12 sm:min-w-[400px] sm:max-w-[400px] m-auto">
      <div className="w-full h-10 flex items-center justify-center text-black dark:text-white bg-[#ffbb3c] dark:bg-[#7d3ef3]">
        <h1 className="text-center font-bold text-md">{t("UltimoVersiculoTitulo")}</h1>
      </div>
      {history.length === 0 ? (
        <div className="max-h-[55vh] min-h-[55vh] h-[55vh] w-full sm:min-w-[400px] sm:max-w-[400px] items-center flex flex-col justify-center gap-4 text-center text-balance p-6">
          <p className="font-semibold italic">{t("UltimoVersiculoTexto1")}</p>
          <p className="font-thin">{t("UltimoVersiculoTexto2")}</p>
        </div>
      ) : (
        <div
          id="contenidoTotal"
          style={{ height: "calc(100% - 40px)", minHeight: "calc(100% - 40px)" }}
          className="w-full flex flex-col overflow-y-auto no-scrollbar"
        >
          {reversedKeys.map((key, index) => {
            const item = history[key];
            return (
              <div
                key={index}
                className="w-full h-20 min-h-20 max-h-20 bg-white/40  border-white/60 dark:bg-black/30 dark:border-black/30 flex flex-col justify-center overflow-hidden border-b-[1px] "
              >
                <div className="flex items-center">
                  <div className="w-[70px] h-16">
                    <span
                      id="inicial"
                      className="bg-white/60 dark:bg-black/20 w-[85px] h-[85px] rounded-full -ml-7 -mt-3 mr-3 flex flex-col justify-center items-center"
                    >
                      <p className="ml-5 font-extrabold text-2xl uppercase">{TipoTestamento(item.libroSeleccionado)}</p>
                    </span>
                  </div>
                  <div id="texto" className="flex-grow overflow-hidden">
                    <div className="flex flex-col">
                      <div className="flex flex-wrap gap-x-1 items-center">
                        <span>{libros[item.libroSeleccionado]}</span>
                        <span>
                          {item.capituloSeleccionadoNumero}:{item.versiculoSeleccionadoNumero}
                        </span>
                      </div>
                      <div id="biblias" className="overflow-hidden text-[10px] opacity-40 truncate text-ellipsis mr-2">
                        {item?.bibliasSeleccionadas.map((biblia, index) => (
                          <span key={index}>
                            {biblia.split(".")[1]}
                            {index !== item.bibliasSeleccionadas.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div id="iconos" className="w-16 h-16 flex flex-nowrap gap-1 items-center mr-2">
                    <button className="hover:scale-110" onClick={() => comprobarRuta(item)}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-6 h-6"
                      >
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        <path
                          fillRule="evenodd"
                          d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button className="hover:scale-110" onClick={() => eliminarElementoHistorial(index)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="w-6 h-6">
                        <path
                          fillRule="evenodd"
                          d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};

export default History;
