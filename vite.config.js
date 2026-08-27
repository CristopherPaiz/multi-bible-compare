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
  plugins: [
    /*
     * El service worker se registra a mano desde `src/main.jsx` (por eso
     * `injectRegister: null`): así el cliente de `virtual:pwa-register` puede
     * recargar la pestaña sola cuando entra una versión nueva.
     *
     * Antes se usaba `VitePWA()` sin opciones, que es `registerType: "prompt"`:
     * el SW nuevo se quedaba esperando en `waiting` para siempre porque nadie
     * mostraba el prompt, y la única forma de ver un deploy era borrar la caché
     * a mano. Con `autoUpdate` + `skipWaiting` + `clientsClaim` el SW nuevo toma
     * el control apenas se instala.
     */
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      // El manifest real es `public/manifest.json`, enlazado desde index.html.
      // Sin esto el plugin emite un segundo manifest vacio y compiten.
      manifest: false,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        // Borra los precaches de builds viejos en vez de acumularlos.
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // El backend nunca debe caer en el fallback a index.html.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
    react(),
  ],
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
