# Biblian API

Backend Turso para la app de comparación bíblica. Express + TypeScript + libSQL.

## Arranque

```bash
cd api
npm install
cp .env.example .env     # y rellena los valores marcados <RELLENAR>
npm run dev
```

> La base ya vive en Turso con las 150 versiones cargadas. Este repo contiene
> solo el runtime de la API: no incluye las herramientas de migración ni el
> esquema, porque no hacen falta para servir.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga en caliente (`tsx watch`) |
| `npm run build` | `tsc` + `tsc-alias` a `dist/` |
| `npm start` | Corre `dist/server.js` (producción) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Endpoints

### Público

| Método | Ruta | Qué devuelve |
|---|---|---|
| `GET` | `/health` `/ping` `/status` | Health check simple |
| `GET` | `/api/system/status` | Estado + latencia de BD + features activas |
| `GET` | `/api/system/time` | Hora de Guatemala (Regla 11) |
| `GET` | `/api/system/stats` | Conteos y peso de lo importado |
| `GET` | `/api/bibles` | Catálogo de versiones. Filtros: `?language=` `?searchable=` |
| `GET` | `/api/books` | Los 66 libros con su número de capítulos |
| `GET` | `/api/chapters?bibles=1,34&book=43&chapter=3` | **N versiones en una sola consulta** |
| `GET` | `/api/chapters/:bibleId/:bookId/:chapter` | Un capítulo de una versión |
| `GET` | `/api/verses?bibles=1,34&book=43&chapter=3&verse=16` | Un versículo en N versiones |
| `GET` | `/api/search?q=amor&bibles=34&page=1` | Búsqueda full-text (FTS5) |
| `GET` | `/api/strongs/:code` | Entrada Strong (`G2424`, `H0430`) + `audioUrl` |
| `GET` | `/api/strongs/:code/audio` | Redirect 302 al mp3 público |

### Autenticado (cookie httpOnly o `Authorization: Bearer`)

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/auth/register` `/login` `/logout` | Sesión |
| `GET` | `/api/auth/me` | Usuario actual |
| `GET` `PUT` | `/api/user/favorites` | Favoritos sincronizados |
| `GET` `POST` `DELETE` | `/api/user/history` | Historial sincronizado |
| `POST` | `/api/upload/image` | Sube imagen a Cloudinary (opcional) |

## Por qué el esquema es así

Todas estas decisiones salieron de medir los datos reales, no de estimarlas.

**1. Fila = capítulo, no fila = versículo.**
Son ~3.7 M versículos en 141,897 capítulos. Con una fila por versículo, el
overhead de fila de SQLite hacía que la base pesara **852 MB — más que los 718 MB
de JSON originales**. Agrupando por capítulo el overhead desaparece, y calza con
cómo lee la app: siempre pide capítulos completos.

**2. `Chapters.body` es un BLOB con gzip.**
Dentro va texto plano: los versículos del capítulo unidos por ``. Se
comprime porque SQLite **no comprime TEXT** — el mismo dato como columna TEXT
ocupa 2.6x más (medido: 716 MB vs 236 MB). El BLOB es solo el envase: gzip
produce bytes binarios y una columna TEXT los corrompería.

**3. El markup `<sup>NNNN </sup>` se conserva inline.**
Se probó separarlo a su propia columna. Después de gzip solo ahorra **3-16%**
(comprime muy bien por repetitivo), a cambio de perder la alineación
palabra↔Strong. La UI la necesita: renderiza el HTML directo con
`dangerouslySetInnerHTML` y el clic sobre el `<sup>` abre el diccionario.

**4. La búsqueda usa FTS5 `contentless` (`content=''`).**
No se puede buscar dentro de un BLOB gzip, así que hay un índice aparte. Guarda
solo los términos, no el texto — el texto ya vive en `Chapters.body`. Eso baja el
costo de 7.3 MB a **2.9 MB por versión**, y por eso están indexadas **las 150**
(~434 MB) en vez de un puñado.

**5. El rowid del índice ES la referencia bíblica.**
```
rowid = (bible_id << 24) | (book_id << 16) | (chapter << 8) | verse
```
Sin tabla de mapeo: del resultado se deduce el versículo directo. Y como los
versículos de una versión quedan contiguos, filtrar por una biblia es
`rowid BETWEEN lo AND hi` — un rango, no un escaneo (~0.3 ms).
Ver `src/utils/reference.helper.ts`.

**6. El índice guarda el texto SIN el markup.**
Si no, los números Strong quedan pegados entre palabras y rompen la
tokenización. `remove_diacritics 2` hace que "corazon" encuentre "corazón".

## Numeración de libros: dos versiones fuera de convención

El importador detecta y corrige automáticamente dos casos, y lo reporta:

| Versión | Numeraba | Corregido |
|---|---|---|
| Sagradas Escrituras (1975) | NT como `1..27` | offset `+39` |
| Codex Sinaiticus (1862) | NT como `47..73` | offset `-7` |

Sin corregirlo, Mateo se guardaba como libro 1 y **sobrescribía Génesis**.

La detección no adivina: exige que el testamento traiga exactamente sus libros
(27 el NT, 39 el AT) en rango contiguo, y valida el desplazamiento contra la
huella de cuántos capítulos tiene cada libro. Ambos casos dieron **27/27**.
Si la huella no calza, no remapea y lo reporta.

También descarta un `chapter0.json` suelto en Nestle (1904).

## Lo que reemplaza

Antes la UI montaba un `<VerseWindow>` por versión y cada uno hacía su propio
`fetch` a `raw.githubusercontent.com`: **20 versiones = 20 round-trips** con rate
limit y sin caché útil. Ahora `GET /api/chapters` los resuelve en **una sola
consulta**.

## Deploy

`render.yaml` está listo. Las credenciales van en el dashboard de Render
(Environment), nunca en el archivo — se commitea al repo.

Ojo con el plan free de Render: el servicio se duerme y el primer request tarda
30-60s. La UI debería llamar `/api/system/status` al arrancar para despertarlo
mientras muestra su loader.
