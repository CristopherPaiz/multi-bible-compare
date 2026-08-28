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
  const { libroSeleccionado, capituloSeleccionadoNumero, registrarTexto } = useContext(DataContext);
  const [capituloSeleccionado, setCapituloSeleccionado] = useState({});
  const [cargando, setCargando] = useState(false);
  const { t } = useContext(LanguageContext);

  const idioma = idiomaDesdeRuta(biblia);

  // Se resuscribe al interruptor de fuente para recargar si cambia en Ajustes,
  // sin obligar al usuario a refrescar la página.
  const [fuente, setFuente] = useState(getDataSource);
  useEffect(() => onDataSourceChange(setFuente), []);

  useEffect(() => {
    const bookId = Number(libroSeleccionado?.split("book")[1]);
    const chapterNum = Number(capituloSeleccionadoNumero);
    const referenciaValida = Boolean(libroSeleccionado) && Number.isFinite(bookId) && Number.isFinite(chapterNum) && chapterNum > 0;

    // Sin referencia válida no hay nada que pedir, pero sí hay que apagar el
    // indicador: si se sale de aquí con `cargando` en true, el panel se queda
    // con el esqueleto puesto para siempre.
    if (!referenciaValida) {
      setCargando(false);
      return;
    }

    const controller = new AbortController();
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      /*
       * Se vacía el texto ANTES de pedir el nuevo.
       *
       * Este efecto solo corre cuando cambia el libro, el capítulo o la fuente
       * (el versículo NO está en las dependencias), así que lo que hay en
       * pantalla es de OTRO capítulo: dejarlo visible hasta que llegue el nuevo
       * hacía que el texto se reemplazara de golpe, con el scroll y el alto de
       * cada versículo saltando. Vacío, el panel enseña el esqueleto y el texto
       * aparece ya montado y en su sitio.
       */
      setCapituloSeleccionado({});
      try {
        const data = await getChapter({
          legacyPath: biblia,
          bookId,
          chapter: chapterNum,
          signal: controller.signal,
        });
        if (cancelado) return;
        setCapituloSeleccionado(data);
        // El contexto junta los capítulos de todos los paneles: es lo que
        // permite marcar qué palabra usa esta versión y las demás no.
        registrarTexto(biblia, data);
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
    // `versiculoSeleccionadoNumero` NO entra aquí: el capítulo es el mismo para
    // todos sus versículos. Estaba en las dependencias y re-descargaba el
    // capítulo entero en cada clic, lo que además creaba un objeto nuevo y
    // borraba las traducciones hechas.
  }, [biblia, libroSeleccionado, capituloSeleccionadoNumero, t, fuente, registrarTexto]);

  return <VerseSingle texto={capituloSeleccionado} nombre={biblia} iso={idioma} cargando={cargando} bookId={Number(libroSeleccionado.split("book")[1])} />;
};

VerseWindow.propTypes = {
  biblia: PropTypes.string.isRequired,
};

export default VerseWindow;
