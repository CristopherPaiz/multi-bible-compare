import { useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import DataContext from "../context/DataContext";
import BG from "/bibleBackground.webp";
import LanguageContext from "../context/LanguageContext";
import IndiceLibros from "../components/IndiceLibros";

/**
 * Los cuatro destinos que no cuelgan del flujo de lectura.
 *
 * Están aquí y no solo en el menú porque el menú es un botón: quien llega a la
 * portada desde un buscador —y el propio rastreador— no lo abre. Un enlace en
 * el cuerpo de la página es lo que hace que `/search`, `/3d` y `/atlas` sean
 * alcanzables sin saber que existen.
 */
const DESTINOS = [
  { ruta: "/search", titulo: "EnlaceBuscar", detalle: "EnlaceBuscarDesc" },
  { ruta: "/3d", titulo: "Enlace3D", detalle: "Enlace3DDesc" },
  { ruta: "/atlas", titulo: "EnlaceAtlas", detalle: "EnlaceAtlasDesc" },
  { ruta: "/about", titulo: "EnlaceAcerca", detalle: "EnlaceAcercaDesc" },
];

const Home = () => {
  const { paginaInicio } = useContext(DataContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (paginaInicio === "/compare") {
      navigate("/compare");
    }
  }, [paginaInicio, navigate]);

  return (
    <div className="mt-6 p-8 flex-col flex items-center justify-center text-white mb-6">
      <div
        className="animate-fade-in"
        style={{
          position: "fixed",
          zIndex: -5,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.3))",
        }}
      ></div>
      <img src={BG} alt="" aria-hidden="true" className="animate-fade-in fixed -z-20 object-cover h-full sm:h-auto sm:w-full bottom-0" />
      <article className="animate-fade-in sm:max-w-[600px] px-4 flex flex-col justify-center items-center">
        {/*
          El <h1> lleva el nombre de la marca y, debajo, un <h2> dice de qué va
          la página con las palabras que alguien escribiría para buscarla. Antes
          el único encabezado era "Biblian": un nombre inventado no le dice a
          nadie —ni a un buscador— que esto sirve para leer y comparar biblias.
        */}
        <h1 className="mt-10 sm:mt-4 text-7xl sm:text-8xl font-bold text-center mb-2">Biblian</h1>
        <h2 className="text-center font-bold sm:font-extrabold text-lg sm:text-xl mb-4 text-balance">{t("SEO_TituloHome")}</h2>
        <p className="text-center font-semibold w-[260px] sm:w-[320px] mb-10 opacity-90">{t("Compara")}</p>
        <p className="text-center text-balance">{t("SEO_SubtituloHome")}</p>
        <p className="text-center text-balance mt-4">{t("PS_parrafo1")}</p>
        <p className="text-center text-balance mb-12">{t("PS_parrafo2")}</p>
        <Link
          to="/compare"
          className="bg-[#a97109] hover:bg-[#634b1d] dark:bg-purple-500 dark:hover:bg-purple-700 text-white font-bold py-3 px-5 rounded-md w-[150px] m-auto text-center"
        >
          {t("Empezar")}
        </Link>

        <section className="w-full mt-16" aria-labelledby="destinos-titulo">
          <h2 id="destinos-titulo" className="text-xl font-bold text-center mb-6">
            {t("ExploraTambien")}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DESTINOS.map(({ ruta, titulo, detalle }) => (
              <li key={ruta}>
                <Link to={ruta} className="block h-full rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 transition px-4 py-3">
                  <span className="block font-semibold text-sm">{t(titulo)}</span>
                  <span className="block text-xs opacity-80 mt-1">{t(detalle)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <IndiceLibros />
      </article>
    </div>
  );
};

export default Home;
