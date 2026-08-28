/**
 * ============================================================================
 *  BIBLIAN — herramienta unica de migracion y mantenimiento
 * ============================================================================
 *
 * Todo lo que no es runtime de la API vive AQUI, en un solo archivo. La API en
 * si (src/) no depende de nada de esto: la base ya esta cargada en Turso.
 *
 *   node migrate.mjs build            construye build/biblian.db desde los JSON
 *   node migrate.mjs schema           aplica el esquema a una base Turso vacia
 *   node migrate.mjs audio            sube los MP3 del diccionario a Scaleway
 *   node migrate.mjs audio --dry-run  muestra que subiria, sin subir
 *   node migrate.mjs strongs-index    concordancia inversa Strong
 *   node migrate.mjs crossrefs --file=<tsv>   referencias cruzadas (TSK)
 *   node migrate.mjs stats            estado de la base en Turso
 *   node migrate.mjs sql "<SQL>"      consulta directa contra Turso
 *
 * Los dos ultimos comandos de datos son OPCIONALES y no hace falta correrlos
 * para que la app funcione: si sus tablas estan vacias, los paneles de
 * referencias cruzadas y de concordancia lo dicen y el resto sigue igual.
 *
 * Requisitos: las variables de api/.env. Para `build` hacen falta los JSON en
 * ../src/assets (que es justo lo que se saca del repo tras migrar).
 *
 * ---------------------------------------------------------------------------
 * DECISIONES DE DISENO (medidas, no estimadas)
 * ---------------------------------------------------------------------------
 * - Fila = capitulo, no fila = versiculo. Con una fila por versiculo el
 *   overhead de SQLite hacia que la base pesara 852 MB, MAS que los 718 MB de
 *   JSON originales.
 * - `body` es BLOB con gzip: SQLite no comprime TEXT, y el mismo dato como TEXT
 *   ocupa 2.6x mas (716 MB vs 236 MB). Dentro va texto plano, los versiculos
 *   unidos por \u001f.
 * - El markup `<sup>NNNN </sup>` se conserva inline. Separarlo solo ahorra
 *   3-16% tras gzip y rompe la alineacion palabra-Strong que la UI necesita.
 * - Busqueda con FTS5 `contentless`: guarda solo terminos, no el texto (ya esta
 *   en el BLOB). Baja de 7.3 MB a 2.9 MB por version, y por eso caben las 150.
 * - El rowid del indice ES la referencia biblica, sin tabla de mapeo.
 */
import { createClient } from '@libsql/client'
import { S3Client, PutObjectCommand, ListObjectsV2Command, CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3'
import { gzipSync, gunzipSync } from 'node:zlib'
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT = resolve(HERE, '..')
const ASSETS = join(PROJECT, 'src', 'assets')

const VERSE_SEPARATOR = '\u001f'
const LAST_OLD_TESTAMENT_BOOK = 39

const CHAPTER_COUNTS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1,
  4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22
]
const OT_CHAPTER_COUNTS = CHAPTER_COUNTS.slice(0, 39)
const NT_CHAPTER_COUNTS = CHAPTER_COUNTS.slice(39)

// ---------------------------------------------------------------------------
// Esquema
// ---------------------------------------------------------------------------

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS Bibles (
    id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    language TEXT NOT NULL, year INTEGER, has_strongs INTEGER NOT NULL DEFAULT 0,
    has_old INTEGER NOT NULL DEFAULT 0, has_new INTEGER NOT NULL DEFAULT 0,
    searchable INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
    legacy_path TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_bibles_lang ON Bibles(language, sort_order)`,

  `CREATE TABLE IF NOT EXISTS Books (
    id INTEGER PRIMARY KEY, testament TEXT NOT NULL CHECK (testament IN ('old','new')),
    chapter_count INTEGER NOT NULL)`,

  `CREATE TABLE IF NOT EXISTS Chapters (
    bible_id INTEGER NOT NULL, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
    verse_count INTEGER NOT NULL, encoding TEXT NOT NULL DEFAULT 'gzip', body BLOB NOT NULL)`,
  // (book_id, chapter) primero: asi las N versiones de un capitulo caen en un
  // rango contiguo del indice en vez de N busquedas sueltas.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_lookup ON Chapters(book_id, chapter, bible_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_bible ON Chapters(bible_id)`,

  `CREATE VIRTUAL TABLE IF NOT EXISTS SearchIndex USING fts5(
    text, content='', tokenize="unicode61 remove_diacritics 2")`,

  `CREATE TABLE IF NOT EXISTS Strongs (
    code TEXT PRIMARY KEY, language TEXT NOT NULL CHECK (language IN ('greek','hebrew')),
    number INTEGER NOT NULL, title TEXT, lemma TEXT, transliteration TEXT,
    pronunciation TEXT, definition TEXT, audio_key TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_strongs_lang_num ON Strongs(language, number)`,

  `CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,

  `CREATE TABLE IF NOT EXISTS UserFavorites (
    user_id INTEGER NOT NULL, bible_id INTEGER NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, bible_id))`,

  `CREATE TABLE IF NOT EXISTS UserHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, bible_ids TEXT NOT NULL,
    book_id INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  `CREATE INDEX IF NOT EXISTS idx_history_user ON UserHistory(user_id, created_at DESC)`,

  // El resaltado es UNA fila por versiculo y usuario: un versiculo no puede
  // tener dos colores a la vez, asi que la clave primaria compuesta hace que
  // volver a pintarlo sea un REPLACE y no una fila duplicada.
  `CREATE TABLE IF NOT EXISTS UserHighlights (
    user_id INTEGER NOT NULL, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL, color TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    PRIMARY KEY (user_id, book_id, chapter, verse))`,
  `CREATE INDEX IF NOT EXISTS idx_highlights_user ON UserHighlights(user_id, book_id, chapter)`,

  // Las notas SI pueden ser varias por versiculo (una por idea), asi que llevan
  // id propio.
  `CREATE TABLE IF NOT EXISTS UserNotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  `CREATE INDEX IF NOT EXISTS idx_notes_user ON UserNotes(user_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_ref ON UserNotes(user_id, book_id, chapter, verse)`,

  // Referencias cruzadas (Treasury of Scripture Knowledge, dominio publico).
  //
  // `from_ref` y `to_ref` usan el mismo empaquetado que el rowid del indice
  // FTS5 pero SIN el campo de version: book*65536 + chapter*256 + verse. La
  // referencia cruzada no pertenece a ninguna traduccion, es del texto.
  //
  // `to_end` guarda el final cuando el destino es un rango (Gen 1:1-5). Va
  // aparte y no como N filas porque el rango se cita entero.
  `CREATE TABLE IF NOT EXISTS CrossRefs (
    from_ref INTEGER NOT NULL, to_ref INTEGER NOT NULL, to_end INTEGER,
    votes INTEGER NOT NULL DEFAULT 0)`,
  // `votes DESC` dentro del indice: la consulta siempre pide las mejores
  // referencias de un versiculo, asi que el orden sale del indice y no de un
  // ORDER BY que tendria que materializar y ordenar todas.
  `CREATE INDEX IF NOT EXISTS idx_crossrefs_from ON CrossRefs(from_ref, votes DESC)`,

  // Concordancia inversa: donde aparece cada numero Strong.
  //
  // `ref` con el mismo empaquetado que CrossRefs. `hits` es cuantas veces sale
  // el codigo EN ese versiculo (Gen 1:1 repite H430 varias veces en algunas
  // ediciones), asi no hacen falta filas repetidas.
  `CREATE TABLE IF NOT EXISTS StrongOccurrences (
    code TEXT NOT NULL, ref INTEGER NOT NULL, hits INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (code, ref))`,
  `CREATE INDEX IF NOT EXISTS idx_strongocc_code ON StrongOccurrences(code, ref)`,

  `CREATE TABLE IF NOT EXISTS ErrorLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT, method TEXT, error_message TEXT,
    stack_trace TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  `CREATE INDEX IF NOT EXISTS idx_errorlogs_created ON ErrorLogs(created_at DESC)`
]

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const mb = (bytes) => `${(Number(bytes ?? 0) / 1048576).toFixed(1)} MB`
const num = (value) => Number(value ?? 0).toLocaleString()

const turso = () => {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url || !authToken) {
    console.error('Faltan TURSO_DATABASE_URL / TURSO_AUTH_TOKEN en api/.env')
    process.exit(1)
  }
  return createClient({ url, authToken })
}

/** rowid = (bible << 24) | (book << 16) | (chapter << 8) | verse. */
const encodeReference = (bibleId, bookId, chapter, verse) =>
  bibleId * 16777216 + bookId * 65536 + chapter * 256 + verse

/**
 * Deja el versiculo en texto limpio para el indice FTS5.
 *
 * Se borra el CONTENIDO de `<sup>` (numero Strong), `<m>` (codigo morfologico)
 * y `<f>` (marca de nota), no solo sus etiquetas: no son texto biblico y nadie
 * los busca. La glosa `<n>` se conserva porque es la unica traduccion en
 * espanol que tienen las versiones interlineales.
 *
 * Debe coincidir con `stripStrongMarkup` en src/utils/reference.helper.ts.
 */
const stripMarkup = (text) =>
  text
    .replace(/<sup>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<m>[\s\S]*?<\/m>/gi, ' ')
    .replace(/<f>[\s\S]*?<\/f>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

/** "034. Español - Biblia Reina Valera (1960)" -> partes. */
const parseBibleDir = (name) => {
  const match = /^(\d+)\.\s*(.+?)\s+-\s+(.+)$/.exec(name)
  if (!match) return null
  const language = match[2].trim()
  const rest = match[3].trim().replace(/\s*\($/, '').trim()
  const years = [...rest.matchAll(/[([](\d{3,4})[)\]]/g)].map((m) => Number(m[1]))
  const year = years.length > 0 ? years[years.length - 1] : null
  const title = rest.replace(/\s*[([]\d{3,4}[)\]]\s*$/, '').trim()
  // Tres carpetas Nahuatl vienen sin titulo ("56. Nahuatl - (2012)").
  return { language, name: title || language, year }
}

// ---------------------------------------------------------------------------
// build — construye la base completa en local
// ---------------------------------------------------------------------------

const commandBuild = async () => {
  const { DatabaseSync } = await import('node:sqlite')
  const BIBLES_DIR = join(ASSETS, 'bibles')
  const STRONGS_DIR = join(ASSETS, 'strongs')
  const OUT = join(HERE, 'build', 'biblian.db')

  if (!existsSync(BIBLES_DIR)) {
    console.error(`No existe ${BIBLES_DIR}. Este comando necesita los JSON originales.`)
    process.exit(1)
  }

  mkdirSync(dirname(OUT), { recursive: true })
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    if (existsSync(OUT + suffix)) rmSync(OUT + suffix)
  }

  const db = new DatabaseSync(OUT)
  db.exec('PRAGMA journal_mode = OFF')
  db.exec('PRAGMA synchronous = OFF')
  for (const statement of SCHEMA) db.exec(statement)

  const insertBook = db.prepare('INSERT OR REPLACE INTO Books (id, testament, chapter_count) VALUES (?, ?, ?)')
  db.exec('BEGIN')
  CHAPTER_COUNTS.forEach((count, index) => {
    insertBook.run(index + 1, index + 1 <= LAST_OLD_TESTAMENT_BOOK ? 'old' : 'new', count)
  })
  db.exec('COMMIT')

  const insertBible = db.prepare(
    `INSERT OR REPLACE INTO Bibles (id, slug, name, language, year, has_strongs, has_old, has_new, searchable, sort_order, legacy_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  )
  const insertChapter = db.prepare(
    `INSERT OR REPLACE INTO Chapters (bible_id, book_id, chapter, verse_count, encoding, body)
     VALUES (?, ?, ?, ?, 'gzip', ?)`
  )
  const insertIndex = db.prepare('INSERT INTO SearchIndex(rowid, text) VALUES (?, ?)')

  const directories = readdirSync(BIBLES_DIR)
    .filter((name) => name !== 'JSON_DATA' && statSync(join(BIBLES_DIR, name)).isDirectory())
    .sort()

  console.log(`Versiones: ${directories.length}\nSalida   : ${OUT}\n`)

  const startedAt = Date.now()
  let totalChapters = 0
  let totalIndexed = 0
  let totalBytes = 0
  const problems = []

  directories.forEach((directory, position) => {
    const parsed = parseBibleDir(directory)
    if (!parsed) {
      problems.push(`Nombre no parseable: ${directory}`)
      return
    }

    const bibleId = position + 1
    const bibleRoot = join(BIBLES_DIR, directory)
    let hasStrongs = 0
    let chaptersHere = 0
    const seen = new Set()

    db.exec('BEGIN')

    for (const testament of ['Old', 'New']) {
      const testamentDir = join(bibleRoot, testament)
      if (!existsSync(testamentDir)) continue

      // Dos versiones usan numeracion no canonica: Sagradas Escrituras (1975)
      // numera el NT 1..27, y Codex Sinaiticus 47..73. Sin corregirlo, Mateo se
      // guarda como libro 1 y pisa a Genesis.
      //
      // La deteccion no adivina: exige el conteo exacto de libros en rango
      // contiguo, y valida el desplazamiento contra la huella de cuantos
      // capitulos tiene cada libro. Si no calza, no remapea y lo reporta.
      const expected = testament === 'New' ? NT_CHAPTER_COUNTS : OT_CHAPTER_COUNTS
      const firstCanonical = testament === 'New' ? LAST_OLD_TESTAMENT_BOOK + 1 : 1

      const present = readdirSync(testamentDir)
        .map((entry) => /^book(\d+)$/.exec(entry))
        .filter(Boolean)
        .map((match) => Number(match[1]))
        .sort((a, b) => a - b)

      let bookOffset = 0
      const contiguous =
        present.length === expected.length && present[present.length - 1] - present[0] === expected.length - 1

      if (contiguous && present[0] !== firstCanonical) {
        const candidate = firstCanonical - present[0]
        const fingerprint = present.filter((bookNumber, index) => {
          const folder = join(testamentDir, `book${bookNumber}`)
          const count = readdirSync(folder).filter((file) => /^chapter\d+\.json$/.test(file)).length
          return count === expected[index]
        }).length

        if (fingerprint >= expected.length - 2) {
          bookOffset = candidate
          problems.push(
            `${directory}: ${testament} numerado ${present[0]}..${present[present.length - 1]}, ` +
              `remapeado con offset ${candidate > 0 ? '+' : ''}${candidate} (huella ${fingerprint}/${expected.length})`
          )
        } else {
          problems.push(
            `${directory}: ${testament} empieza en book${present[0]} pero la huella no calza ` +
              `(${fingerprint}/${expected.length}); se deja sin remapear`
          )
        }
      }

      for (const bookFolder of readdirSync(testamentDir)) {
        const bookMatch = /^book(\d+)$/.exec(bookFolder)
        if (!bookMatch) continue
        const bookId = Number(bookMatch[1]) + bookOffset
        const bookDir = join(testamentDir, bookFolder)

        for (const file of readdirSync(bookDir)) {
          const chapterMatch = /^chapter(\d+)\.json$/.exec(file)
          if (!chapterMatch) continue
          const chapter = Number(chapterMatch[1])
          if (chapter < 1) {
            problems.push(`Capitulo 0 descartado: ${directory}/${testament}/${bookFolder}/${file}`)
            continue
          }

          let raw
          try {
            raw = JSON.parse(readFileSync(join(bookDir, file), 'utf8'))
          } catch {
            problems.push(`JSON invalido: ${directory}/${testament}/${bookFolder}/${file}`)
            continue
          }
          if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            problems.push(`Forma inesperada: ${directory}/${testament}/${bookFolder}/${file}`)
            continue
          }

          const numbers = Object.keys(raw)
            .filter((key) => /^\d+$/.test(key))
            .map(Number)
          if (numbers.length === 0) continue
          const maxVerse = Math.max(...numbers)

          // El numero de versiculo es la POSICION en el array; los huecos se
          // rellenan con cadena vacia para no desalinear la numeracion.
          const verses = []
          for (let verse = 1; verse <= maxVerse; verse++) {
            const text = raw[String(verse)]
            verses.push(typeof text === 'string' ? text : '')
          }

          const key = `${bookId}:${chapter}`
          if (seen.has(key)) {
            problems.push(`COLISION descartada: ${directory} libro ${bookId} cap ${chapter}`)
            continue
          }
          seen.add(key)

          if (!hasStrongs && verses.some((text) => text.includes('<sup>'))) hasStrongs = 1

          const body = gzipSync(Buffer.from(verses.join(VERSE_SEPARATOR), 'utf8'), { level: 9 })
          insertChapter.run(bibleId, bookId, chapter, maxVerse, body)
          totalBytes += body.length
          chaptersHere++

          if (chapter > 255) {
            problems.push(`Capitulo fuera de rango: ${directory} libro ${bookId} cap ${chapter}`)
            continue
          }
          for (let verse = 1; verse <= maxVerse; verse++) {
            if (verse > 255) {
              problems.push(`Versiculo fuera de rango: ${directory} ${bookId} ${chapter}:${verse}`)
              break
            }
            // El indice guarda el texto SIN markup: si no, los numeros Strong
            // quedan pegados entre palabras y rompen la tokenizacion.
            const clean = stripMarkup(verses[verse - 1])
            if (!clean) continue
            insertIndex.run(encodeReference(bibleId, bookId, chapter, verse), clean)
            totalIndexed++
          }
        }
      }
    }

    insertBible.run(
      bibleId,
      slugify(`${parsed.language}-${parsed.name}-${parsed.year ?? ''}`),
      parsed.name,
      parsed.language,
      parsed.year,
      hasStrongs,
      existsSync(join(bibleRoot, 'Old')) ? 1 : 0,
      existsSync(join(bibleRoot, 'New')) ? 1 : 0,
      bibleId,
      directory
    )
    db.exec('COMMIT')

    totalChapters += chaptersHere
    const done = position + 1
    const eta = ((Date.now() - startedAt) / 1000 / done) * (directories.length - done)
    console.log(
      `[${String(done).padStart(3)}/${directories.length}] ${parsed.name.slice(0, 40).padEnd(40)} ` +
        `${String(chaptersHere).padStart(4)} cap  ${hasStrongs ? 'strongs' : '       '}  ${mb(totalBytes).padStart(9)}  ETA ${Math.round(eta)}s`
    )
  })

  // Diccionario Strong
  if (existsSync(STRONGS_DIR)) {
    const insertStrong = db.prepare(
      `INSERT OR REPLACE INTO Strongs (code, language, number, title, lemma, transliteration, pronunciation, definition, audio_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    db.exec('BEGIN')
    let count = 0
    for (const [folder, language, prefix] of [
      ['Griego', 'greek', 'G'],
      ['Hebreo', 'hebrew', 'H']
    ]) {
      const folderPath = join(STRONGS_DIR, folder)
      if (!existsSync(folderPath)) continue
      for (const file of readdirSync(folderPath)) {
        if (!file.endsWith('.json')) continue
        let entries
        try {
          entries = JSON.parse(readFileSync(join(folderPath, file), 'utf8'))
        } catch {
          problems.push(`Strong JSON invalido: ${folder}/${file}`)
          continue
        }
        if (!Array.isArray(entries)) continue
        for (const entry of entries) {
          const code = String(entry.id ?? '').toUpperCase()
          if (!new RegExp(`^${prefix}\\d+$`).test(code)) continue
          const number = Number(code.slice(1))
          insertStrong.run(
            code,
            language,
            number,
            entry.ti ?? null,
            entry.le ?? null,
            entry.pl ?? null,
            entry.ps ?? null,
            entry.df ?? null,
            `${number}.mp3`
          )
          count++
        }
      }
    }
    db.exec('COMMIT')
    console.log(`\nStrongs: ${num(count)}`)
  }

  console.log('\nOptimizando FTS5 y compactando...')
  db.exec("INSERT INTO SearchIndex(SearchIndex) VALUES('optimize')")
  db.exec('VACUUM')
  db.close()

  console.log(`\n${'='.repeat(58)}`)
  console.log(`  Capitulos     : ${num(totalChapters)}`)
  console.log(`  Indexados     : ${num(totalIndexed)}`)
  console.log(`  Texto gzip    : ${mb(totalBytes)}`)
  console.log(`  ARCHIVO       : ${mb(statSync(OUT).size)}`)
  console.log(`  Tiempo        : ${Math.round((Date.now() - startedAt) / 1000)}s`)
  console.log(`${'='.repeat(58)}`)

  if (problems.length > 0) {
    console.log(`\nIncidencias (${problems.length}):`)
    problems.slice(0, 20).forEach((problem) => console.log(`  - ${problem}`))
  }

  console.log(`\nPara subirlo a Turso hace falta el CLI (solo Linux/macOS; en Windows via WSL):`)
  console.log(`  turso db create <nombre> --from-file ${OUT}`)
  console.log(`Nota: --from-file requiere el binario sqlite3 en el PATH.`)
}

// ---------------------------------------------------------------------------
// schema — aplica el esquema a una base Turso vacia
// ---------------------------------------------------------------------------

const commandSchema = async () => {
  const client = turso()
  for (const statement of SCHEMA) await client.execute(statement)
  console.log(`Esquema aplicado (${SCHEMA.length} sentencias).`)

  await client.batch(
    CHAPTER_COUNTS.map((count, index) => ({
      sql: 'INSERT OR REPLACE INTO Books (id, testament, chapter_count) VALUES (?, ?, ?)',
      args: [index + 1, index + 1 <= LAST_OLD_TESTAMENT_BOOK ? 'old' : 'new', count]
    })),
    'write'
  )
  console.log(`Books sembrada: 66 libros, ${CHAPTER_COUNTS.reduce((a, b) => a + b, 0)} capitulos.`)
}

// ---------------------------------------------------------------------------
// audio — sube los MP3 del diccionario Strong a Scaleway
// ---------------------------------------------------------------------------

const commandAudio = async (dryRun, createBucket) => {
  const required = [
    'SCALEWAY_ENDPOINT',
    'SCALEWAY_REGION',
    'SCALEWAY_BUCKET_NAME',
    'SCALEWAY_ACCESS_KEY_ID',
    'SCALEWAY_SECRET_ACCESS_KEY'
  ]
  const missing = required.filter((name) => !process.env[name])
  if (missing.length > 0) {
    console.error(`Faltan en api/.env: ${missing.join(', ')}`)
    process.exit(1)
  }

  const bucket = process.env.SCALEWAY_BUCKET_NAME
  const client = new S3Client({
    endpoint: process.env.SCALEWAY_ENDPOINT,
    region: process.env.SCALEWAY_REGION,
    credentials: {
      accessKeyId: process.env.SCALEWAY_ACCESS_KEY_ID,
      secretAccessKey: process.env.SCALEWAY_SECRET_ACCESS_KEY
    }
  })

  // El bucket se crea PRIVADO a nivel de listado; lo que se hace publico es cada
  // objeto (ACL public-read al subirlo). Asi el audio se cachea en el navegador
  // y el CDN, pero nadie puede enumerar el contenido del bucket.
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    if (!createBucket) {
      console.error(`El bucket '${bucket}' no existe.`)
      console.error(`Para crearlo:  node migrate.mjs audio --create-bucket`)
      process.exit(1)
    }
    console.log(`Creando bucket '${bucket}' (listado privado)...`)
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
    console.log('Creado.')
  }

  // Politica CORS del bucket.
  //
  // Reproducir un mp3 con <audio> NO necesita CORS, y la UI lo hace asi a
  // proposito. Pero sin esta politica, cualquier `fetch()` contra el bucket
  // falla con "Failed to fetch", que es un pie que se puede pisar facil mas
  // adelante (precarga, descargas, comprobaciones). Se deja configurado.
  try {
    await client.send(new GetBucketCorsCommand({ Bucket: bucket }))
    console.log('El bucket ya tiene politica CORS.')
  } catch {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              // Solo lectura y desde cualquier origen: el contenido es publico
              // e inmutable, no hay nada que proteger con el origen.
              AllowedMethods: ['GET', 'HEAD'],
              AllowedOrigins: ['*'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['Content-Length', 'Content-Type', 'Accept-Ranges'],
              MaxAgeSeconds: 86400
            }
          ]
        }
      })
    )
    console.log('Politica CORS aplicada al bucket.')
  }

  const sources = [
    ['Audio_Griego', process.env.STORAGE_AUDIO_GREEK_PREFIX ?? 'strongs/audio/greek'],
    ['Audio_Hebreo', process.env.STORAGE_AUDIO_HEBREW_PREFIX ?? 'strongs/audio/hebrew']
  ]

  // Que hay ya en el bucket, para poder reanudar si se corta.
  const existing = new Set()
  for (const [, prefix] of sources) {
    let token
    do {
      const page = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })
      )
      for (const item of page.Contents ?? []) existing.add(item.Key)
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
  }
  console.log(`Ya en el bucket: ${num(existing.size)} objetos\n`)

  const pending = []
  let totalBytes = 0
  for (const [folder, prefix] of sources) {
    const folderPath = join(ASSETS, 'strongs', folder)
    if (!existsSync(folderPath)) {
      console.warn(`No existe ${folderPath}, se omite.`)
      continue
    }
    for (const file of readdirSync(folderPath)) {
      if (!file.toLowerCase().endsWith('.mp3')) continue
      const key = `${prefix}/${file}`
      if (existing.has(key)) continue
      const path = join(folderPath, file)
      const size = statSync(path).size
      totalBytes += size
      pending.push({ path, key, size })
    }
  }

  console.log(`Por subir: ${num(pending.length)} archivos (${mb(totalBytes)})`)
  if (dryRun) {
    pending.slice(0, 10).forEach((item) => console.log(`  ${item.key}  (${item.size} B)`))
    if (pending.length > 10) console.log(`  ... y ${num(pending.length - 10)} mas`)
    console.log('\n--dry-run: no se subio nada.')
    return
  }
  if (pending.length === 0) {
    console.log('Nada que hacer.')
    return
  }

  const CONCURRENCY = 16
  const startedAt = Date.now()
  let done = 0
  let failed = 0
  let cursor = 0

  const worker = async () => {
    for (;;) {
      const index = cursor++
      if (index >= pending.length) return
      const item = pending[index]
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: item.key,
            Body: readFileSync(item.path),
            ContentType: 'audio/mpeg',
            // El audio de G2424 nunca cambia: cache eterna y lectura publica.
            // A diferencia de una URL firmada, esto SI lo cachea el navegador.
            CacheControl: 'public, max-age=31536000, immutable',
            ACL: 'public-read'
          })
        )
      } catch (error) {
        failed++
        if (failed <= 5) console.error(`  FALLO ${item.key}: ${error.message}`)
      }
      done++
      if (done % 250 === 0 || done === pending.length) {
        const elapsed = (Date.now() - startedAt) / 1000
        const eta = (elapsed / done) * (pending.length - done)
        console.log(
          `  ${String(done).padStart(6)}/${pending.length}  ${((done / pending.length) * 100).toFixed(1)}%  ` +
            `${(done / elapsed).toFixed(0)}/s  ETA ${Math.round(eta)}s${failed ? `  fallos ${failed}` : ''}`
        )
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nSubidos: ${num(done - failed)} | fallos: ${failed} | ${Math.round((Date.now() - startedAt) / 1000)}s`)
  const base = (process.env.SCALEWAY_PUBLIC_URL ?? '').replace(/\/+$/, '')
  if (base) console.log(`Prueba: ${base}/${sources[0][1]}/2424.mp3`)
}

// ---------------------------------------------------------------------------
// link — rellena Bibles.legacy_path con el nombre de carpeta original
// ---------------------------------------------------------------------------

/**
 * La UI identifica cada version por su NOMBRE DE CARPETA ("034. Espanol - ...").
 * Ese identificador vive en el localStorage de los usuarios y en el catalogo
 * hardcodeado de ListBooks.jsx. Turso usa ids numericos.
 *
 * Guardar la correspondencia en la BD deja que la UI cambie de fuente (Turso o
 * el CDN de GitHub) sin migrar nada del usuario y sin duplicar la logica de
 * ordenamiento en el frontend.
 */
const commandLink = async () => {
  const BIBLES_DIR = join(ASSETS, 'bibles')
  if (!existsSync(BIBLES_DIR)) {
    console.error(`No existe ${BIBLES_DIR}. Este comando necesita los JSON originales.`)
    process.exit(1)
  }

  const client = turso()

  // La columna puede no existir si la base se creo antes de este cambio.
  try {
    await client.execute('ALTER TABLE Bibles ADD COLUMN legacy_path TEXT')
    console.log('Columna legacy_path agregada.')
  } catch {
    console.log('La columna legacy_path ya existia.')
  }

  const directories = readdirSync(BIBLES_DIR)
    .filter((name) => name !== 'JSON_DATA' && statSync(join(BIBLES_DIR, name)).isDirectory())
    .sort()

  // El id se asigno por posicion en este mismo orden durante `build`.
  await client.batch(
    directories.map((directory, index) => ({
      sql: 'UPDATE Bibles SET legacy_path = ? WHERE id = ?',
      args: [directory, index + 1]
    })),
    'write'
  )

  const check = await client.execute(
    'SELECT COUNT(*) AS total, COUNT(legacy_path) AS enlazadas FROM Bibles'
  )
  const row = check.rows[0]
  console.log(`Enlazadas ${row.enlazadas}/${row.total} versiones.`)

  const sample = await client.execute('SELECT id, name, legacy_path FROM Bibles WHERE id IN (1, 70, 93, 150)')
  console.log('\nMuestra:')
  for (const item of sample.rows) console.log(`  ${String(item.id).padStart(3)}  ${item.legacy_path}`)

  const missing = await client.execute('SELECT id, name FROM Bibles WHERE legacy_path IS NULL')
  if (missing.rows.length > 0) {
    console.log(`\nSIN ENLAZAR (${missing.rows.length}):`)
    for (const item of missing.rows) console.log(`  ${item.id}  ${item.name}`)
  }
}

// ---------------------------------------------------------------------------
// Referencias sin version: book*65536 + chapter*256 + verse
// ---------------------------------------------------------------------------

/**
 * Igual que `encodeReference` pero sin el campo de version.
 *
 * Las referencias cruzadas y la concordancia Strong no pertenecen a ninguna
 * traduccion: "Juan 3:16 remite a Romanos 5:8" es cierto en las 162 versiones.
 * Meter el bible_id ahi multiplicaria las filas por 162 sin anadir informacion.
 */
const packRef = (bookId, chapter, verse) => bookId * 65536 + chapter * 256 + verse

const unpackRef = (valor) => ({
  bookId: Math.floor(valor / 65536),
  chapter: Math.floor(valor / 256) % 256,
  verse: valor % 256
})

/** Inserta en tandas. Turso corta las transacciones muy grandes. */
const insertInBatches = async (client, sql, rows, { size = 500, label = '' } = {}) => {
  let done = 0
  for (let start = 0; start < rows.length; start += size) {
    const slice = rows.slice(start, start + size)
    await client.batch(
      slice.map((args) => ({ sql, args })),
      'write'
    )
    done += slice.length
    process.stdout.write(`\r  ${label} ${num(done)} / ${num(rows.length)}   `)
  }
  process.stdout.write('\n')
}

// ---------------------------------------------------------------------------
// strongs-index — concordancia inversa: donde aparece cada codigo Strong
// ---------------------------------------------------------------------------

/**
 * El dato ya estaba en la base.
 *
 * El markup `<sup>NNNN </sup>` viaja INLINE dentro del `body` comprimido de
 * cada capitulo (decision tomada al construir la base: separarlo ahorraba un
 * 3-16% y rompia la alineacion palabra-Strong que necesita la UI). O sea que
 * "donde mas aparece G26" no requiere datos nuevos, solo recorrer una vez las
 * ediciones interlineales y anotar lo que ya dicen.
 *
 * Se usa UNA edicion por testamento, no las 162. Un mismo versiculo lleva los
 * mismos numeros Strong en todas las interlineales; recorrerlas todas
 * multiplicaria el trabajo para reescribir las mismas filas.
 *
 * El prefijo (H/G) sale del testamento y no del texto: el Antiguo esta en
 * hebreo y el Nuevo en griego. Las ediciones griegas del AT (Septuaginta) son
 * la excepcion, y por eso se puede forzar la fuente con --old / --new.
 */
const commandStrongIndex = async (args) => {
  const client = turso()

  const flag = (nombre) => {
    const encontrado = args.find((part) => part.startsWith(`--${nombre}=`))
    return encontrado ? Number(encontrado.split('=')[1]) : null
  }

  /** Version con Strong que mas capitulos tiene en ese testamento. */
  const elegirFuente = async (testament) => {
    const rango = testament === 'old' ? ['<=', LAST_OLD_TESTAMENT_BOOK] : ['>', LAST_OLD_TESTAMENT_BOOK]
    const result = await client.execute({
      sql: `SELECT c.bible_id AS id, COUNT(*) AS n
              FROM Chapters c JOIN Bibles b ON b.id = c.bible_id
             WHERE b.has_strongs = 1 AND c.book_id ${rango[0]} ?
             GROUP BY c.bible_id ORDER BY n DESC LIMIT 1`,
      args: [rango[1]]
    })
    return result.rows[0] ? Number(result.rows[0].id) : null
  }

  const fuentes = [
    { testament: 'old', prefix: 'H', bibleId: flag('old') ?? (await elegirFuente('old')) },
    { testament: 'new', prefix: 'G', bibleId: flag('new') ?? (await elegirFuente('new')) }
  ]

  const conteo = new Map()

  for (const { testament, prefix, bibleId } of fuentes) {
    if (!bibleId) {
      console.log(`Sin edicion con Strong para el ${testament === 'old' ? 'Antiguo' : 'Nuevo'} Testamento; se omite.`)
      continue
    }

    const nombre = (await client.execute({ sql: 'SELECT name FROM Bibles WHERE id = ?', args: [bibleId] })).rows[0]?.name
    console.log(`${testament === 'old' ? 'AT' : 'NT'}: version ${bibleId} — ${nombre ?? '?'}`)

    const comparador = testament === 'old' ? '<=' : '>'
    const capitulos = await client.execute({
      sql: `SELECT book_id, chapter, body FROM Chapters
             WHERE bible_id = ? AND book_id ${comparador} ?
             ORDER BY book_id, chapter`,
      args: [bibleId, LAST_OLD_TESTAMENT_BOOK]
    })

    for (const fila of capitulos.rows) {
      const bookId = Number(fila.book_id)
      const chapter = Number(fila.chapter)
      const body = fila.body instanceof ArrayBuffer ? Buffer.from(fila.body) : Buffer.from(fila.body.buffer ?? fila.body)
      const versiculos = gunzipSync(body).toString('utf8').split(VERSE_SEPARATOR)

      versiculos.forEach((texto, indice) => {
        const ref = packRef(bookId, chapter, indice + 1)
        for (const encontrado of texto.matchAll(/<sup>\s*(\d+)\s*<\/sup>/gi)) {
          // `Number()` quita los ceros a la izquierda: en el markup unas veces
          // es 0430 y otras 430, y el diccionario los guarda como H430.
          const code = `${prefix}${Number(encontrado[1])}`
          const clave = `${code}|${ref}`
          conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
        }
      })
    }

    console.log(`  ${num(capitulos.rows.length)} capitulos leidos.`)
  }

  if (conteo.size === 0) {
    console.log('No se encontro ningun codigo Strong. Nada que escribir.')
    return
  }

  const filas = [...conteo.entries()].map(([clave, hits]) => {
    const [code, ref] = clave.split('|')
    return [code, Number(ref), hits]
  })

  console.log(`\nEscribiendo ${num(filas.length)} apariciones...`)
  await client.execute('DELETE FROM StrongOccurrences')
  await insertInBatches(client, 'INSERT OR REPLACE INTO StrongOccurrences (code, ref, hits) VALUES (?, ?, ?)', filas, {
    label: 'apariciones'
  })

  const codigos = new Set(filas.map((fila) => fila[0])).size
  console.log(`Listo. ${num(codigos)} codigos distintos, ${num(filas.length)} versiculos-codigo.`)
}

// ---------------------------------------------------------------------------
// crossrefs — importa el Treasury of Scripture Knowledge
// ---------------------------------------------------------------------------

/** Abreviaturas OSIS tal como las publica openbible.info. */
const OSIS = {
  Gen: 1, Exod: 2, Lev: 3, Num: 4, Deut: 5, Josh: 6, Judg: 7, Ruth: 8, '1Sam': 9, '2Sam': 10,
  '1Kgs': 11, '2Kgs': 12, '1Chr': 13, '2Chr': 14, Ezra: 15, Neh: 16, Esth: 17, Job: 18, Ps: 19, Prov: 20,
  Eccl: 21, Song: 22, Isa: 23, Jer: 24, Lam: 25, Ezek: 26, Dan: 27, Hos: 28, Joel: 29, Amos: 30,
  Obad: 31, Jonah: 32, Mic: 33, Nah: 34, Hab: 35, Zeph: 36, Hag: 37, Zech: 38, Mal: 39, Matt: 40,
  Mark: 41, Luke: 42, John: 43, Acts: 44, Rom: 45, '1Cor': 46, '2Cor': 47, Gal: 48, Eph: 49, Phil: 50,
  Col: 51, '1Thess': 52, '2Thess': 53, '1Tim': 54, '2Tim': 55, Titus: 56, Phlm: 57, Heb: 58, Jas: 59, '1Pet': 60,
  '2Pet': 61, '1John': 62, '2John': 63, '3John': 64, Jude: 65, Rev: 66
}

/** "Gen.1.1" -> ref empaquetada. `null` si el libro no es del canon de 66. */
const parseOsis = (texto) => {
  const partes = String(texto).trim().split('.')
  if (partes.length !== 3) return null
  const bookId = OSIS[partes[0]]
  const chapter = Number(partes[1])
  const verse = Number(partes[2])
  if (!bookId || !Number.isFinite(chapter) || !Number.isFinite(verse)) return null
  // El empaquetado da 8 bits por campo. Fuera de rango es dato corrupto.
  if (chapter > 255 || verse > 255 || chapter < 1 || verse < 1) return null
  return packRef(bookId, chapter, verse)
}

/**
 * Carga el TSK (Treasury of Scripture Knowledge), dominio publico, publicado
 * por openbible.info bajo CC-BY.
 *
 *   node migrate.mjs crossrefs --file=cross_references.txt
 *   node migrate.mjs crossrefs --url=https://.../cross_references.txt
 *
 * El fichero es TSV: `From Verse<TAB>To Verse<TAB>Votes`, con cabecera. El
 * destino puede ser un rango ("Gen.1.1-Gen.1.5").
 *
 * Se descartan las referencias con votos negativos: en el dataset original el
 * voto negativo significa que los lectores marcaron la relacion como mala.
 */
const commandCrossRefs = async (args, dryRun) => {
  const valorDe = (nombre) => args.find((part) => part.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=')

  const ruta = valorDe('file')
  const url = valorDe('url')
  const minimoVotos = Number(valorDe('min-votos') ?? 0)

  if (!ruta && !url) {
    console.error(`Falta la fuente de datos.

  node migrate.mjs crossrefs --file=cross_references.txt
  node migrate.mjs crossrefs --url=<url del TSV>

El dataset es el Treasury of Scripture Knowledge de openbible.info
(https://www.openbible.info/labs/cross-references/), CC-BY. Se descarga como
ZIP; hay que descomprimirlo y pasar el .txt de dentro.`)
    process.exit(1)
  }

  let crudo
  if (ruta) {
    const absoluta = resolve(process.cwd(), ruta)
    if (!existsSync(absoluta)) {
      console.error(`No existe el archivo: ${absoluta}`)
      process.exit(1)
    }
    crudo = readFileSync(absoluta, 'utf8')
  } else {
    console.log(`Descargando ${url} ...`)
    const respuesta = await fetch(url)
    if (!respuesta.ok) {
      console.error(`La descarga fallo: HTTP ${respuesta.status}`)
      process.exit(1)
    }
    crudo = await respuesta.text()
  }

  const lineas = crudo.split(/\r?\n/)
  const filas = []

  // Se cuenta POR QUE se descarta cada linea, no solo cuantas. Si un dia el
  // formato cambia, un solo numero no distingue "el dataset trae ruido normal"
  // de "el parser dejo de entender el archivo".
  const descartes = { votos: 0, origen: 0, destino: 0, formato: 0 }
  let rangos = 0

  for (const linea of lineas) {
    if (!linea || linea.startsWith('From Verse')) continue
    const [desde, hasta, votosCrudo] = linea.split('\t')
    if (!desde || !hasta) {
      descartes.formato++
      continue
    }

    // Los votos negativos son relaciones que los lectores marcaron como malas.
    const votos = Number(votosCrudo ?? 0)
    if (!Number.isFinite(votos) || votos < minimoVotos) {
      descartes.votos++
      continue
    }

    const fromRef = parseOsis(desde)
    if (fromRef === null) {
      descartes.origen++
      continue
    }

    // El destino puede ser "Gen.1.1" o el rango "Gen.1.1-Gen.1.5".
    const [inicioCrudo, finCrudo] = hasta.split('-')
    const toRef = parseOsis(inicioCrudo)
    if (toRef === null) {
      descartes.destino++
      continue
    }
    const toEnd = finCrudo ? parseOsis(finCrudo) : null
    if (toEnd !== null) rangos++

    filas.push([fromRef, toRef, toEnd, votos])
  }

  if (filas.length === 0) {
    console.error('No se pudo interpretar ninguna linea. ¿Es el TSV del TSK?')
    process.exit(1)
  }

  const versiculos = new Set(filas.map((fila) => fila[0])).size
  const total = Object.values(descartes).reduce((a, b) => a + b, 0)

  console.log(`  Referencias validas : ${num(filas.length)}  (${num(rangos)} son rangos)`)
  console.log(`  Versiculos de origen: ${num(versiculos)}`)
  console.log(`  Descartadas         : ${num(total)}`)
  console.log(`    voto < ${minimoVotos}         : ${num(descartes.votos)}`)
  console.log(`    origen fuera canon: ${num(descartes.origen)}`)
  console.log(`    destino fuera canon: ${num(descartes.destino)}`)
  console.log(`    linea mal formada : ${num(descartes.formato)}`)

  if (dryRun) {
    console.log('\n--dry-run: no se escribio nada. Ejemplos:')
    for (const [desde, hasta, fin, votos] of filas.slice(0, 5)) {
      const d = unpackRef(desde)
      const h = unpackRef(hasta)
      const f = fin === null ? '' : `-${unpackRef(fin).verse}`
      console.log(`  ${d.bookId}:${d.chapter}:${d.verse}  ->  ${h.bookId}:${h.chapter}:${h.verse}${f}  (${votos})`)
    }
    return
  }

  await escribirCrossRefs(filas)
}

const escribirCrossRefs = async (filas) => {
  const client = turso()
  await client.execute('DELETE FROM CrossRefs')
  await insertInBatches(client, 'INSERT INTO CrossRefs (from_ref, to_ref, to_end, votes) VALUES (?, ?, ?, ?)', filas, {
    label: 'referencias'
  })
  const versiculos = new Set(filas.map((fila) => fila[0])).size
  console.log(`Listo. ${num(versiculos)} versiculos con referencias cruzadas.`)
}

// ---------------------------------------------------------------------------
// stats / sql
// ---------------------------------------------------------------------------

const commandStats = async () => {
  const client = turso()
  const scalar = async (sql) => (await client.execute(sql)).rows[0] ?? {}

  const bibles = await scalar('SELECT COUNT(*) AS n FROM Bibles')
  const chapters = await scalar('SELECT COUNT(*) AS n, SUM(LENGTH(body)) AS bytes FROM Chapters')
  const strongs = await scalar('SELECT COUNT(*) AS n FROM Strongs')
  const indexed = await scalar('SELECT COUNT(*) AS n FROM SearchIndex')
  const users = await scalar('SELECT COUNT(*) AS n FROM Users')

  // Estas dos tablas se llenan con comandos aparte y pueden no existir todavia
  // en una base que solo paso por `schema` de una version anterior.
  const opcional = async (sql) => {
    try {
      return await scalar(sql)
    } catch {
      return { n: 0 }
    }
  }
  const crossrefs = await opcional('SELECT COUNT(*) AS n FROM CrossRefs')
  const occurrences = await opcional('SELECT COUNT(*) AS n FROM StrongOccurrences')

  console.log('')
  console.log('  BIBLIAN — estado en Turso')
  console.log('  ' + '-'.repeat(42))
  console.log(`  Versiones           : ${num(bibles.n)}`)
  console.log(`  Capitulos           : ${num(chapters.n)}`)
  console.log(`  Texto (gzip)        : ${mb(chapters.bytes)}`)
  console.log(`  Entradas Strong     : ${num(strongs.n)}`)
  console.log(`  Versiculos indexados: ${num(indexed.n)}`)
  console.log(`  Referencias cruzadas: ${num(crossrefs.n)}`)
  console.log(`  Apariciones Strong  : ${num(occurrences.n)}`)
  console.log(`  Usuarios            : ${num(users.n)}`)
  console.log('  ' + '-'.repeat(42))
  console.log('  (no incluye el peso de indices ni del FTS5)\n')
}

const commandSql = async (sql) => {
  if (!sql) {
    console.error('Uso: node migrate.mjs sql "<SQL>"')
    process.exit(1)
  }
  const client = turso()
  const statements = sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  if (statements.length > 1) {
    await client.executeMultiple(sql)
    console.log(`OK. ${statements.length} sentencias.`)
    return
  }
  const result = await client.execute(sql)
  if (result.rows.length > 0) console.table(result.rows.map((row) => Object.fromEntries(Object.entries(row))))
  else console.log(`OK. Filas afectadas: ${result.rowsAffected}`)
}

// ---------------------------------------------------------------------------

const [command, ...rest] = process.argv.slice(2)

const run = {
  build: () => commandBuild(),
  schema: () => commandSchema(),
  audio: () => commandAudio(rest.includes('--dry-run'), rest.includes('--create-bucket')),
  link: () => commandLink(),
  'strongs-index': () => commandStrongIndex(rest),
  crossrefs: () => commandCrossRefs(rest, rest.includes('--dry-run')),
  stats: () => commandStats(),
  sql: () => commandSql(rest.filter((part) => !part.startsWith('--')).join(' '))
}[command]

if (!run) {
  console.log(`
Uso: node migrate.mjs <comando>

  build            construye build/biblian.db desde los JSON de ../src/assets
  schema           aplica el esquema a una base Turso vacia
  audio            sube los MP3 del diccionario Strong a Scaleway
  audio --dry-run  muestra que subiria, sin subir
  audio --create-bucket  crea el bucket si no existe
  link             enlaza Bibles.legacy_path con el nombre de carpeta
  strongs-index    concordancia inversa Strong (donde aparece cada codigo)
  strongs-index --old=<id> --new=<id>   fuerza que edicion se lee por testamento
  crossrefs --file=<tsv>  importa el Treasury of Scripture Knowledge
  crossrefs --url=<url>   igual, pero descargando el TSV
  crossrefs --dry-run     analiza el archivo y NO escribe nada
  crossrefs --min-votos=N descarta las referencias con menos de N votos
  stats            estado de la base en Turso
  sql "<SQL>"      consulta directa contra Turso
`)
  process.exit(command ? 1 : 0)
}

run().catch((error) => {
  console.error('\nError:', error.message)
  process.exit(1)
})
