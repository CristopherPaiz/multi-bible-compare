import { useContext, useEffect, useState } from "react";
import DataContext from "../context/DataContext";
import PropTypes from "prop-types";
import VerseSingle from "./VerseSingle";
import LanguageContext from "../context/LanguageContext";
import { getChapter } from "../services/bibleSource";
import { getDataSource, onDataSourceChange } from "../config/dataSource";

const LAST_OLD_TESTAMENT_BOOK = 39;

// El nombre de la carpeta trae el idioma: "034. Español - Biblia ...".
const ISO_POR_IDIOMA = {
  Español: "es",
  English: "en",
  Esperanto: "eo",
  Greek: "el",
  Hebrew: "iw",
  Latin: "la",
};

const idiomaDesdeRuta = (ruta) => {
  const idioma = ruta.split(". ")[1]?.split(" -")[0];
  return ISO_POR_IDIOMA[idioma] ?? "no";
};

const VerseWindow = ({ biblia }) => {
  const { libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero } = useContext(DataContext);
  const [capituloSeleccionado, setCapituloSeleccionado] = useState({});
  const { t } = useContext(LanguageContext);

  const idioma = idiomaDesdeRuta(biblia);

  // Se resuscribe al interruptor de fuente para recargar si cambia en Ajustes,
  // sin obligar al usuario a refrescar la página.
  const [fuente, setFuente] = useState(getDataSource);
  useEffect(() => onDataSourceChange(setFuente), []);

  useEffect(() => {
    if (!libroSeleccionado || !capituloSeleccionadoNumero || !versiculoSeleccionadoNumero) return;

    const bookId = Number(libroSeleccionado.split("book")[1]);
    if (!Number.isFinite(bookId)) return;

    const controller = new AbortController();
    let cancelado = false;

    const cargar = async () => {
      try {
        const data = await getChapter({
          legacyPath: biblia,
          bookId,
          chapter: capituloSeleccionadoNumero,
          signal: controller.signal,
        });
        if (!cancelado) setCapituloSeleccionado(data);
      } catch (error) {
        if (cancelado || error?.name === "AbortError") return;
        const testamento = bookId <= LAST_OLD_TESTAMENT_BOOK ? t("AntiguoTestamento") : t("NuevoTestamento");
        setCapituloSeleccionado(t("NoExisteVersiculoParte1") + testamento + t("NoExisteVersiculoParte2"));
      }
    };

    cargar();

    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [biblia, libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero, t, fuente]);

  return <VerseSingle texto={capituloSeleccionado} nombre={biblia} iso={idioma} />;
};

VerseWindow.propTypes = {
  biblia: PropTypes.string.isRequired,
};

export default VerseWindow;
