import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react-swc";

/*
 * Los JSON de las 150 biblias y los mp3 del diccionario viven en `src/assets`:
 * ~156,000 archivos. Se quedan en el repo a propósito, para que cualquiera
 * pueda reconstruir la base con `node api/migrate.mjs build`.
 *
 * El problema es que el servidor de desarrollo los trataba como código fuente:
 * chokidar abría un watcher por archivo y el arranque se iba a minutos. Se
 * excluyen del watcher y del pre-bundling. NO se borran ni se mueven: el script
 * de migración los lee del disco directamente, sin pasar por Vite.
 */
const ASSETS_PESADOS = ["**/src/assets/bibles/**", "**/src/assets/strongs/**"];

export default defineConfig({
  plugins: [VitePWA(), react()],
  server: {
    watch: {
      ignored: ASSETS_PESADOS,
    },
  },
  optimizeDeps: {
    // El escaneo de dependencias tampoco tiene nada que buscar ahí.
    entries: ["index.html", "src/**/*.{js,jsx}", "!src/assets/**"],
  },
});
