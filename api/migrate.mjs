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
 *   node migrate.mjs stats            estado de la base en Turso
 *   node migrate.mjs sql "<SQL>"      consulta directa contra Turso
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
import { gzipSync } from 'node:zlib'
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

  console.log('')
  console.log('  BIBLIAN — estado en Turso')
  console.log('  ' + '-'.repeat(42))
  console.log(`  Versiones           : ${num(bibles.n)}`)
  console.log(`  Capitulos           : ${num(chapters.n)}`)
  console.log(`  Texto (gzip)        : ${mb(chapters.bytes)}`)
  console.log(`  Entradas Strong     : ${num(strongs.n)}`)
  console.log(`  Versiculos indexados: ${num(indexed.n)}`)
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
  stats            estado de la base en Turso
  sql "<SQL>"      consulta directa contra Turso
`)
  process.exit(command ? 1 : 0)
}

run().catch((error) => {
  console.error('\nError:', error.message)
  process.exit(1)
})
