# SEO de Biblian

Qué se hizo, por qué, y qué falta hacer a mano una sola vez.

---

## El problema de partida

Biblian es una SPA con Vite. El servidor mandaba **siempre** el mismo
`index.html` y React pintaba el contenido después. Para un buscador eso
significaba que las ~1250 direcciones del sitio eran, en el primer vistazo, la
misma página vacía, con el mismo título y la misma descripción.

Además:

- la portada tenía **un solo enlace interno** (el botón "Empezar"): los 1189
  capítulos solo se alcanzaban tocando botones que cambian estado de React, y un
  rastreador no toca botones;
- no había `robots.txt`, ni `sitemap.xml`, ni canónicas, ni Open Graph;
- `manifest.json` vivía en la raíz del repo y **no llegaba a `dist`**: en
  producción daba 404;
- cualquier dirección inventada devolvía la portada con estado **200**.

---

## Lo que hay ahora

### 1. Una sola fuente de verdad para los metadatos

`src/utils/seo.js` calcula título, descripción, canónica, palabras clave y
JSON-LD de cada ruta. Lo consumen dos sitios que **tienen que coincidir**:

| Consumidor | Cuándo actúa |
|---|---|
| `scripts/prerender.mjs` | En el build, escribe el HTML estático de cada ruta |
| `src/components/Seo.jsx` | En el navegador, al cambiar de ruta con el router |

Si divergieran, el buscador se quedaría con lo que ve al renderizar y el
prerenderizado no serviría de nada. El dominio sale de `src/config/sitio.js`
(variable `VITE_SITE_URL`, con `https://biblian.netlify.app` por defecto).

### 2. Prerenderizado: 1262 archivos HTML

`npm run build` corre `vite build` y después `npm run seo`.

- **1189 capítulos** (`/compare/gen/1`): título `Génesis 1 — comparar versiones
  de la Biblia`, descripción con el **primer versículo real**, y el **texto
  completo del capítulo dentro del HTML**, en Reina Valera 1909 (dominio
  público).
- **66 libros** (`/compare/gen`): la app selecciona el capítulo 1 al entrar, así
  que la página se escribe con ese contenido más el índice de sus capítulos. Su
  canónica apunta a `/compare/gen/1` y **no entra en el sitemap**.
- **6 páginas fijas** (`/`, `/compare`, `/search`, `/about`, `/3d`, `/atlas`).
- **`404.html`**, marcado `noindex, follow`.

Cuando React monta, sustituye `#root` entero: el contenido estático es un
respaldo, no hidratación. Dice lo mismo que acaba mostrando la app.

### 3. Enlaces internos que un rastreador puede seguir

`src/components/IndiceLibros.jsx` pinta los 66 libros como `<a href>` reales en
la portada y en el 404. La portada además enlaza a `/search`, `/3d`, `/atlas` y
`/about`, que antes solo estaban en el menú.

### 4. Datos estructurados (JSON-LD)

En todas las páginas: `Organization`, `WebSite` (con `SearchAction`, la caja de
búsqueda en el resultado de Google) y `WebApplication`. Además:

- capítulos y libros: `BreadcrumbList` + `Chapter` dentro de su `Book`;
- `/about`: `FAQPage` con seis preguntas — y las preguntas **se ven en
  pantalla** (`src/components/PreguntasFrecuentes.jsx`), porque marcar contenido
  invisible viola las directrices de Google y cuesta el resultado enriquecido.

### 5. Sitemap

Índice en `/sitemap.xml` que apunta a `/sitemap-paginas.xml` y
`/sitemap-capitulos.xml` (1195 URLs). Partido en dos porque Search Console
informa de la cobertura por sitemap: así se ve si lo que no se indexa son los
capítulos o las páginas fijas.

### 6. Idiomas

`hreflang` es/en/x-default en todas las páginas, con `?lng=es|en`, y
`LanguageContext` ahora **lee ese parámetro** — antes las alternativas anunciadas
al buscador habrían sido mentira, porque la app abría en el idioma guardado.

### 7. 404 de verdad

`public/_redirects` lista las rutas que el router resuelve y manda todo lo demás
a `/404.html` **con estado 404**. Antes cualquier dirección inventada respondía
200 (soft 404) y el buscador la registraba como una página más.

### 8. Otros

- `public/robots.txt`: bloquea `/api/`, `/account`, `/settings`, `/history` y
  `/notes` — pantallas de estado del usuario que gastan presupuesto de rastreo.
- `public/og-image.png` (1200×630) para Open Graph y Twitter Card. Se regenera
  con `npm run og` (usa el Chrome instalado; el PNG se versiona).
- `manifest.json` movido a `public/`, con `id`, `categories`, `screenshots` y
  `shortcuts`.
- `public/_headers`: cabeceras de seguridad y caché correcta para sitemap y
  robots.
- `<meta name="color-scheme">` fijado a `light` y sincronizado desde
  `ThemeContext`: con `light dark` el navegador tomaba el color de texto del
  sistema operativo y quien tuviera el SO en oscuro y la app en claro veía
  **texto blanco sobre fondo blanco**.

---

## Comandos

```bash
npm run build       # vite build + sitemap + prerender
npm run seo         # solo sitemap + prerender (sobre un dist ya construido)
npm run sitemap
npm run prerender
npm run og          # regenera public/og-image.png
```

---

## Puesta en marcha (una sola vez, a mano)

1. **Confirmar el dominio.** Si no es `https://biblian.netlify.app`, definir
   `VITE_SITE_URL` en las variables de entorno de Netlify y reconstruir.
2. **Google Search Console** → añadir la propiedad, verificarla y pegar el
   código en el `<meta name="google-site-verification">` de `index.html` (está
   comentado, junto a la referencia a este archivo).
3. Enviar `https://biblian.netlify.app/sitemap.xml` en Search Console.
4. **Bing Webmaster Tools**: importar la propiedad desde Search Console.
5. Comprobar con la **prueba de resultados enriquecidos** de Google: la portada,
   `/about` (FAQ) y un capítulo (`/compare/jua/3`).
6. Pegar un enlace en WhatsApp o X para ver la miniatura.

## Lo que no depende del código

El ranking para una palabra tan disputada como "biblia" lo deciden sobre todo
enlaces entrantes y autoridad de dominio, no las etiquetas. Lo de aquí quita
todos los frenos técnicos —que eran muchos y grandes— y hace que cada capítulo
pueda competir por su propia consulta (`juan 3 16`, `salmos 91`), que es donde
un sitio nuevo sí puede ganar. Un dominio propio y corto ayudaría más que
cualquier ajuste adicional de metadatos.
