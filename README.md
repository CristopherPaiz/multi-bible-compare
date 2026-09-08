# Biblian

Lector de la Biblia y comparador de versiones: 150+ traducciones lado a lado,
diccionario Strong hebreo y griego, búsqueda de texto completo, notas
sincronizadas, atlas bíblico y lectura sin conexión (PWA).

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # build + sitemap + prerenderizado de 1262 páginas
npm run lint
```

- `api/` — backend (Turso) y script de migración de los JSON a la base.
- `src/assets/bibles` — los JSON originales de las 150 versiones. Se quedan en
  el repo para poder reconstruir la base con `node api/migrate.mjs build`.
- [`SEO.md`](SEO.md) — cómo está montado el SEO y qué queda por hacer a mano.
