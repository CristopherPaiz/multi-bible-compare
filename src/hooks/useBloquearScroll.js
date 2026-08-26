import { useEffect } from "react";

/**
 * Bloquea el scroll del fondo mientras un modal está abierto.
 *
 * Sin esto ocurre "scroll chaining": al llegar al final del contenido del modal,
 * la rueda sigue desplazando la página de atrás, que es justo lo que no debe
 * pasar.
 *
 * Se guarda la posición y se restaura al cerrar, porque `position: fixed` sobre
 * el body hace que la página salte al inicio. Se usa `fixed` y no
 * `overflow: hidden` porque en iOS Safari `overflow` no detiene el arrastre.
 */
export const useBloquearScroll = (activo) => {
  useEffect(() => {
    if (!activo) return;

    const y = window.scrollY;
    const { overflow, position, top, width } = document.body.style;
    // Compensa el ancho de la barra de scroll para que el fondo no dé un salto
    // lateral al ocultarla.
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      document.body.style.paddingRight = "";
      window.scrollTo(0, y);
    };
  }, [activo]);
};
