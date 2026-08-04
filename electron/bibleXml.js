// Shared Bible-XML parser — plain CommonJS, zero Node/DOM APIs inside the
// parsing functions themselves, so it works unbundled in Electron's preload
// context (required directly, no build step) AND bundled into the Next
// renderer (imported from TS, allowJs handles the interop natively).
//
// Mirrors the schema scripts/convert-bible.mjs already expects:
//   <bible code="EnglishKJ" ...><book number="1"><chapter number="1">
//     <verse number="1">In the beginning...</verse></chapter></book></bible>
//
// scripts/convert-bible.mjs keeps its own separate copy of this same parser
// (lowest risk to that already-working, dev-only build script) — this file
// is the one actually shipped/used at runtime, by both the Electron backend
// (via preload.js) and the browser/IndexedDB backend.

// Standard 66-book Protestant canon — the XML format numbers books 1-66 but
// never names them, so this table is the only source of truth (same table
// as scripts/convert-bible.mjs's BOOKS).
const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
  "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
  "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

// Per-language book names, same canonical 1-66 order as BOOKS above. Keyed by
// the language normalizeBibleLanguage resolves for the file, so a Cebuano
// translation reads "Mga Salmo" rather than "Psalms" everywhere the book name
// surfaces (sidebar list, reference caption, history, collections).
//
// Adding a language here is the whole change needed — the XML numbers books
// 1-66 and never names them, so this table is the only source of truth.
const BOOK_NAMES_BY_LANGUAGE = {
  // Must stay identical to the key order of BOOK_ABBREVIATIONS_CEBUANO in
  // components/lumen/data.ts — that map turns these exact names into the
  // on-screen reference caption, so any drift silently breaks every Cebuano
  // caption. bookNames.test.ts asserts the two match.
  Cebuano: [
    "Genesis", "Exodo", "Levitico", "Numeros", "Deuteronomio", "Josue", "Maghuhukom", "Ruth",
    "1 Samuel", "2 Samuel", "1 Mga Hari", "2 Mga Hari", "1 Cronicas", "2 Cronicas", "Ezra",
    "Nehemias", "Ester", "Job", "Mga Salmo", "Mga Panultihon", "Ecclesiastes", "Awit ni Solomon",
    "Isaias", "Jeremias", "Pagbangotan", "Ezequiel", "Daniel", "Oseas", "Joel", "Amos",
    "Obadias", "Jonas", "Miqueas", "Nahum", "Habacuc", "Sofonias", "Haggeo", "Zacarias",
    "Malaquias",
    "Mateo", "Marcos", "Lucas", "Juan", "Mga Buhat", "Mga Taga-Roma", "1 Mga Taga-Corinto",
    "2 Mga Taga-Corinto", "Mga Taga-Galacia", "Mga Taga-Efeso", "Mga Taga-Filipos",
    "Mga Taga-Colosas", "1 Mga Taga-Tesalonica", "2 Mga Taga-Tesalonica", "1 Timoteo",
    "2 Timoteo", "Tito", "Filemon", "Mga Hebreohanon", "Santiago",
    "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan", "Judas", "Pinadayag",
  ],
};

function bookNamesForLanguage(language) {
  return BOOK_NAMES_BY_LANGUAGE[language] || BOOKS;
}

const OLD_TESTAMENT_BOOK_COUNT = 39;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(amp|lt|gt|quot|apos|#(\d+));/g, (_, name, code) =>
    code ? String.fromCharCode(Number(code)) : ENTITIES[name]
  );
}

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

// `fallbackCode`, if given, is normally the uploaded/source filename — used
// only when the file has no `code`/`id` attribute of its own (real-world
// files, including public/bible/CebuanoRCPVBible.xml, often don't). Stripped
// the same way scripts/convert-bible.mjs derives its own local files' codes
// (e.g. "CebuanoRCPVBible.xml" -> "CebuanoRCPV"), generalized to plain
// ".xml" too since an uploaded file isn't guaranteed that exact "*Bible.xml"
// naming convention.
function deriveCodeFromFileName(fileName) {
  if (!fileName) return "";
  return fileName.replace(/\.xml$/i, "").replace(/Bible$/i, "");
}

// The most words a real language name is allowed to have ("Ancient Greek",
// "Simplified Chinese"); anything longer is a title, not a language.
const LANGUAGE_MAX_WORDS = 2;

function firstWord(value) {
  return (value || "").trim().split(/\s+/)[0] || "";
}

// A `language` attribute is NOT reliably a language. Real-world exports often
// put the whole translation title there — e.g.
// language="Cebuano 1999 (Maayong Balita Biblia)" — which then shows up in the
// sidebar's Language list as a bogus entry sitting next to the genuine
// "Cebuano" contributed by another file. So the attribute is only trusted when
// it actually looks like a language name; digits, brackets and punctuation all
// mark it as a title.
function looksLikeLanguageName(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return false;
  if (/[\d(){}[\]/|,:;]/.test(trimmed)) return false;
  return trimmed.split(/\s+/).length <= LANGUAGE_MAX_WORDS;
}

// Resolves the display language for a translation. Falls back to the leading
// word of the translation title, which Bible names conventionally start with
// ("Cebuano RCPV 1999 (Ang Bag-ong Maayong Balita Biblia)" -> "Cebuano") — and
// which also recovers a usable language from a title-shaped `language`
// attribute ("Chinese (Simplified)" -> "Chinese").
function normalizeBibleLanguage(rawLanguage, translationName) {
  if (looksLikeLanguageName(rawLanguage)) return rawLanguage.trim();
  return firstWord(translationName) || firstWord(rawLanguage) || "Unknown";
}

function parseBibleXml(xml, fallbackCode) {
  const rootTag = xml.match(/<bible\b[^>]*>/)?.[0] || "<bible>";
  const attrs = parseAttrs(rootTag);
  // Identity MUST come from the file's own content, never the uploaded
  // filename — matches how the existing JSON import path reads meta.code
  // from inside the file, not File.name. A renamed download or a browser's
  // "(1)" duplicate-filename suffix must never change which translation
  // this is considered to be.
  const code = attrs.code || attrs.id || deriveCodeFromFileName(fallbackCode) || "";
  const title = attrs.translation || attrs.name || attrs.title || "";
  const language = normalizeBibleLanguage(attrs.language, title);

  const meta = {
    code,
    language,
    name: title || language || code,
    license: attrs.status || attrs.info || attrs.license || "Unknown",
    link: attrs.link || null,
  };

  const bookNames = bookNamesForLanguage(language);
  const books = [];
  for (const bookMatch of xml.matchAll(/<book\s+number="(\d+)"[^>]*>([\s\S]*?)<\/book>/g)) {
    const number = Number(bookMatch[1]);
    const bookBody = bookMatch[2];
    const chapters = [];

    for (const chapterMatch of bookBody.matchAll(/<chapter\s+number="(\d+)"[^>]*>([\s\S]*?)<\/chapter>/g)) {
      const chapterNumber = Number(chapterMatch[1]);
      const chapterBody = chapterMatch[2];
      const verses = [];

      // Matches both self-closing (<verse number="2"/>) and open/close
      // (<verse number="2"></verse>) forms, since a translation file may use
      // either — even inconsistently within itself. Group 1+group 2 cover
      // the self-closing form (no text possible); group 3+group 4 cover the
      // open/close form (group 4 is the text, empty for a "verse bridge"
      // continuation — see decodeEmptyVerse below).
      const versePattern = /<verse\s+number="(\d+)"[^>]*\/>|<verse\s+number="(\d+)"[^>]*>([\s\S]*?)<\/verse>/g;
      for (const verseMatch of chapterBody.matchAll(versePattern)) {
        const number = Number(verseMatch[1] ?? verseMatch[2]);
        const text = verseMatch[1] !== undefined ? "" : decodeEntities(verseMatch[3]).trim();
        if (text) {
          verses.push({ number, text });
          continue;
        }
        // Empty verse: either a "verse bridge" — translators merged this
        // verse's content into the preceding one, which holds the full
        // text, and this verse is left in the file but empty — which
        // extends the preceding verse's displayed range to include it; or,
        // rarely, a verse the translation omits entirely with nothing
        // preceding it in this chapter to merge into (e.g. 1 Samuel 13:1's
        // famously defective source text) — dropped, since it was never a
        // real slide to begin with. Handles runs of several empty verses in
        // a row the same way, by always extending whichever verse was most
        // recently pushed.
        const previousVerse = verses[verses.length - 1];
        if (previousVerse) previousVerse.endNumber = number;
      }

      chapters.push({ number: chapterNumber, verses });
    }

    books.push({
      number,
      name: bookNames[number - 1] || BOOKS[number - 1] || "Unknown " + number,
      testament: number <= OLD_TESTAMENT_BOOK_COUNT ? "Old" : "New",
      chapters,
    });
  }

  return { meta, books };
}

module.exports = {
  parseBibleXml, decodeEntities, parseAttrs, deriveCodeFromFileName, normalizeBibleLanguage,
  bookNamesForLanguage, BOOKS, BOOK_NAMES_BY_LANGUAGE,
};
