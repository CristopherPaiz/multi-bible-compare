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
  const [cargando, setCargando] = useState(false);
  const { t } = useContext(LanguageContext);

  const idioma = idiomaDesdeRuta(biblia);

  // Se resuscribe al interruptor de fuente para recargar si cambia en Ajustes,
  // sin obligar al usuario a refrescar la página.
  const [fuente, setFuente] = useState(getDataSource);
  useEffect(() => onDataSourceChange(setFuente), []);

  useEffect(() => {
    if (!libroSeleccionado || !capituloSeleccionadoNumero) return;

    const bookId = Number(libroSeleccionado.split("book")[1]);
    const chapterNum = Number(capituloSeleccionadoNumero);
    if (!Number.isFinite(bookId) || !Number.isFinite(chapterNum) || chapterNum <= 0) return;

    const controller = new AbortController();
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      try {
        const data = await getChapter({
          legacyPath: biblia,
          bookId,
          chapter: chapterNum,
          signal: controller.signal,
        });
        if (!cancelado) setCapituloSeleccionado(data);
      } catch (error) {
        if (cancelado || error?.name === "AbortError") return;
        const testamento = bookId <= LAST_OLD_TESTAMENT_BOOK ? t("AntiguoTestamento") : t("NuevoTestamento");
        setCapituloSeleccionado(t("NoExisteVersiculoParte1") + testamento + t("NoExisteVersiculoParte2"));
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();

    return () => {
      cancelado = true;
      controller.abort();
    };
    // `versiculoSeleccionadoNumero` NO va en las dependencias: el capítulo es
    // el mismo para todos sus versículos. Estaba aquí y re-descargaba el
    // capítulo entero en cada clic, lo que además creaba un objeto nuevo y
    // borraba las traducciones hechas. Sí se mantiene como guarda arriba,
    // porque hasta que no hay versículo elegido no se muestra nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biblia, libroSeleccionado, capituloSeleccionadoNumero, t, fuente]);

  return <VerseSingle texto={capituloSeleccionado} nombre={biblia} iso={idioma} cargando={cargando} bookId={Number(libroSeleccionado.split("book")[1])} />;
};

VerseWindow.propTypes = {
  biblia: PropTypes.string.isRequired,
};

export default VerseWindow;
