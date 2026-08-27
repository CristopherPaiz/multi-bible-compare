import { registerSW } from "virtual:pwa-register";

/*
 * Con `registerType: "autoUpdate"` este cliente recarga la pestaña solo cuando
 * el service worker nuevo termina de activarse, así un deploy se ve en el
 * siguiente refresco normal sin tener que vaciar la caché.
 *
 * El chequeo periódico es para la PWA instalada: esa se abre una vez y puede
 * quedarse días sin navegar, y sin esto no se enteraría de un deploy nuevo.
 */
const INTERVALO_CHEQUEO_MS = 60 * 60 * 1000;

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;

    setInterval(async () => {
      // Sin conexión `update()` rechaza; no vale la pena reintentar aquí.
      if (!navigator.onLine) return;
      try {
        await registration.update();
      } catch {
        // Un chequeo fallido no debe romper nada: el siguiente lo reintenta.
      }
    }, INTERVALO_CHEQUEO_MS);
  },
});
