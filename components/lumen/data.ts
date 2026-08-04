import type { CSSProperties } from "react";

// A single global style applied to every lyric line on screen — set once in
// Settings, not per line/song. Font size stays governed by the existing
// "Lyric size" slider (state.scale), so it isn't duplicated here. Highlight
// is deliberately NOT part of this — it's applied to specific selected text
// instead (see HighlightRange below), not the whole screen.
export type LyricStyle = {
  bold: boolean;
  italic: boolean;
  color?: string;
  // outlineWidth of 0 (or undefined) means no outline — replaces the old
  // boolean `outline` field so width/color can both be tuned instead of a
  // fixed 1.5px black stroke.
  outlineColor?: string;
  outlineWidth?: number;
};

export const DEFAULT_LYRIC_STYLE: LyricStyle = {
  bold: false, italic: false, outlineWidth: 0,
};

// Converts the global lyric style into real CSS, applied at every render
// surface (PreviewPanel, PresentationOverlay, SlidesPanel). Properties are left
// undefined when off, so each surface's own default (className-driven)
// weight/color keeps applying instead of being clobbered.
export function lyricStyleCss(style: LyricStyle): CSSProperties {
  return {
    fontWeight: style.bold ? 700 : undefined,
    fontStyle: style.italic ? "italic" : undefined,
    color: style.color || undefined,
    WebkitTextStroke: style.outlineWidth ? style.outlineWidth + "px " + (style.outlineColor || "rgba(0,0,0,.55)") : undefined,
  };
}

// A highlight applied to one specific slice of one specific line — set by
// selecting text in the lyrics editor and picking a color, not a global
// toggle. `start`/`end` are character offsets into that line's string.
export type HighlightRange = { start: number; end: number; color: string };

// A text selection made directly on the Live output box, expressed as
// line-index + character-offset pairs. Lives here rather than next to the
// code that produces it (PreviewPanel) because the selection is now shared
// state: PreviewPanel captures it, MainPanel's text toolbar consumes it.
export type LiveHighlightSelection = {
  startLineIndex: number; startOffset: number; endLineIndex: number; endOffset: number;
};

// Splits a line into plain/highlighted segments for rendering. Ranges are
// clamped to the line's bounds and sorted so out-of-order or slightly
// stale ranges (e.g. after the line text was edited) still render sanely
// instead of throwing or producing overlapping spans.
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

// Removes (or clips) any existing ranges that overlap [start, end) — used
// both before inserting a new highlight (so colors never overlap) and to
// implement "remove highlight" over a selection.
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

// Bible verses aren't part of a Song's sections, so their highlights are
// stored separately — keyed by translation + reference, since ranges are
// character offsets into that translation's specific wording.
export type BibleHighlights = Record<string, HighlightRange[]>;

export function bibleHighlightKey(translation: string, book: string, chapter: number, verseNumber: number): string {
  return translation + "|" + book + "|" + chapter + "|" + verseNumber;
}

// Canonical 1-66 order, used to recover a book's number from its name in any
// supported language (see canonicalBookNumber).
const CANONICAL_BOOK_CODES = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH",
  "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS",
  "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH",
  "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

// Reference labels for the on-screen caption, one map per language.
//
// English uses three-letter codes ("PSA 23:2") — short enough not to compete
// with the verse text, and universally recognised. Other languages map each book
// to its own full name instead: "PSA" is an abbreviation *of the English word*
// and carries no meaning for a Cebuano-speaking congregation, so "Mga Salmo
// 23:2" is the correct caption there even though it's longer.
//
// The maps are kept separate rather than merged because a handful of names are
// spelled identically across languages ("Genesis", "Ruth", "Ezra", "Job",
// "Daniel", "Joel", "Amos", "Nahum", "1 Samuel", "2 Samuel") but must render
// differently — "GEN" in an English translation, "Genesis" in a Cebuano one. So
// bookAbbreviation resolves against the translation's language first.
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

// Cebuano (RCPV / Maayong Balita Biblia) — each book labelled with its own full
// name. MUST stay in canonical 1-66 order: canonicalBookNumber reads a book's
// number from its position here, and the key order is asserted against the
// parser's own Cebuano name table in bookNames.test.ts.
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

// Keyed by the language normalizeBibleLanguage resolves for a translation, which
// is the same key electron/bibleXml.js's BOOK_NAMES_BY_LANGUAGE uses to name the
// books in the first place.
const BOOK_LABELS_BY_LANGUAGE: Record<string, Record<string, string>> = {
  Cebuano: BOOK_ABBREVIATIONS_CEBUANO,
};

// Canonical 1-66 order for each non-English language, derived from its label
// map's key order (string keys preserve insertion order in JS; none of these are
// integer-like, so "1 Samuel" and friends are safe).
const CEBUANO_BOOK_NAMES = Object.keys(BOOK_ABBREVIATIONS_CEBUANO);

// The label shown in the on-screen reference caption. `language` is the
// translation's own language — required to disambiguate the names spelled the
// same in two languages (see the note on BOOK_ABBREVIATIONS above). Falls back
// to the English code, then to a generic first-three-letters rule.
export function bookAbbreviation(bookName: string, language?: string): string {
  const localized = language ? BOOK_LABELS_BY_LANGUAGE[language]?.[bookName] : undefined;
  if (localized) return localized;
  return BOOK_ABBREVIATIONS[bookName] || bookName.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase();
}

// A book's canonical 1-66 number, resolved from its name in any supported
// language. Deliberately language-agnostic: its whole job is to follow a book
// across a translation switch, where the incoming name belongs to the *previous*
// translation's language. Selecting "Mga Salmo" and then switching to an English
// translation lands on Psalms rather than dead-ending on a name that translation
// has never heard of. null for an unrecognized name.
export function canonicalBookNumber(bookName: string): number | null {
  const code = BOOK_ABBREVIATIONS[bookName];
  if (code) {
    const index = CANONICAL_BOOK_CODES.indexOf(code);
    if (index !== -1) return index + 1;
  }
  const cebuanoIndex = CEBUANO_BOOK_NAMES.indexOf(bookName);
  return cebuanoIndex === -1 ? null : cebuanoIndex + 1;
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
  // Standard OS-installed fonts — no download needed, rendered using
  // whatever the presenting machine already has (same convention as any
  // Word/PowerPoint font list).
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
  // Parallel to `lines` — lineHighlights[i] is the set of highlighted
  // ranges within lines[i]. Omitted/empty entries mean no highlights.
  lineHighlights?: HighlightRange[][];
  // Operator-only note for this slide (e.g. "wait for cue"), and an optional
  // per-slide background override (a Look/CustomBackground id) — both ride
  // the existing songOverrides persistence, no separate storage needed.
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
  // CCLI licence number, shown alongside title/artist/key. Editable for every
  // song (built-in ones included) via songMetaOverrides, not just custom-*.
  ccli?: string;
  sections: Section[];
};

export type Lineup = {
  id: string;
  name: string;
  songIds: string[];
};

// A named set of Bible verse references. Translation-agnostic on purpose — only
// the reference is stored, so the text resolves live against whichever
// translation is selected when the collection is opened.
export type BibleCollection = {
  id: string;
  name: string;
  verseRefs: { book: string; chapter: number; verse: number }[];
};

// Which sidebar tab a product tour belongs to; each is shown at most once, then
// remembered (see TourSeenFlags / Settings' "Replay").
export type TourMode = "songs" | "bible" | "lineups";
export type TourSeenFlags = Record<TourMode, boolean>;

// "slidesStrip" is retained only so previously-persisted layoutVisibility
// objects still type-check on load — it is no longer user-toggleable (see
// LAYOUT_PANELS). Since the handoff redesign the slides grid and Backgrounds
// panel are the main column's whole body; hiding them would leave it empty.
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

// An uploaded image/video background, layered alongside the builtin gradient
// Looks. `url` is resolved by the repository layer at load time (an object
// URL for the IndexedDB backend, a custom-protocol URL for Electron) — never
// persisted as-is, since object URLs don't survive a reload.
export type CustomBackground = {
  id: string;
  name: string;
  mediaType: "image" | "video";
  url: string;
  // A single captured frame (data URL), generated client-side once per
  // session — not persisted. Lets every preview spot except the actual live
  // output skip decoding the real video.
  posterUrl?: string;
};

// Which translation a Bible-compare request can actually be honoured against,
// or null if it can't be honoured at all.
//
// state.compareMode is only a *request*, and the conditions that make comparison
// possible can disappear under it: the second translation gets deleted, or the
// primary is switched to the very translation being compared against. Both put
// the same verse on the audience screen twice, captioned as though it were two
// different translations — so the request is re-validated on every render rather
// than trusted once.
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

// `endNumber` marks a verse bridge — where a translation merges consecutive
// verses into one block of text (the XML represents this as a numbered verse
// followed by empty ones). Display uses the range ("1-3"); `number` stays the
// raw start number, since it's also the stable highlight-cache key.
export type BibleVerse = { number: number; text: string; endNumber?: number };
export type BibleChapter = { number: number; verses: BibleVerse[] };
export type BibleBook = { number: number; name: string; testament: "Old" | "New"; chapters: BibleChapter[] };
export type BibleTranslation = { meta: BibleMeta; books: BibleBook[] };

// A translation the user has manually imported (see BIBLE_DOWNLOADS_URL
// below) — carries the same descriptive fields as BibleMeta (minus `path`,
// which only made sense for a bundled static file) plus import bookkeeping.
// The actual verse data lives in the repository and is fetched lazily via
// getBibleTranslationData(), never eagerly loaded here, since each
// translation's JSON can be several megabytes. This app has no bundled
// Bible data at all (public/bible/ was removed — translations live in a
// separate landing-page project) — this list is the sole source of truth
// for which translations/languages are available to view.
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
// A single blank line, not a message — a translation that hasn't been
// downloaded yet must never show explanatory text on the actual live/preview
// output (Sidebar has its own "Import" placeholder for that). Kept as a
// single-item array (like LOADING_PASSAGE/MISSING_PASSAGE) rather than `[]`
// so `slides`/`cur` downstream always has a real, defined current slide.
export const NOT_DOWNLOADED_PASSAGE = [""];

// Where the public Bible-translation download page (a separate project,
// deployed independently) is hosted — update this once that site is live.
// Used to open the page from Settings > Bible Translations, since this app
// bundles no translation data at all; every translation comes from a
// manual download-then-import there.
export const BIBLE_DOWNLOADS_URL = "https://lumen-worship.netlify.app/";

export const CHIPS = ["All", "Favorites", "Hymn", "Contemporary", "Español"];
export const SORTS = ["Recent", "A–Z", "Key"];

// Filter chips for the Backgrounds panel, matching Look.kind. Uploaded
// backgrounds are bucketed into Image/Video by their mediaType.
export const LOOK_CATEGORIES = ["Solid", "Gradient", "Image", "Video"] as const;
