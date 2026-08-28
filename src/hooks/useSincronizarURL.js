import { useContext, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DataContext from "../context/DataContext";
import { mapaDeLibro } from "../data/canon";
import { libroDesdeTexto, slugDeLibro, totalVersiculos } from "../utils/referencia";
import { codificarVersiones, decodificarVersiones } from "../utils/versiones";

/**
 * La referencia que se está leyendo, reflejada en la barra de direcciones.
 *
 * Antes toda la lectura vivía en `/compare` a secas: el estado estaba en
 * memoria, así que recargar la página perdía el pasaje, el botón "atrás" del
 * navegador se salía de la app, y no había forma de mandarle a alguien el
 * versículo que estabas viendo.
 *
 * Ahora la URL ES el estado visible: `/compare/jua/3/16?v=75,9`.
 *
 * ---------------------------------------------------------------------------
 * Por qué hay dos efectos y no uno
 * ---------------------------------------------------------------------------
 * El estado puede cambiar desde dos lados —el usuario pega una URL, o toca un
 * versículo en pantalla— y los dos tienen que acabar en el mismo sitio sin
 * pisarse. Con un solo efecto bidireccional el resultado es un bucle: escribir
 * la URL dispara el efecto que lee la URL, que escribe el estado, que vuelve a
 * escribir la URL.
 *
 * La salida es recordar en un `ref` la última dirección que ESTE hook aplicó en
 * cada sentido. Si lo que llega ya es lo último que escribimos, no es un cambio
 * nuevo: es el eco del anterior, y se ignora.
 */
export const useSincronizarURL = () => {
  const { libro, capitulo, versiculo } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();

  const {
    bibliasSeleccionadas,
    setBibliasSeleccionadas,
    libroSeleccionado,
    setLibroSeleccionado,
    capituloSeleccionadoNumero,
    setCapituloSeleccionadoNumero,
    versiculoSeleccionadoNumero,
    setVersiculoSeleccionadoNumero,
    setVersiculoSeleccionado,
  } = useContext(DataContext);

  const ultimaEscrita = useRef(null);
  const ultimaLeida = useRef(null);

  // --- URL -> estado -------------------------------------------------------
  useEffect(() => {
    const actual = `${libro ?? ""}/${capitulo ?? ""}/${versiculo ?? ""}${search}`;
    if (ultimaEscrita.current === actual) return;
    ultimaLeida.current = actual;

    const versiones = decodificarVersiones(new URLSearchParams(search).get("v"));
    if (versiones.length > 0) setBibliasSeleccionadas(versiones);

    if (!libro) return;

    const bookId = libroDesdeTexto(libro);
    if (!bookId) return;

    const mapa = mapaDeLibro(bookId);
    const claveCapitulo = String(Number(capitulo) || 1);
    if (!mapa?.[claveCapitulo]) return;

    const numeroVersiculo = Number(versiculo) || 1;
    const maximo = totalVersiculos(bookId, claveCapitulo);

    setLibroSeleccionado(`book${bookId}`);
    setCapituloSeleccionadoNumero(claveCapitulo);
    setVersiculoSeleccionado(mapa[claveCapitulo]);
    setVersiculoSeleccionadoNumero(numeroVersiculo > 0 && numeroVersiculo <= maximo ? numeroVersiculo : 1);
    // `search` incluye las versiones; el resto son los tres segmentos de ruta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libro, capitulo, versiculo, search]);

  // --- estado -> URL -------------------------------------------------------
  useEffect(() => {
    const bookId = Number(String(libroSeleccionado ?? "").split("book")[1]);
    const slug = slugDeLibro(bookId);

    // Sin pasaje elegido la dirección se queda en `/compare`: escribir
    // `/compare//1/1` sería una URL rota que además no lleva a ningún lado.
    if (!slug || !capituloSeleccionadoNumero || !versiculoSeleccionadoNumero) return;

    const codigos = codificarVersiones(bibliasSeleccionadas);
    const consulta = codigos ? `?v=${codigos}` : "";
    const destino = `${slug}/${capituloSeleccionadoNumero}/${versiculoSeleccionadoNumero}${consulta}`;

    if (ultimaLeida.current === destino) return;
    ultimaEscrita.current = destino;

    /*
     * `replace` y no `push`. Cada clic en un versículo cambia la referencia, y
     * apilar una entrada por versículo dejaría el botón "atrás" inservible:
     * habría que pulsarlo veinte veces para salir de un capítulo. Lo que se
     * quiere del historial es volver a la pantalla anterior, no deshacer clic
     * por clic.
     */
    navigate(`/compare/${destino}`, { replace: true });
  }, [bibliasSeleccionadas, libroSeleccionado, capituloSeleccionadoNumero, versiculoSeleccionadoNumero, navigate]);
};
