import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import LanguageContext from "./LanguageContext";

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [bibliasSeleccionadas, setBibliasSeleccionadas] = useState([]);
  const [bibliasSeleccionadasDatos, setBibliasSeleccionadasDatos] = useState({});
  const [libroSeleccionado, setLibroSeleccionado] = useState("");
  const [libros, setLibros] = useState({});
  const { t } = useContext(LanguageContext);

  //actualizar el idioma de los libros cuando cambia idioma
  useEffect(() => {
    setLibros({
      genesis: t("book1"),
      exodo: t("book2"),
      levitico: t("book3"),
      numeros: t("book4"),
      deuteronomio: t("book5"),
      josue: t("book6"),
      jueces: t("book7"),
      rut: t("book8"),
      "1samuel": t("book9"),
      "2samuel": t("book10"),
      "1reyes": t("book11"),
      "2reyes": t("book12"),
      "1cronicas": t("book13"),
      "2cronicas": t("book14"),
      esdras: t("book15"),
      nehemias: t("book16"),
      ester: t("book17"),
      job: t("book18"),
      salmos: t("book19"),
      proverbios: t("book20"),
      eclesiastes: t("book21"),
      cantares: t("book22"),
      isaias: t("book23"),
      jeremias: t("book24"),
      lamentaciones: t("book25"),
      ezequiel: t("book26"),
      daniel: t("book27"),
      oseas: t("book28"),
      joel: t("book29"),
      amos: t("book30"),
      abdias: t("book31"),
      jonas: t("book32"),
      miqueas: t("book33"),
      nahum: t("book34"),
      habacuc: t("book35"),
      sofonias: t("book36"),
      hageo: t("book37"),
      zacarias: t("book38"),
      malaquias: t("book39"),
      mateo: t("book40"),
      marcos: t("book41"),
      lucas: t("book42"),
      juan: t("book43"),
      hechos: t("book44"),
      romanos: t("book45"),
      "1corintios": t("book46"),
      "2corintios": t("book47"),
      galatas: t("book48"),
      efesios: t("book49"),
      filipenses: t("book50"),
      colosenses: t("book51"),
      "1tesalonicenses": t("book52"),
      "2tesalonicenses": t("book53"),
      "1timoteo": t("book54"),
      "2timoteo": t("book55"),
      tito: t("book56"),
      filemon: t("book57"),
      hebreos: t("book58"),
      santiago: t("book59"),
      "1pedro": t("book60"),
      "2pedro": t("book61"),
      "1juan": t("book62"),
      "2juan": t("book63"),
      "3juan": t("book64"),
      judas: t("book65"),
      apocalipsis: t("book66"),
    });
  }, [t]);

  //FUNCION QUE IMPORTA LOS DATA_JSON
  useEffect(() => {
    const fetchBibles = async () => {
      const bibles = {};

      await Promise.all(
        bibliasSeleccionadas.map(async (biblia) => {
          try {
            const response = await import(`../assets/bibles/JSON_DATA/${biblia}.json`);
            bibles[biblia] = response.default;
          } catch (error) {
            console.error(`Error loading JSON file for ${biblia}:`, error);
          }
        })
      );

      setBibliasSeleccionadasDatos(bibles);
    };

    fetchBibles();
  }, [bibliasSeleccionadas, setBibliasSeleccionadasDatos]);

  // funciones que rotornamos para que puedan usarse en otros lados
  return (
    <DataContext.Provider
      value={{
        bibliasSeleccionadas,
        setBibliasSeleccionadas,
        bibliasSeleccionadasDatos,
        setBibliasSeleccionadasDatos,
        setLibros,
        libros,
        libroSeleccionado,
        setLibroSeleccionado,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;

DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
