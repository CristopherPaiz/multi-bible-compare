/** @type {import('tailwindcss').Config} */
import animations from "@midudev/tailwind-animations";

/*
 * `src/assets` se excluye del escaneo de contenido.
 *
 * Ahí viven ~156,000 archivos: los JSON de las 150 biblias y los mp3 del
 * diccionario Strong. Aunque el patrón `*.{js,jsx}` no los matchee, el glob
 * tiene que RECORRER el árbol para descartarlos, y Tailwind lo reevalúa en cada
 * rebuild. Medido: 4,204 ms sin la exclusión contra 3 ms con ella.
 *
 * Se usa exclusión y no una lista blanca de carpetas a propósito: así una
 * carpeta nueva bajo `src/` queda cubierta sola, sin que haya que acordarse de
 * agregarla aquí (y sin que sus clases desaparezcan en silencio si se olvida).
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "!./src/assets/**"],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [animations],
};
