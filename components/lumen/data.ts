import type { CSSProperties } from "react";

// Global lyric style applied to every line on screen, set once in Settings.
export type LyricStyle = {
  bold: boolean;
  italic: boolean;
  color?: string;
  // outlineWidth of 0 (or undefined) means no outline.
  outlineColor?: string;
  outlineWidth?: number;
};

export const DEFAULT_LYRIC_STYLE: LyricStyle = {
  bold: false, italic: false, outlineWidth: 0,
};

// Converts the global lyric style into CSS properties.
export function lyricStyleCss(style: LyricStyle): CSSProperties {
  return {
    fontWeight: style.bold ? 700 : undefined,
    fontStyle: style.italic ? "italic" : undefined,
    color: style.color || undefined,
    WebkitTextStroke: style.outlineWidth ? style.outlineWidth + "px " + (style.outlineColor || "rgba(0,0,0,.55)") : undefined,
  };
}

// A highlighted range within one line, set by selecting text and picking a color.
export type HighlightRange = { start: number; end: number; color: string };

// A text selection made on the Live output box, as line-index + character-offset pairs.
export type LiveHighlightSelection = {
  startLineIndex: number; startOffset: number; endLineIndex: number; endOffset: number;
};

// Splits a line into plain/highlighted segments for rendering.
export function splitLineIntoSegments(line: string, ranges?: HighlightRange[]): { text: string; color?: string }[] {
  if (!ranges || ranges.length === 0) return [{ text: line }];
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  const segments: { text: string; color?: string }[] = [];
  let cursor = 0;
  for (const range of sortedRanges) {
    const start = Math.max(cursor, Math.min(range.start, line.length));
    const end = Math.max(start, Math.min(range.end, line.length));
    if (start > cursor) segments.push({ text: line.slice(cursor, start) });
    if (end > start) segments.push({ text: line.slice(start, end), color: range.color });
    cursor = Math.max(cursor, end);
  }
  if (cursor < line.length) segments.push({ text: line.slice(cursor) });
  return segments.length ? segments : [{ text: line }];
}

// Removes or clips existing ranges that overlap [start, end).
export function subtractHighlightRange(ranges: HighlightRange[], start: number, end: number): HighlightRange[] {
  const result: HighlightRange[] = [];
  for (const range of ranges) {
    if (range.end <= start || range.start >= end) { result.push(range); continue; }
    if (range.start < start) result.push({ ...range, end: start });
    if (range.end > end) result.push({ ...range, start: end });
  }
  return result;
}

export function addHighlightRange(ranges: HighlightRange[], newRange: HighlightRange): HighlightRange[] {
  return [...subtractHighlightRange(ranges, newRange.start, newRange.end), newRange].sort((a, b) => a.start - b.start);
}

// Bible verse highlights, keyed by translation + reference.
export type BibleHighlights = Record<string, HighlightRange[]>;

export function bibleHighlightKey(translation: string, book: string, chapter: number, verseNumber: number): string {
  return translation + "|" + book + "|" + chapter + "|" + verseNumber;
}

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

export type LyricFontId =
  | "sans" | "serif" | "inter" | "poppins" | "playfair" | "merriweather" | "bebas"
  | "arial" | "helvetica" | "times" | "georgia" | "courier" | "verdana"
  | "tahoma" | "trebuchet" | "garamond" | "palatino" | "comicsans" | "impact";

export type LyricFontOption = {
  id: LyricFontId;
  name: string;
  className: string;
  group: "Theme fonts" | "System fonts";
};

export const LYRIC_FONTS: LyricFontOption[] = [
  { id: "sans", name: "Instrument Sans", className: "font-sans", group: "Theme fonts" },
  { id: "serif", name: "Instrument Serif", className: "font-serif", group: "Theme fonts" },
  { id: "inter", name: "Inter", className: "font-inter", group: "Theme fonts" },
  { id: "poppins", name: "Poppins", className: "font-poppins", group: "Theme fonts" },
  { id: "playfair", name: "Playfair Display", className: "font-playfair", group: "Theme fonts" },
  { id: "merriweather", name: "Merriweather", className: "font-merriweather", group: "Theme fonts" },
  { id: "bebas", name: "Bebas Neue", className: "font-bebas", group: "Theme fonts" },
  // Standard OS-installed fonts, rendered using whatever the presenting machine has.
  { id: "arial", name: "Arial", className: "font-arial", group: "System fonts" },
  { id: "helvetica", name: "Helvetica", className: "font-helvetica", group: "System fonts" },
  { id: "times", name: "Times New Roman", className: "font-times", group: "System fonts" },
  { id: "georgia", name: "Georgia", className: "font-georgia", group: "System fonts" },
  { id: "courier", name: "Courier New", className: "font-courier", group: "System fonts" },
  { id: "verdana", name: "Verdana", className: "font-verdana", group: "System fonts" },
  { id: "tahoma", name: "Tahoma", className: "font-tahoma", group: "System fonts" },
  { id: "trebuchet", name: "Trebuchet MS", className: "font-trebuchet", group: "System fonts" },
  { id: "garamond", name: "Garamond", className: "font-garamond", group: "System fonts" },
  { id: "palatino", name: "Palatino Linotype", className: "font-palatino", group: "System fonts" },
  { id: "comicsans", name: "Comic Sans MS", className: "font-comicsans", group: "System fonts" },
  { id: "impact", name: "Impact", className: "font-impact", group: "System fonts" },
];

export const LYRIC_FONT_GROUPS: LyricFontOption["group"][] = ["Theme fonts", "System fonts"];

export const DEFAULT_LYRIC_FONT: LyricFontId = "sans";

export type Section = {
  label: string;
  lines: string[];
  // Parallel to `lines`: lineHighlights[i] is the highlighted ranges within lines[i].
  lineHighlights?: HighlightRange[][];
  // Operator-only note and optional per-slide background override for this slide.
  note?: string;
  lookId?: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: string;
  cat: string;
  tags: string[];
  fav: boolean;
  when: string;
  // CCLI licence number, editable on any song via songMetaOverrides.
  ccli?: string;
  sections: Section[];
};

export type Lineup = {
  id: string;
  name: string;
  songIds: string[];
};

// Which sidebar tab a product tour belongs to; shown once, then remembered.
export type TourMode = "songs" | "bible" | "lineups";
export type TourSeenFlags = Record<TourMode, boolean>;

// "slidesStrip" is kept only so previously-persisted layoutVisibility still type-checks; no longer user-toggleable.
export type LayoutPanelId = "sidebar" | "preview" | "slidesStrip";

export type LayoutSizes = {
  sidebarWidth: number;
  previewWidth: number;
  slidesStripHeight: number;
};

export type LayoutVisibility = Record<LayoutPanelId, boolean>;

export const DEFAULT_LAYOUT_SIZES: LayoutSizes = {
  sidebarWidth: 328,
  previewWidth: 440,
  slidesStripHeight: 260,
};

export const DEFAULT_LAYOUT_VISIBILITY: LayoutVisibility = {
  sidebar: true,
  preview: true,
  slidesStrip: true,
};

export const LAYOUT_SIZE_LIMITS: Record<keyof LayoutSizes, { min: number; max: number }> = {
  sidebarWidth: { min: 310, max: 480 },
  previewWidth: { min: 300, max: 640 },
  slidesStripHeight: { min: 120, max: 340 },
};

export const LAYOUT_PANELS: { id: LayoutPanelId; label: string; description: string }[] = [
  { id: "sidebar", label: "Show Library panel", description: "Songs, Bible, and lineups browser on the left." },
  { id: "preview", label: "Show Preview panel", description: "Live output, Previous/Next up, and the transport controls." },
];

export type Look = {
  id: string;
  name: string;
  kind: string;
  swatch: string;
  css: string;
  note?: "image" | "video";
};

// An uploaded image/video background, layered alongside the builtin gradient Looks.
export type CustomBackground = {
  id: string;
  name: string;
  mediaType: "image" | "video";
  url: string;
  // A captured preview frame (data URL), generated client-side; not persisted.
  posterUrl?: string;
};

// Which translation a Bible-compare request can actually be honoured against, or null.
export function resolveCompareTranslation(
  requestedCode: string | null | undefined,
  primaryCode: string,
  downloadedCodes: string[]
): string | null {
  if (!requestedCode) return null;
  // Comparing a translation with itself is not a comparison.
  if (requestedCode === primaryCode) return null;
  // Both sides have to still be imported.
  if (!downloadedCodes.includes(requestedCode)) return null;
  if (!downloadedCodes.includes(primaryCode)) return null;
  return requestedCode;
}

export type LookOption = Look | CustomBackground;

export function isCustomBackground(option: LookOption): option is CustomBackground {
  return "mediaType" in option;
}

export const SONGS: Song[] = [
  {
    id: "s1", title: "Amazing Grace", artist: "John Newton · Trad.", key: "G", bpm: "72 BPM",
    cat: "Hymn", tags: ["Hymn", "Grace"], fav: true, when: "8:12",
    sections: [
      { label: "Verse 1", lines: ["Amazing grace, how sweet the sound", "That saved a wretch like me"] },
      { label: "Verse 1", lines: ["I once was lost, but now am found", "Was blind, but now I see"] },
      { label: "Verse 2", lines: ["'Twas grace that taught my heart to fear", "And grace my fears relieved"] },
      { label: "Verse 2", lines: ["How precious did that grace appear", "The hour I first believed"] },
      { label: "Verse 3", lines: ["Through many dangers, toils and snares", "I have already come"] },
      { label: "Verse 3", lines: ["'Tis grace hath brought me safe thus far", "And grace will lead me home"] },
    ],
  },
  {
    id: "s2", title: "Holy, Holy, Holy", artist: "Reginald Heber · Trad.", key: "D", bpm: "68 BPM",
    cat: "Hymn", tags: ["Hymn", "Opening"], fav: false, when: "8:04",
    sections: [
      { label: "Verse 1", lines: ["Holy, holy, holy!", "Lord God Almighty"] },
      { label: "Verse 1", lines: ["Early in the morning", "Our song shall rise to Thee"] },
      { label: "Verse 2", lines: ["All the saints adore Thee", "Casting down their golden crowns"] },
      { label: "Verse 2", lines: ["Around the glassy sea", "Cherubim and seraphim"] },
    ],
  },
  {
    id: "s3", title: "Morning Light Rising", artist: "Hipe Collective", key: "A", bpm: "74 BPM",
    cat: "Contemporary", tags: ["Modern", "Set opener"], fav: true, when: "Wed",
    sections: [
      { label: "Verse 1", lines: ["Morning light is rising", "Over every shadow"] },
      { label: "Verse 1", lines: ["You were never distant", "You were always near"] },
      { label: "Chorus", lines: ["So we lift our voices", "Louder than the silence", "You are worthy still"] },
      { label: "Verse 2", lines: ["Every quiet promise", "Kept before we asked"] },
      { label: "Chorus", lines: ["So we lift our voices", "Louder than the silence", "You are worthy still"] },
      { label: "Bridge", lines: ["Nothing here can shake us", "Nothing here can shake us", "You go before us"] },
      { label: "Outro", lines: ["You are worthy still"] },
    ],
  },
  {
    id: "s4", title: "Great Is Thy Faithfulness", artist: "Thomas Chisholm · Trad.", key: "C", bpm: "70 BPM",
    cat: "Hymn", tags: ["Hymn", "Communion"], fav: false, when: "Sun",
    sections: [
      { label: "Verse 1", lines: ["Great is Thy faithfulness", "O God my Father"] },
      { label: "Verse 1", lines: ["There is no shadow of turning with Thee"] },
      { label: "Chorus", lines: ["Great is Thy faithfulness", "Morning by morning new mercies I see"] },
      { label: "Chorus", lines: ["All I have needed Thy hand hath provided"] },
    ],
  },
  {
    id: "s5", title: "Held By The Same Hand", artist: "Ridgeway Worship", key: "B♭", bpm: "66 BPM",
    cat: "Contemporary", tags: ["Response", "Slow"], fav: false, when: "Sun",
    sections: [
      { label: "Verse 1", lines: ["When the room goes quiet", "And the questions stay"] },
      { label: "Chorus", lines: ["I am held by the same hand", "That holds the morning"] },
      { label: "Bridge", lines: ["Steady, steady", "You have not let go"] },
    ],
  },
  {
    id: "s6", title: "Come Thou Fount", artist: "Robert Robinson · Trad.", key: "E", bpm: "76 BPM",
    cat: "Hymn", tags: ["Hymn", "Favorite"], fav: true, when: "Jul 12",
    sections: [
      { label: "Verse 1", lines: ["Come thou fount of every blessing", "Tune my heart to sing Thy grace"] },
      { label: "Verse 1", lines: ["Streams of mercy never ceasing", "Call for songs of loudest praise"] },
      { label: "Verse 2", lines: ["Here I raise mine Ebenezer", "Hither by Thy help I come"] },
    ],
  },
  {
    id: "s7", title: "Noche De Paz", artist: "Trad. · Español", key: "F", bpm: "62 BPM",
    cat: "Español", tags: ["Español", "Christmas"], fav: false, when: "Dec",
    sections: [
      { label: "Verso 1", lines: ["Noche de paz, noche de amor", "Todo duerme en derredor"] },
      { label: "Verso 2", lines: ["Entre los astros que esparcen su luz"] },
    ],
  },
];

export const LOOKS: Look[] = [
  {
    id: "midnight", name: "Midnight", kind: "Solid", swatch: "#0b0b10",
    css: "radial-gradient(120% 90% at 50% 0%, #17171f 0%, #0a0a0e 60%, #060608 100%)",
  },
  {
    id: "aurora", name: "Aurora", kind: "Gradient", swatch: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
    css: "linear-gradient(135deg, #241a45 0%, #16233f 55%, #0b0e18 100%)",
  },
  {
    id: "sanctuary", name: "Sanctuary", kind: "Image", swatch: "repeating-linear-gradient(45deg,#2b2b33 0 4px,#1a1a20 4px 8px)",
    css: "repeating-linear-gradient(38deg, rgba(255,255,255,.045) 0 10px, rgba(255,255,255,0) 10px 20px), linear-gradient(180deg,#1b1a22,#0c0c11)",
    note: "image",
  },
  {
    id: "motion", name: "Motion", kind: "Video", swatch: "repeating-linear-gradient(90deg,#233b3a 0 4px,#12201f 4px 8px)",
    css: "repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 12px, rgba(255,255,255,0) 12px 24px), linear-gradient(160deg,#0f2320,#08100f)",
    note: "video",
  },
  {
    id: "charcoal", name: "Charcoal", kind: "Solid", swatch: "#161618",
    css: "radial-gradient(120% 90% at 50% 0%, #1f1f22 0%, #131315 60%, #0a0a0b 100%)",
  },
  {
    id: "ink", name: "Ink", kind: "Solid", swatch: "#0a0e14",
    css: "radial-gradient(120% 90% at 50% 100%, #10161f 0%, #090c11 60%, #050608 100%)",
  },
  {
    id: "stone", name: "Stone", kind: "Solid", swatch: "#1c1a17",
    css: "radial-gradient(120% 90% at 50% 0%, #24211d 0%, #17140f 60%, #0d0b09 100%)",
  },
  {
    id: "navy", name: "Navy", kind: "Solid", swatch: "#0a1120",
    css: "radial-gradient(120% 90% at 50% 100%, #101c33 0%, #0a1120 60%, #050810 100%)",
  },
  {
    id: "maroon", name: "Maroon", kind: "Solid", swatch: "#1a0a0d",
    css: "radial-gradient(120% 90% at 50% 0%, #260f14 0%, #170a0d 60%, #0c0506 100%)",
  },
  {
    id: "sunrise", name: "Sunrise", kind: "Gradient", swatch: "linear-gradient(135deg,#f97316,#ec4899)",
    css: "linear-gradient(135deg, #3a1c14 0%, #331730 55%, #140a17 100%)",
  },
  {
    id: "ocean", name: "Ocean", kind: "Gradient", swatch: "linear-gradient(135deg,#0ea5e9,#0f172a)",
    css: "linear-gradient(150deg, #082032 0%, #0b2a3d 45%, #061018 100%)",
  },
  {
    id: "ember", name: "Ember", kind: "Gradient", swatch: "linear-gradient(135deg,#f87171,#b45309)",
    css: "linear-gradient(150deg, #3a1410 0%, #2a1608 55%, #120705 100%)",
  },
  {
    id: "meadow", name: "Meadow", kind: "Gradient", swatch: "linear-gradient(135deg,#34d399,#0f766e)",
    css: "linear-gradient(150deg, #0f2a22 0%, #0c2a24 55%, #061512 100%)",
  },
  {
    id: "twilight", name: "Twilight", kind: "Gradient", swatch: "linear-gradient(135deg,#6366f1,#1e1b4b)",
    css: "linear-gradient(150deg, #1f1b3d 0%, #171331 55%, #0a0818 100%)",
  },
  {
    id: "rose", name: "Rose", kind: "Gradient", swatch: "linear-gradient(135deg,#fb7185,#7c2d3f)",
    css: "linear-gradient(150deg, #33141d 0%, #2a1017 55%, #130709 100%)",
  },
  {
    id: "glacier", name: "Glacier", kind: "Gradient", swatch: "linear-gradient(135deg,#a5f3fc,#164e63)",
    css: "linear-gradient(150deg, #0c2732 0%, #0a2229 55%, #050f13 100%)",
  },
  {
    id: "gold", name: "Gold", kind: "Gradient", swatch: "linear-gradient(135deg,#fbbf24,#78350f)",
    css: "linear-gradient(150deg, #2e2107 0%, #241a09 55%, #110c04 100%)",
  },
  {
    id: "violet", name: "Violet", kind: "Gradient", swatch: "linear-gradient(135deg,#c084fc,#4c1d95)",
    css: "linear-gradient(150deg, #291b45 0%, #1f1538 55%, #0e0a1c 100%)",
  },
  {
    id: "dawn", name: "Dawn", kind: "Image", swatch: "repeating-linear-gradient(0deg,#2b2620 0 4px,#1a1712 4px 8px)",
    css: "repeating-linear-gradient(4deg, rgba(255,255,255,.04) 0 12px, rgba(255,255,255,0) 12px 24px), linear-gradient(180deg,#231f19,#0d0b08)",
    note: "image",
  },
  {
    id: "diagonal", name: "Diagonal Lines", kind: "Image", swatch: "repeating-linear-gradient(45deg,#26262e 0 6px,#17171d 6px 12px)",
    css: "repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 8px, rgba(255,255,255,0) 8px 16px), linear-gradient(180deg,#1c1c24,#0a0a0e)",
    note: "image",
  },
  {
    id: "grid", name: "Grid", kind: "Image", swatch: "repeating-linear-gradient(0deg,#26262e 0 2px,transparent 2px 26px)",
    css: "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 32px), linear-gradient(180deg,#17171d,#0a0a0e)",
    note: "image",
  },
  {
    id: "dots", name: "Dots", kind: "Image", swatch: "radial-gradient(#2e2e38 2px, transparent 2px)",
    css: "radial-gradient(rgba(255,255,255,.08) 2px, transparent 2px), linear-gradient(180deg,#18181f,#0a0a0e)",
    note: "image",
  },
  {
    id: "rings", name: "Rings", kind: "Video", swatch: "repeating-radial-gradient(circle,#233b3a 0 4px,#12201f 4px 8px)",
    css: "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.06) 0 2px, transparent 2px 28px), linear-gradient(160deg,#101f24,#07100f)",
    note: "video",
  },
  {
    id: "chevron", name: "Chevron", kind: "Video", swatch: "repeating-linear-gradient(135deg,#2a2440 0 5px,#171331 5px 10px)",
    css: "repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 10px, rgba(255,255,255,0) 10px 20px), repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 10px, rgba(255,255,255,0) 10px 20px), linear-gradient(160deg,#181432,#0a0818)",
    note: "video",
  },
];

export type BibleMeta = {
  code: string;
  language: string;
  name: string;
  license: string;
  link: string | null;
  path: string;
};

// endNumber marks a verse bridge, where consecutive verses are merged into one block.
export type BibleVerse = { number: number; text: string; endNumber?: number };
export type BibleChapter = { number: number; verses: BibleVerse[] };
export type BibleBook = { number: number; name: string; testament: "Old" | "New"; chapters: BibleChapter[] };
export type BibleTranslation = { meta: BibleMeta; books: BibleBook[] };

// A translation the user has manually imported; verse data is fetched lazily via getBibleTranslationData().
export type DownloadedBibleTranslation = {
  code: string;
  language: string;
  name: string;
  license: string;
  link: string | null;
  downloadedAt: number;
  sizeBytes: number;
};

export const DEFAULT_TRANSLATION = "EnglishKJ";

export const LOADING_PASSAGE = ["Loading translation…"];
export const MISSING_PASSAGE = ["This chapter isn't available in this translation."];
// A single blank line (not a message) shown for a translation that hasn't been downloaded.
export const NOT_DOWNLOADED_PASSAGE = [""];

// Where the public Bible-translation download page is hosted.
export const BIBLE_DOWNLOADS_URL = "https://lumen-worship.netlify.app/";

export const CHIPS = ["All", "Favorites", "Hymn", "Contemporary", "Español"];
export const SORTS = ["Recent", "A–Z", "Key"];

// Filter chips for the Backgrounds panel, matching Look.kind.
export const LOOK_CATEGORIES = ["Solid", "Gradient", "Image", "Video"] as const;
