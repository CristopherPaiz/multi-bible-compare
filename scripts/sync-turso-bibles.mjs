import { createClient } from '../api/node_modules/@libsql/client/lib-esm/node.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import dotenv from '../api/node_modules/dotenv/lib/main.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BIBLES_DIR = path.join(ROOT_DIR, 'src', 'assets', 'bibles');
const ENV_FILE = path.join(ROOT_DIR, 'api', '.env');

dotenv.config({ path: ENV_FILE });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en api/.env');
  process.exit(1);
}

const client = createClient({ url, authToken });
const VERSE_SEPARATOR = '\u001f';

function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseDirectoryName(directory) {
  const match = /^(\d+)\.\s*(.+?)\s+-\s+(.+)$/.exec(directory);
  if (!match) return null;
  const rawLanguage = match[2].trim();
  const rest = match[3].trim();
  const yearMatch = rest.match(/[([](\d{3,4})[)\]]/);
  const year = yearMatch ? Number(yearMatch[1]) : (directory.match(/[([](\d{3,4})[)\]]/) ? Number(directory.match(/[([](\d{3,4})[)\]]/)[1]) : null);

  let language = 'spanish';
  if (rawLanguage.startsWith('Español')) language = 'spanish';
  else if (rawLanguage.startsWith('English')) language = 'english';
  else if (rawLanguage.startsWith('Greek')) language = 'greek';
  else if (rawLanguage.startsWith('Hebrew')) language = 'hebrew';
  else if (rawLanguage.startsWith('Guatemala')) language = 'guatemala';
  else if (rawLanguage.startsWith('Aramaic')) language = 'aramaic';
  else if (rawLanguage.startsWith('Esperanto')) language = 'esperanto';
  else if (rawLanguage.startsWith('Latin')) language = 'latin';
  else if (rawLanguage.startsWith('Náhuatl')) language = 'nahuatl';
  else if (rawLanguage.startsWith('Português') || rawLanguage.startsWith('Portuguese')) language = 'portuguese';
  else if (rawLanguage.startsWith('Français') || rawLanguage.startsWith('French')) language = 'french';
  else if (rawLanguage.startsWith('Deutsch') || rawLanguage.startsWith('German')) language = 'german';
  else if (rawLanguage.startsWith('Italiano') || rawLanguage.startsWith('Italian')) language = 'italian';

  return { language, name: rest, year };
}

async function sync() {
  console.log('Consultando biblias registradas en Turso...');
  const res = await client.execute('SELECT id, legacy_path, slug FROM Bibles');
  const existingByPath = new Map();
  let maxId = 0;
  for (const row of res.rows) {
    if (row.legacy_path) existingByPath.set(row.legacy_path, row.id);
    if (Number(row.id) > maxId) maxId = Number(row.id);
  }

  console.log(`Turso tiene actualmente ${res.rows.length} biblias registradas.`);

  const localDirs = fs.readdirSync(BIBLES_DIR)
    .filter(d => d !== 'JSON_DATA' && fs.statSync(path.join(BIBLES_DIR, d)).isDirectory())
    .sort();

  const missing = localDirs.filter(d => !existingByPath.has(d));
  console.log(`Biblias locales a subir a Turso: ${missing.length}`);

  if (missing.length === 0) {
    console.log('¡Todas las biblias ya están sincronizadas en Turso!');
    return;
  }

  for (const dir of missing) {
    maxId++;
    const bibleId = maxId;
    const meta = parseDirectoryName(dir) || { language: 'spanish', name: dir, year: null };
    const bibleRoot = path.join(BIBLES_DIR, dir);
    const hasOld = fs.existsSync(path.join(bibleRoot, 'Old')) ? 1 : 0;
    const hasNew = fs.existsSync(path.join(bibleRoot, 'New')) ? 1 : 0;
    const slug = slugify(`${meta.language}-${meta.name}-${meta.year ?? ''}-${bibleId}`);

    console.log(`\nSubiendo [ID ${bibleId}] ${dir}...`);

    // Insertar Bible
    await client.execute({
      sql: `INSERT OR REPLACE INTO Bibles (id, slug, name, language, year, has_strongs, has_old, has_new, searchable, sort_order, legacy_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [bibleId, slug, meta.name, meta.language, meta.year, 0, hasOld, hasNew, 1, bibleId, dir]
    });

    // Leer y subir capítulos en lotes
    const chapterBatch = [];
    for (const testament of ['Old', 'New']) {
      const testDir = path.join(bibleRoot, testament);
      if (!fs.existsSync(testDir)) continue;

      for (const bookFolder of fs.readdirSync(testDir)) {
        const bookMatch = /^book(\d+)$/.exec(bookFolder);
        if (!bookMatch) continue;
        const bookId = Number(bookMatch[1]);
        const bookDir = path.join(testDir, bookFolder);

        for (const file of fs.readdirSync(bookDir)) {
          const chapMatch = /^chapter(\d+)\.json$/.exec(file);
          if (!chapMatch) continue;
          const chapter = Number(chapMatch[1]);

          const raw = JSON.parse(fs.readFileSync(path.join(bookDir, file), 'utf8'));
          const verseNumbers = Object.keys(raw).map(Number).filter(n => n > 0).sort((a, b) => a - b);
          if (verseNumbers.length === 0) continue;
          const maxVerse = Math.max(...verseNumbers);

          const verses = [];
          for (let v = 1; v <= maxVerse; v++) {
            verses.push(raw[String(v)] || '');
          }

          const body = gzipSync(Buffer.from(verses.join(VERSE_SEPARATOR), 'utf8'), { level: 9 });
          chapterBatch.push({
            sql: `INSERT OR REPLACE INTO Chapters (bible_id, book_id, chapter, verse_count, encoding, body)
                  VALUES (?, ?, ?, ?, 'gzip', ?)`,
            args: [bibleId, bookId, chapter, maxVerse, body]
          });
        }
      }
    }

    console.log(`Subiendo ${chapterBatch.length} capítulos en lotes de 100...`);
    for (let i = 0; i < chapterBatch.length; i += 100) {
      const chunk = chapterBatch.slice(i, i + 100);
      await client.batch(chunk, 'write');
    }
    console.log(`Completada subida de ${dir}.`);
  }

  console.log('\n¡Sincronización a Turso finalizada con éxito!');
}

sync().catch(console.error);
