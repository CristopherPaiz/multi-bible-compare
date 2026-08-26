/**
 * ============================================================================
 *  BIBLIAN — Herramienta de Importación Automática de Biblias desde Beblia XML
 * ============================================================================
 *
 * Uso:
 *   node scripts/import-bible.mjs <archivo-xml-o-url> [--language=<idioma>] [--name=<nombre>] [--year=<año>]
 *   node scripts/import-bible.mjs --batch
 *
 * Descarga el XML de Beblia/GitHub, lo convierte a la estructura canónica de
 * capítulos JSON (Old/bookX/chapterY.json y New/bookX/chapterY.json), lo registra
 * en src/data/biblias.js, src/data/colaboradores.js y lo inserta en la base de datos.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_BIBLES = path.join(ROOT_DIR, 'src', 'assets', 'bibles');
const BIBLIAS_JS = path.join(ROOT_DIR, 'src', 'data', 'biblias.js');
const COLABORADORES_JS = path.join(ROOT_DIR, 'src', 'data', 'colaboradores.js');

const BEBLIA_BASE = 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/';

const CHAPTER_COUNTS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1,
  4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} al descargar ${url}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Parsea el XML jerárquico de Beblia:
 * <testament name="Old|New"> -> <book number="X"> -> <chapter number="Y"> -> <verse number="Z">texto</verse>
 */
function parseBebliaXml(xmlText) {
  // Extraer metadata del tag <bible ...>
  const bibleTagMatch = /<bible([^>]+)>/i.exec(xmlText);
  let translationAttr = '';
  let statusAttr = '';
  let linkAttr = '';

  if (bibleTagMatch) {
    const rawAttrs = bibleTagMatch[1];
    const transMatch = /translation="([^"]+)"/i.exec(rawAttrs) || /name="([^"]+)"/i.exec(rawAttrs);
    if (transMatch) translationAttr = transMatch[1];
    const statusMatch = /status="([^"]+)"/i.exec(rawAttrs) || /info="([^"]+)"/i.exec(rawAttrs);
    if (statusMatch) statusAttr = statusMatch[1];
    const linkMatch = /link="([^"]+)"/i.exec(rawAttrs) || /site="([^"]+)"/i.exec(rawAttrs);
    if (linkMatch) linkAttr = linkMatch[1];
  }

  const books = new Map(); // bookId -> Map(chapter -> Object { verseNum: text })

  // Dividir por testamento o por libro
  const bookRegex = /<book\s+number="(\d+)"[^>]*>([\s\S]*?)<\/book>/gi;
  let bookMatch;

  while ((bookMatch = bookRegex.exec(xmlText)) !== null) {
    let bookNum = Number(bookMatch[1]);
    const bookContent = bookMatch[2];

    const chapterMap = new Map();
    const chapterRegex = /<chapter\s+number="(\d+)"[^>]*>([\s\S]*?)<\/chapter>/gi;
    let chapterMatch;

    while ((chapterMatch = chapterRegex.exec(bookContent)) !== null) {
      const chapterNum = Number(chapterMatch[1]);
      const chapterContent = chapterMatch[2];

      const verseObj = {};
      const verseRegex = /<verse\s+number="(\d+)"[^>]*>([\s\S]*?)<\/verse>/gi;
      let verseMatch;

      while ((verseMatch = verseRegex.exec(chapterContent)) !== null) {
        const verseNum = String(Number(verseMatch[1]));
        let verseText = verseMatch[2]
          .replace(/<[^>]+>/g, '') // Quitar tags internos si hay
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        verseObj[verseNum] = verseText;
      }

      if (Object.keys(verseObj).length > 0) {
        chapterMap.set(chapterNum, verseObj);
      }
    }

    if (chapterMap.size > 0) {
      books.set(bookNum, chapterMap);
    }
  }

  return {
    translationAttr,
    statusAttr,
    linkAttr,
    books
  };
}

export async function importBebliaBible({
  xmlFileOrUrl,
  languageCode,
  languageName,
  customTitle,
  year,
  editorial,
  statusOverride,
  linkOverride,
  targetDirNumber
}) {
  const url = xmlFileOrUrl.startsWith('http') ? xmlFileOrUrl : `${BEBLIA_BASE}${xmlFileOrUrl}`;
  console.log(`\nDescargando ${url}...`);

  const xmlText = await fetchUrl(url);
  console.log(`Descargado (${(xmlText.length / 1024 / 1024).toFixed(2)} MB). Procesando capítulos...`);

  const parsed = parseBebliaXml(xmlText);

  // Normalizar numeración de libros:
  // Si los libros están numerados 1..27 para el Nuevo Testamento sin Antiguo Testamento,
  // se remapea a 40..66.
  const bookNumbers = [...parsed.books.keys()].sort((a, b) => a - b);
  const isNtOnly = bookNumbers.length > 0 && bookNumbers.length <= 27 && bookNumbers[0] === 1;

  const normalizedBooks = new Map();
  for (const [rawBookNum, chapters] of parsed.books.entries()) {
    const finalBookId = isNtOnly ? rawBookNum + 39 : rawBookNum;
    normalizedBooks.set(finalBookId, chapters);
  }

  const hasOld = [...normalizedBooks.keys()].some((id) => id <= 39);
  const hasNew = [...normalizedBooks.keys()].some((id) => id >= 40);

  // Determinar nombre del folder: ej. "120. Português - Almeida Revista e Corrigida (2009)"
  const finalYear = year || (parsed.translationAttr.match(/\b(1\d{3}|20\d{2})\b/) ? parsed.translationAttr.match(/\b(1\d{3}|20\d{2})\b/)[0] : '');
  const cleanTitle = customTitle || parsed.translationAttr.replace(/^(Spanish|English|Portuguese|French|German|Italian)\s+/i, '').trim();
  const folderNumberStr = String(targetDirNumber).padStart(3, '0');
  const folderName = `${folderNumberStr}. ${languageName} - ${cleanTitle} (${finalYear || 'N/A'})`;

  console.log(`Guardando en carpeta: ${folderName}`);
  console.log(`Testamentos: Antiguo (${hasOld ? 'SÍ' : 'NO'}), Nuevo (${hasNew ? 'SÍ' : 'NO'})`);

  const bibleDir = path.join(ASSETS_BIBLES, folderName);
  fs.mkdirSync(bibleDir, { recursive: true });

  let totalCapitulos = 0;

  for (const [bookId, chapters] of normalizedBooks.entries()) {
    const testamentFolder = bookId <= 39 ? 'Old' : 'New';
    const bookFolder = path.join(bibleDir, testamentFolder, `book${bookId}`);
    fs.mkdirSync(bookFolder, { recursive: true });

    for (const [chapterNum, verses] of chapters.entries()) {
      const chapterFile = path.join(bookFolder, `chapter${chapterNum}.json`);
      fs.writeFileSync(chapterFile, JSON.stringify(verses, null, 2), 'utf8');
      totalCapitulos++;
    }
  }

  console.log(`Generados ${totalCapitulos} capítulos JSON con éxito.`);

  return {
    folderName,
    title: cleanTitle,
    languageCode,
    languageName,
    year: Number(finalYear) || null,
    hasOld,
    hasNew,
    editorial: editorial || 'Beblia XML Repository',
    info: statusOverride || parsed.statusAttr || 'Public Domain / Open Bible (Beblia XML)',
    link: linkOverride || parsed.linkAttr || ''
  };
}

// Lote predefinido de versiones solicitadas
export const BATCH_BIBLES = [
  // Português
  {
    xmlFileOrUrl: 'PortugueseARCBible.xml',
    languageCode: 'portuguese',
    languageName: 'Português',
    customTitle: 'Almeida Revista e Corrigida [ARC]',
    year: 2009,
    editorial: 'Sociedade Bíblica do Brasil',
    statusOverride: 'Almeida Revista e Corrigida (ARC) © 2009 Sociedade Bíblica do Brasil.',
    linkOverride: 'https://www.bible.com/bible/212/GEN.1.ARC',
    targetDirNumber: 120
  },
  {
    xmlFileOrUrl: 'PortugueseA21Bible.xml',
    languageCode: 'portuguese',
    languageName: 'Português',
    customTitle: 'Almeida Século 21 [A21]',
    year: 2008,
    editorial: 'Edições Vida Nova',
    statusOverride: 'Bíblia Almeida Século 21 © 2008 Edições Vida Nova.',
    linkOverride: 'https://www.bible.com/bible/2645/MAT.8.A21',
    targetDirNumber: 121
  },
  // Français
  {
    xmlFileOrUrl: 'FrenchMartinBible.xml',
    languageCode: 'french',
    languageName: 'Français',
    customTitle: 'Bible David Martin',
    year: 1744,
    editorial: 'David Martin (1744)',
    statusOverride: 'La Sainte Bible selon la version de David Martin (1744). Dominio Público.',
    linkOverride: 'https://www.bible.com/bible/62/GEN.2.FMAR',
    targetDirNumber: 122
  },
  {
    xmlFileOrUrl: 'FrenchOSTBible.xml',
    languageCode: 'french',
    languageName: 'Français',
    customTitle: 'Bible Ostervald',
    year: 1996,
    editorial: 'Jean-Frédéric Ostervald',
    statusOverride: 'La Sainte Bible révisée par J. F. Ostervald (1996). Dominio Público.',
    linkOverride: 'https://www.bible.com/bible/131/GEN.2.OST',
    targetDirNumber: 123
  },
  // Deutsch
  {
    xmlFileOrUrl: 'GermanLuther1912Bible.xml',
    languageCode: 'german',
    languageName: 'Deutsch',
    customTitle: 'Lutherbibel',
    year: 1912,
    editorial: 'Martin Luther / Cansteinsche Bibelanstalt',
    statusOverride: 'Die Bibel nach der Übersetzung Martin Luthers (1912). Dominio Público.',
    linkOverride: 'https://www.bible.com/bible/51/JHN.8.DELUT',
    targetDirNumber: 124
  },
  {
    xmlFileOrUrl: 'GermanElber1905Bible.xml',
    languageCode: 'german',
    languageName: 'Deutsch',
    customTitle: 'Elberfelder Bibel',
    year: 1905,
    editorial: 'R. Brockhaus Verlag',
    statusOverride: 'Elberfelder Bibel (Unrevidierte Fassung 1905). Dominio Público.',
    linkOverride: 'https://www.bible.com/bible/57/JHN.8.ELB',
    targetDirNumber: 125
  },
  // Italiano
  {
    xmlFileOrUrl: 'Italian1649Bible.xml',
    languageCode: 'italian',
    languageName: 'Italiano',
    customTitle: 'Giovanni Diodati Bibbia',
    year: 1885,
    editorial: 'Giovanni Diodati / BFBS',
    statusOverride: 'La Sacra Bibbia tradotta in lingua italiana da Giovanni Diodati (1649, rev. 1885). Dominio Público.',
    linkOverride: 'https://www.bible.com/bible/54/DEU.18.DB1885',
    targetDirNumber: 126
  },
  {
    xmlFileOrUrl: 'ItalianRivedutaBible.xml',
    languageCode: 'italian',
    languageName: 'Italiano',
    customTitle: 'Bibbia Riveduta Luzzi',
    year: 1927,
    editorial: 'Giovanni Luzzi / Società Biblica Britannica',
    statusOverride: 'La Sacra Bibbia: Versione Riveduta dal Dott. Giovanni Luzzi (1927). Dominio Público.',
    linkOverride: 'https://www.bible.com/bible/141/GAL.2.RDV24',
    targetDirNumber: 127
  },
  // English adicional
  {
    xmlFileOrUrl: 'EnglishBereanBible.xml',
    languageCode: 'english',
    languageName: 'English',
    customTitle: 'Berean Standard Bible [BSB]',
    year: 2020,
    editorial: 'Bible Hub / Berean Study Bible',
    statusOverride: 'The Holy Bible, Berean Standard Bible (BSB) © 2016-2020 by Bible Hub. Dedicated to the Public Domain.',
    linkOverride: 'https://www.bible.com/bible/3034/MRK.7.BSB',
    targetDirNumber: 128
  },
  {
    xmlFileOrUrl: 'EnglishAmplifiedClassicBible.xml',
    languageCode: 'english',
    languageName: 'English',
    customTitle: 'Amplified Bible Classic [AMPC]',
    year: 1987,
    editorial: 'The Lockman Foundation',
    statusOverride: 'Amplified Bible, Classic Edition (AMPC) © 1954, 1958, 1962, 1964, 1965, 1987 by The Lockman Foundation.',
    linkOverride: 'https://www.bible.com/bible/8/JHN.3.AMPC',
    targetDirNumber: 129
  },
  // Español adicional
  {
    xmlFileOrUrl: 'SpanishBHTIBible.xml',
    languageCode: 'spanish',
    languageName: 'Español',
    customTitle: 'Biblia Hispanoamericana [BHTI]',
    year: 2011,
    editorial: 'Sociedad Bíblica de España',
    statusOverride: 'La Biblia Hispanoamericana (BHTI) Traducción Interconfesional © 2011 Sociedad Bíblica de España.',
    linkOverride: 'https://www.bible.com/bible/222/MAT.3.BHTI',
    targetDirNumber: 130
  },
  {
    xmlFileOrUrl: 'SpanishJBSBible.xml',
    languageCode: 'spanish',
    languageName: 'Español',
    customTitle: 'Biblia del Jubileo [JBS]',
    year: 2000,
    editorial: 'Ransom Press International / Russell M. Stendal',
    statusOverride: 'Biblia del Jubileo 2000 (JBS) © 2000, 2010 por Ransom Press International, Inc.',
    linkOverride: 'https://www.bible.com/bible/1076/MAT.3.JBS',
    targetDirNumber: 131
  }
];

async function runCli() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--batch') {
    await runBatch();
    return;
  }

  const inputTarget = args[0];
  console.log(`\nImportando ${inputTarget} en modo CLI...`);

  // Detectar próximo número disponible de directorio
  const existingDirs = fs.readdirSync(ASSETS_BIBLES).filter(d => fs.statSync(path.join(ASSETS_BIBLES, d)).isDirectory());
  const maxNum = existingDirs.reduce((max, d) => {
    const m = /^(\d+)\./.exec(d);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 131);

  // Parámetros opcionales
  const langArg = args.find(a => a.startsWith('--lang='))?.split('=')[1] || 'spanish';
  const nameArg = args.find(a => a.startsWith('--name='))?.split('=')[1] || '';
  const yearArg = Number(args.find(a => a.startsWith('--year='))?.split('=')[1]) || null;

  const result = await importBebliaBible({
    xmlFileOrUrl: inputTarget,
    languageCode: langArg,
    languageName: langArg.charAt(0).toUpperCase() + langArg.slice(1),
    customTitle: nameArg || undefined,
    year: yearArg,
    targetDirNumber: maxNum + 1
  });

  console.log(`\n¡Biblia importada en local!`);
  console.log(`Carpeta: ${result.folderName}`);
  console.log(`Ahora puedes ejecutar 'node scripts/sync-turso-bibles.mjs' para sincronizarla con Turso.`);
}

if (process.argv[1] && process.argv[1].endsWith('import-bible.mjs')) {
  runCli();
}
