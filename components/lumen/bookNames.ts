// Canonical 1-66 book order, used to recover a book's number from its name.
const CANONICAL_BOOK_CODES = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH",
  "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS",
  "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH",
  "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

// Reference labels for the on-screen caption, one map per language.
const BOOK_ABBREVIATIONS: Record<string, string> = {
  Genesis: "GEN", Exodus: "EXO", Leviticus: "LEV", Numbers: "NUM", Deuteronomy: "DEU",
  Joshua: "JOS", Judges: "JDG", Ruth: "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA",
  "1 Kings": "1KI", "2 Kings": "2KI", "1 Chronicles": "1CH", "2 Chronicles": "2CH",
  Ezra: "EZR", Nehemiah: "NEH", Esther: "EST", Job: "JOB", Psalms: "PSA", Proverbs: "PRO",
  Ecclesiastes: "ECC", "Song of Solomon": "SNG", Isaiah: "ISA", Jeremiah: "JER",
  Lamentations: "LAM", Ezekiel: "EZK", Daniel: "DAN", Hosea: "HOS", Joel: "JOL",
  Amos: "AMO", Obadiah: "OBA", Jonah: "JON", Micah: "MIC", Nahum: "NAM",
  Habakkuk: "HAB", Zephaniah: "ZEP", Haggai: "HAG", Zechariah: "ZEC", Malachi: "MAL",
  Matthew: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN", Acts: "ACT", Romans: "ROM",
  "1 Corinthians": "1CO", "2 Corinthians": "2CO", Galatians: "GAL", Ephesians: "EPH",
  Philippians: "PHP", Colossians: "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH",
  "1 Timothy": "1TI", "2 Timothy": "2TI", Titus: "TIT", Philemon: "PHM", Hebrews: "HEB",
  James: "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN", "2 John": "2JN",
  "3 John": "3JN", Jude: "JUD", Revelation: "REV",
};

// Cebuano book names for the reference caption; order must stay canonical 1-66.
const BOOK_ABBREVIATIONS_CEBUANO: Record<string, string> = {
  Genesis: "Genesis", Exodo: "Exodo", Levitico: "Levitico", Numeros: "Numeros", Deuteronomio: "Deuteronomio",
  Josue: "Josue", Maghuhukom: "Maghuhukom", Ruth: "Ruth", "1 Samuel": "1 Samuel", "2 Samuel": "2 Samuel",
  "1 Mga Hari": "1 Mga Hari", "2 Mga Hari": "2 Mga Hari", "1 Cronicas": "1 Cronicas", "2 Cronicas": "2 Cronicas",
  Ezra: "Ezra", Nehemias: "Nehemias", Ester: "Ester", Job: "Job", "Mga Salmo": "Mga Salmo", "Mga Panultihon": "Mga Panultihon",
  Ecclesiastes: "Ecclesiastes", "Awit ni Solomon": "Awit ni Solomon", Isaias: "Isaias", Jeremias: "Jeremias",
  Pagbangotan: "Pagbangotan", Ezequiel: "Ezequiel", Daniel: "Daniel", Oseas: "Oseas", Joel: "Joel",
  Amos: "Amos", Obadias: "Obadias", Jonas: "Jonas", Miqueas: "Miqueas", Nahum: "Nahum",
  Habacuc: "Habacuc", Sofonias: "Sofonias", Haggeo: "Haggeo", Zacarias: "Zacarias", Malaquias: "Malaquias",
  Mateo: "Mateo", Marcos: "Marcos", Lucas: "Lucas", Juan: "Juan", "Mga Buhat": "Mga Buhat", "Mga Taga-Roma": "Mga Taga-Roma",
  "1 Mga Taga-Corinto": "1 Mga Taga-Corinto", "2 Mga Taga-Corinto": "2 Mga Taga-Corinto", "Mga Taga-Galacia": "Mga Taga-Galacia", "Mga Taga-Efeso": "Mga Taga-Efeso",
  "Mga Taga-Filipos": "Mga Taga-Filipos", "Mga Taga-Colosas": "Mga Taga-Colosas", "1 Mga Taga-Tesalonica": "1 Mga Taga-Tesalonica", "2 Mga Taga-Tesalonica": "2 Mga Taga-Tesalonica",
  "1 Timoteo": "1 Timoteo", "2 Timoteo": "2 Timoteo", Tito: "Tito", Filemon: "Filemon", "Mga Hebreohanon": "Mga Hebreohanon",
  Santiago: "Santiago", "1 Pedro": "1 Pedro", "2 Pedro": "2 Pedro", "1 Juan": "1 Juan", "2 Juan": "2 Juan",
  "3 Juan": "3 Juan", Judas: "Judas", Pinadayag: "Pinadayag",
};

// Keyed by the language normalizeBibleLanguage resolves for a translation.
const BOOK_LABELS_BY_LANGUAGE: Record<string, Record<string, string>> = {
  Cebuano: BOOK_ABBREVIATIONS_CEBUANO,
};

// Canonical 1-66 order for Cebuano, derived from its label map's key order.
const CEBUANO_BOOK_NAMES = Object.keys(BOOK_ABBREVIATIONS_CEBUANO);

// Reference-caption label for a book, localized by translation language.
export function bookAbbreviation(bookName: string, language?: string): string {
  const localized = language ? BOOK_LABELS_BY_LANGUAGE[language]?.[bookName] : undefined;
  if (localized) return localized;
  return BOOK_ABBREVIATIONS[bookName] || bookName.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase();
}

// A book's canonical 1-66 number, resolved from its name in any supported language.
export function canonicalBookNumber(bookName: string): number | null {
  const code = BOOK_ABBREVIATIONS[bookName];
  if (code) {
    const index = CANONICAL_BOOK_CODES.indexOf(code);
    if (index !== -1) return index + 1;
  }
  const cebuanoIndex = CEBUANO_BOOK_NAMES.indexOf(bookName);
  return cebuanoIndex === -1 ? null : cebuanoIndex + 1;
}

// The canonical number of a book named in some other translation's language.
export function bookNumberOf<BookType extends { number: number; name: string }>(
  books: BookType[], bookName: string
): number | null {
  const known = books.find((book) => book.name === bookName);
  return known ? known.number : canonicalBookNumber(bookName);
}

// The same book matched across translations, by canonical number then by name.
export function findBookAcrossTranslations<BookType extends { number: number; name: string }>(
  books: BookType[], bookNumber: number | null, bookName: string
): BookType | undefined {
  if (bookNumber !== null) {
    const byNumber = books.find((book) => book.number === bookNumber);
    if (byNumber) return byNumber;
  }
  return books.find((book) => book.name === bookName);
}
