/**
 * Genera `public/og-image.png`, la miniatura de 1200x630 que se ve cuando
 * alguien pega un enlace de Biblian en WhatsApp, X, Facebook, Slack o Discord.
 *
 * Se ejecuta A MANO (`npm run og`) y el PNG se versiona, en vez de correr en
 * cada build. El motivo es que la única forma razonable de rasterizar texto sin
 * añadir una dependencia de 200 MB es pedírselo a un Chrome ya instalado, y en
 * el servidor de despliegue no hay ninguno garantizado: un build que dependa de
 * eso falla el día que cambie la imagen del CI. La imagen cambia una vez al
 * año; el build corre cada commit.
 *
 *   npm run og
 *   CHROME_PATH="/ruta/a/chrome" npm run og   (si no lo encuentra solo)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SITE_NAME, TOTAL_VERSIONES } from "../src/config/sitio.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = path.join(RAIZ, "public", "og-image.png");

/* Rutas habituales del navegador en cada sistema. Se prueba en orden y se usa
   el primero que exista; `CHROME_PATH` gana sobre todas. */
const CANDIDATOS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const navegador = CANDIDATOS.find((ruta) => fs.existsSync(ruta));
if (!navegador) {
  console.error("[og] No se encontró Chrome ni Edge. Define CHROME_PATH con la ruta al ejecutable.");
  process.exit(1);
}

/* El fondo va incrustado en base64: con `file://` el navegador aplica sus
   reglas de origen y la imagen no siempre carga, y una miniatura sin fondo se
   publica igual —el fallo no se ve hasta que alguien comparte el enlace—. */
const fondo = fs.readFileSync(path.join(RAIZ, "public", "bibleBackground.webp")).toString("base64");

const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1200px; height: 630px; overflow: hidden;
        font-family: Georgia, "Times New Roman", serif; color: #fff;
        background: #100d08;
      }
      .fondo {
        position: absolute; inset: 0;
        background-image: url("data:image/webp;base64,${fondo}");
        background-size: cover; background-position: center;
        filter: saturate(0.85);
      }
      .velo { position: absolute; inset: 0; background: linear-gradient(105deg, rgba(8,6,3,0.94) 0%, rgba(8,6,3,0.86) 45%, rgba(8,6,3,0.45) 100%); }
      .contenido { position: relative; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 0 84px; }
      .marca { font-size: 108px; font-weight: 700; letter-spacing: -2px; line-height: 1; }
      .barra { width: 96px; height: 6px; background: #f5c461; border-radius: 3px; margin: 26px 0 24px; }
      .titular { font-size: 42px; font-weight: 600; line-height: 1.2; max-width: 800px; }
      .apoyo { font-size: 24px; line-height: 1.45; margin-top: 20px; max-width: 760px; color: #e9e2d4; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .pie { position: absolute; bottom: 46px; left: 84px; right: 84px; display: flex; gap: 12px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .etiqueta { font-size: 19px; padding: 9px 18px; border: 1px solid rgba(245,196,97,0.5); border-radius: 999px; color: #f5c461; }
    </style>
  </head>
  <body>
    <div class="fondo"></div>
    <div class="velo"></div>
    <div class="contenido">
      <div class="marca">${SITE_NAME}</div>
      <div class="barra"></div>
      <div class="titular">Biblia en línea: compara versiones lado a lado</div>
      <div class="apoyo">${TOTAL_VERSIONES}+ versiones · Reina Valera, NVI, LBLA, Textual · interlineal griego y hebreo · diccionario Strong</div>
      <div class="pie">
        <span class="etiqueta">Gratis</span>
        <span class="etiqueta">Sin registro</span>
        <span class="etiqueta">Sin anuncios</span>
        <span class="etiqueta">Funciona sin conexión</span>
      </div>
    </div>
  </body>
</html>`;

const temporal = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "biblian-og-")), "og.html");
fs.writeFileSync(temporal, html, "utf8");

execFileSync(
  navegador,
  ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630", `--screenshot=${SALIDA}`, `file://${temporal.replace(/\\/g, "/")}`],
  { stdio: "inherit" }
);

const bytes = fs.statSync(SALIDA).size;
console.log(`[og] ${SALIDA} — ${(bytes / 1024).toFixed(0)} KB`);
