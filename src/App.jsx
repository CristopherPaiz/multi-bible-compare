import { useContext, useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import About from "./pages/About";
import Compare from "./pages/Compare";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ThemeContext from "./context/ThemeContext";
import Home from "./pages/Home";
import HistoryPage from "./pages/HistoryPage";
import FloatingBubble from "./components/FloatingBubble";
import DataContext from "./context/DataContext";
import COLORS from "./assets/colors.json";
import LanguageContext from "./context/LanguageContext";
import { toJpeg } from "html-to-image";

const App = () => {
  const { theme } = useContext(ThemeContext);
  const {
    setCompartir,
    compartir,
    textoCompartir,
    versiculoCompartir,
    nombreBibliaCompartir,
    libroSeleccionado,
    capituloSeleccionadoNumero,
  } = useContext(DataContext);

  const { t } = useContext(LanguageContext);

  const styles = {
    backgroundColor: theme === "light" ? "#FFFFFF" : "#161519",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Cg fill='%23${
      theme === "light" ? "f5c461" : "000"
    }' fill-opacity='0.1'%3E%3Cpath fill-rule='evenodd' d='M11 0l5 20H6l5-20zm42 31a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM0 72h40v4H0v-4zm0-8h31v4H0v-4zm20-16h20v4H20v-4zM0 56h40v4H0v-4zm63-25a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM53 41a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-30 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-28-8a5 5 0 0 0-10 0h10zm10 0a5 5 0 0 1-10 0h10zM56 5a5 5 0 0 0-10 0h10zm10 0a5 5 0 0 1-10 0h10zm-3 46a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 0l5 20H16l5-20zm43 64v-4h-4v4h-4v4h4v4h4v-4h4v-4h-4zM36 13h4v4h-4v-4zm4 4h4v4h-4v-4zm-4 4h4v4h-4v-4zm8-8h4v4h-4v-4z'/%3E%3C/g%3E%3C/svg%3E")`,
  };

  const colorText = ["black", "white", "yellow", "blue", "green", "red", "purple", "gray", "orange", "pink", "brown"];

  const colorArray = Object.values(COLORS);
  const textoArray = Object.values(textoCompartir);

  const [colorSelected, setColorSelected] = useState(colorArray[0]);
  const [textColorSelected, setTextColorSelected] = useState(colorText[0]);

  const determinarTamaño = (texto) => {
    if (texto.length > 400) {
      return 10;
    } else if (texto.length > 300) {
      return 12;
    } else if (texto.length > 200) {
      return 15;
    } else if (texto.length > 80) {
      return 17;
    } else {
      return 20;
    }
  };

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setCompartir(false);
      }
    };

    if (compartir) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [compartir, setCompartir]);

  const elementRef = useRef(null);

  const htmlToImageConvert = () => {
    toJpeg(elementRef.current, { cacheBust: false })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = t(libroSeleccionado) + "-" + capituloSeleccionadoNumero + ":" + versiculoCompartir + ".jpg";
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <>
      {compartir ? (
        <div className="top-0 left-0 fixed z-[99999999999] max-h-full max-w-full overflow-hidden min-h-full min-w-full h-full w-full flex items-center justify-center bg-black/90 flex-col">
          <div ref={modalRef}>
            <div
              ref={elementRef}
              style={{ backgroundImage: colorSelected, color: textColorSelected }}
              className="max-h-[500px] rounded-lg p-6 min-h-[250px] h-[300px] max-w-[500px] min-w-[250px] w-[300px] z-[99999999999] overflow-y-auto"
            >
              <div className="h-[50px]">
                <h1 className="font-extrabold text-lg text-pretty mb-1">
                  {nombreBibliaCompartir.split("-")[1].replace("ccc", "cc")}
                </h1>
                <h1 className="font-thin text-md mb-4">
                  {t(libroSeleccionado)} - {capituloSeleccionadoNumero}:{versiculoCompartir}
                </h1>
              </div>
              <div className="h-[200px] flex flex-col flex-1 items-center justify-center m-auto text-center">
                <div className="flex-shrink-0">
                  <span className="font-extrabold text-lg">&quot;</span>
                  <span
                    className="text-balance"
                    style={{ fontSize: determinarTamaño(textoArray[versiculoCompartir - 1]) }}
                  >
                    <span
                      dangerouslySetInnerHTML={{ __html: capitalizeFirstLetter(textoArray[versiculoCompartir - 1]) }}
                    ></span>
                    {/* {capitalizeFirstLetter(textoArray[versiculoCompartir - 1])} */}
                  </span>
                  <span className="font-extrabold text-lg">&quot;</span>
                </div>
              </div>
            </div>
            <h1 className="font-bold text-white mt-2">Fondo: </h1>
            <div className="h-16 max-w-[500px] min-w-[250px] w-[300px] flex items-center flex-row overflow-x-auto gap-2 no-scrollbarVerse">
              {colorArray.map((color, index) => (
                <div
                  key={index}
                  className="rounded-full size-10"
                  style={{
                    backgroundImage: color,
                    flexShrink: 0,
                  }}
                  onClick={() => {
                    setColorSelected(color);
                  }}
                />
              ))}
            </div>
            <h1 className="font-bold text-white mt-2">Texto: </h1>
            <div className="h-16 max-w-[500px] min-w-[250px] w-[300px] flex items-center flex-row overflow-x-auto gap-2 no-scrollbarVerse">
              {colorText.map((color, index) => (
                <div
                  key={index}
                  className="rounded-full size-10"
                  style={{
                    background: color,
                    flexShrink: 0,
                    border: color === "black" ? "2px solid white" : "none",
                  }}
                  onClick={() => {
                    setTextColorSelected(color);
                  }}
                />
              ))}
            </div>
            <div className="flex gap-3 mt-3 justify-center w-full">
              <button
                onClick={() => setCompartir(false)}
                className="bg-red-500 text-center text-black  py-3 rounded-lg px-5"
              >
                X
              </button>
              <button
                onClick={htmlToImageConvert}
                className="bg-green-500 text-center text-black  py-3 rounded-lg w-1/2"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="backgroundPattern w-full h-full fixed -z-50" style={styles}></div>
      <BrowserRouter>
        <Navbar />
        <FloatingBubble />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
