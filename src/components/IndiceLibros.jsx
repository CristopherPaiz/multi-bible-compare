import { useContext } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import { LIBROS, nombreDeLibro } from "../data/libros";
import { ULTIMO_LIBRO_AT, totalCapitulos } from "../data/canon";

/*
 * Dos fondos, dos paletas. La portada pinta el indice sobre la foto oscura del
 * hero, donde el texto siempre es blanco pase lo que pase con el tema; el 404 y
 * cualquier otra pantalla lo pintan sobre el fondo normal, que si cambia. Un
 * solo juego de clases dejaba invisible una de las dos.
 */
const PALETAS = {
  hero: "bg-white/10 hover:bg-white/25 border-white/15",
  pagina: "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 border-black/10 dark:border-white/15",
};

/**
 * El índice de los 66 libros, con enlace real a cada uno.
 *
 * Antes de esto, la portada tenía exactamente un enlace interno —el botón
 * "Empezar"— y las 1189 páginas de capítulo solo eran alcanzables tocando
 * botones que cambian estado de React. Un rastreador no toca botones: sigue
 * `<a href>`. El resultado era un sitio de mil páginas del que se descubría
 * una.
 *
 * No es un añadido "para el buscador": es la tabla de contenidos que a un
 * lector le ahorra tres toques para llegar a Génesis.
 */
const IndiceLibros = ({ variante = "hero" }) => {
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const paleta = PALETAS[variante] ?? PALETAS.hero;

  const grupos = [
    { titulo: t("AntiguoTestamento"), libros: LIBROS.filter((libro) => libro.id <= ULTIMO_LIBRO_AT) },
    { titulo: t("NuevoTestamento"), libros: LIBROS.filter((libro) => libro.id > ULTIMO_LIBRO_AT) },
  ];

  return (
    <nav className="w-full mt-16 mb-4" aria-labelledby="indice-titulo">
      <h2 id="indice-titulo" className="text-xl font-bold text-center mb-6">
        {t("IndiceLibros")}
      </h2>

      {grupos.map(({ titulo, libros }) => (
        <div key={titulo} className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-3">{titulo}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {libros.map((libro) => (
              <li key={libro.slug}>
                <Link
                  to={`/compare/${libro.slug}/1`}
                  title={`${nombreDeLibro(libro.id, idiomaNavegador)} — ${totalCapitulos(libro.id)} ${t("Capitulos")}`}
                  className={`inline-block text-xs px-2.5 py-1 rounded-md border transition ${paleta}`}
                >
                  {nombreDeLibro(libro.id, idiomaNavegador)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

IndiceLibros.propTypes = {
  variante: PropTypes.oneOf(["hero", "pagina"]),
};

export default IndiceLibros;
