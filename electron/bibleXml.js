// Parses Bible XML into structured book/chapter/verse data.

// Canonical English names for the 66 Bible books, in order.
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

// Per-language book names, keyed by language, in canonical order.
const BOOK_NAMES_BY_LANGUAGE = {
  // Must match BOOK_ABBREVIATIONS_CEBUANO in components/lumen/data.ts.
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

// Derives a translation code from a filename, stripping .xml and a trailing "Bible".
function deriveCodeFromFileName(fileName) {
  if (!fileName) return "";
  return fileName.replace(/\.xml$/i, "").replace(/Bible$/i, "");
}

// Maximum word count for a value to be treated as a language name.
const LANGUAGE_MAX_WORDS = 2;

function firstWord(value) {
  return (value || "").trim().split(/\s+/)[0] || "";
}

// Checks whether a value looks like a language name rather than a title.
function looksLikeLanguageName(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return false;
  if (/[\d(){}[\]/|,:;]/.test(trimmed)) return false;
  return trimmed.split(/\s+/).length <= LANGUAGE_MAX_WORDS;
}

// Resolves the display language, falling back to the title's leading word.
function normalizeBibleLanguage(rawLanguage, translationName) {
  if (looksLikeLanguageName(rawLanguage)) return rawLanguage.trim();
  return firstWord(translationName) || firstWord(rawLanguage) || "Unknown";
}

function parseBibleXml(xml, fallbackCode) {
  const rootTag = xml.match(/<bible\b[^>]*>/)?.[0] || "<bible>";
  const attrs = parseAttrs(rootTag);
  // Reads the translation's code from the file's own attributes, not the filename.
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

      // Matches both self-closing and open/close verse tag forms.
      const versePattern = /<verse\s+number="(\d+)"[^>]*\/>|<verse\s+number="(\d+)"[^>]*>([\s\S]*?)<\/verse>/g;
      for (const verseMatch of chapterBody.matchAll(versePattern)) {
        const number = Number(verseMatch[1] ?? verseMatch[2]);
        const text = verseMatch[1] !== undefined ? "" : decodeEntities(verseMatch[3]).trim();
        if (text) {
          verses.push({ number, text });
          continue;
        }
        // Merges an empty verse into the preceding verse, or drops it if none precedes.
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
