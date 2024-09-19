import { useContext, useState, useEffect, useRef } from "react";
import { toJpeg } from "html-to-image";
import LanguageContext from "../context/LanguageContext";
import COLORS from "../assets/colors.json";
import DataContext from "../context/DataContext";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";

const ShareModal = () => {
  const { setCompartir, compartir, textoCompartir, versiculoCompartir, nombreBibliaCompartir, libroSeleccionado, capituloSeleccionadoNumero } =
    useContext(DataContext);
  const { t } = useContext(LanguageContext);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(compartir, () => setCompartir(false));

  const colorText = ["black", "white", "yellow", "blue", "green", "red", "purple", "gray", "orange", "pink", "brown"];
  const colorArray = Object.values(COLORS);
  const textoArray = Object.values(textoCompartir);

  const [colorSelected, setColorSelected] = useState(colorArray[0]);
  const [textColorSelected, setTextColorSelected] = useState(colorText[0]);
  const [toast, setToast] = useState({ show: false, message: "" });

  const modalRef = useRef(null);
  const elementRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setCompartir(false);
      }
    };

    if (compartir) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [compartir, setCompartir]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: "" });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message) => {
    setToast({ show: true, message });
  };

  const determinarTamaño = (texto) => {
    const length = texto.length;
    if (length > 400) return 10;
    if (length > 300) return 12;
    if (length > 200) return 15;
    if (length > 80) return 17;
    return 20;
  };

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const htmlToImageConvert = () => {
    toJpeg(elementRef.current, { cacheBust: false })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `${t(libroSeleccionado)}-${capituloSeleccionadoNumero}:${versiculoCompartir}.jpg`;
        link.href = dataUrl;
        link.click();
        showToast("Imagen guardada correctamente");
      })
      .catch((err) => {
        console.error("Error al convertir a imagen:", err);
        showToast("Error al guardar la imagen");
      });
  };

  const copyTextToClipboard = () => {
    const textToCopy = textoArray[versiculoCompartir - 1];
    const TextoCompuesto = `${nombreBibliaCompartir.split("-")[1].replace("ccc", "cc")}\n${t(
      libroSeleccionado
    )} - ${capituloSeleccionadoNumero}:${versiculoCompartir}\n${textToCopy}`;
    navigator.clipboard
      .writeText(TextoCompuesto)
      .then(() => {
        showToast("Texto copiado al portapapeles");
      })
      .catch((err) => {
        console.error("Error al copiar el texto: ", err);
        showToast("Error al copiar el texto");
      });
  };

  if (!compartir) return null;

  return (
    <div className="fixed inset-0 z-[99999999999] flex items-center justify-center bg-black/85">
      <div ref={modalRef} className="rounded-lg p-6 max-w-[500px] w-full relative">
        {/* Toast notification */}
        {toast.show && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 justify-center bg-white/20 w-full text-white text-center px-4 py-2 rounded-md transition-opacity duration-300 opacity-90">
            {toast.message}
          </div>
        )}

        <div
          ref={elementRef}
          style={{ backgroundImage: colorSelected, color: textColorSelected }}
          className="rounded-lg p-6 min-h-[250px] h-[300px] overflow-y-auto mb-4"
        >
          <div className="h-[50px]">
            <h1 className="font-extrabold text-lg text-pretty mb-1">{nombreBibliaCompartir.split("-")[1].replace("ccc", "cc")}</h1>
            <h1 className="font-thin text-md mb-4">
              {t(libroSeleccionado)} - {capituloSeleccionadoNumero}:{versiculoCompartir}
            </h1>
          </div>
          <div className="h-[200px] flex flex-col items-center justify-center text-center">
            <div>
              <span className="font-extrabold text-lg">&quot;</span>
              <span
                className="text-balance"
                style={{ fontSize: determinarTamaño(textoArray[versiculoCompartir - 1]) }}
                dangerouslySetInnerHTML={{ __html: capitalizeFirstLetter(textoArray[versiculoCompartir - 1]) }}
              />
              <span className="font-extrabold text-lg">&quot;</span>
            </div>
          </div>
        </div>

        <h1 className="font-bold text-white dark:text-white mt-2">Fondo: </h1>
        <div className="flex overflow-x-auto gap-2 no-scrollbarVerse mb-4">
          {colorArray.map((color, index) => (
            <div
              key={index}
              className="rounded-full size-10 flex-shrink-0 cursor-pointer"
              style={{ backgroundImage: color }}
              onClick={() => setColorSelected(color)}
            />
          ))}
        </div>

        <h1 className="font-bold text-white dark:text-white mt-2">Texto: </h1>
        <div className="flex overflow-x-auto gap-2 no-scrollbarVerse mb-4">
          {colorText.map((color, index) => (
            <div
              key={index}
              className="rounded-full size-10 flex-shrink-0 cursor-pointer"
              style={{
                background: color,
                border: color === "black" ? "2px solid gray" : "none",
              }}
              onClick={() => setTextColorSelected(color)}
            />
          ))}
        </div>

        <div className="flex gap-3 justify-center mt-4">
          <button onClick={() => setCompartir(false)} className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-700">
            Cerrar
          </button>
          <button onClick={copyTextToClipboard} className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
            Copiar texto
          </button>
          <button onClick={htmlToImageConvert} className="bg-green-500 text-white py-2 px-6 rounded-lg hover:bg-green-700">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
