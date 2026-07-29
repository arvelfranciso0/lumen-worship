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
  outline: boolean;
};

export const DEFAULT_LYRIC_STYLE: LyricStyle = {
  bold: false, italic: false, outline: false,
};

// Converts the global lyric style into real CSS, applied at every render
// surface (MainPanel, PresentationOverlay, SlidesStrip). Properties are left
// undefined when off, so each surface's own default (className-driven)
// weight/color keeps applying instead of being clobbered.
export function lyricStyleCss(style: LyricStyle): CSSProperties {
  return {
    fontWeight: style.bold ? 700 : undefined,
    fontStyle: style.italic ? "italic" : undefined,
    color: style.color || undefined,
    WebkitTextStroke: style.outline ? "1.5px rgba(0,0,0,.55)" : undefined,
  };
}

// A highlight applied to one specific slice of one specific line — set by
// selecting text in the lyrics editor and picking a color, not a global
// toggle. `start`/`end` are character offsets into that line's string.
export type HighlightRange = { start: number; end: number; color: string };

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

export type LyricFontId =
  | "sans" | "serif" | "inter" | "poppins" | "playfair" | "merriweather"
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
  sections: Section[];
};

export type Lineup = {
  id: string;
  name: string;
  songIds: string[];
};

export type LayoutPanelId = "sidebar" | "preview" | "slidesStrip";

export type LayoutSizes = {
  sidebarWidth: number;
  previewWidth: number;
  slidesStripHeight: number;
};

export type LayoutVisibility = Record<LayoutPanelId, boolean>;

export const DEFAULT_LAYOUT_SIZES: LayoutSizes = {
  sidebarWidth: 328,
  previewWidth: 352,
  slidesStripHeight: 154,
};

export const DEFAULT_LAYOUT_VISIBILITY: LayoutVisibility = {
  sidebar: true,
  preview: true,
  slidesStrip: true,
};

export const LAYOUT_SIZE_LIMITS: Record<keyof LayoutSizes, { min: number; max: number }> = {
  sidebarWidth: { min: 240, max: 480 },
  previewWidth: { min: 260, max: 460 },
  slidesStripHeight: { min: 120, max: 260 },
};

export const LAYOUT_PANELS: { id: LayoutPanelId; label: string; description: string }[] = [
  { id: "sidebar", label: "Library sidebar", description: "Songs, Bible, and lineups browser on the left." },
  { id: "preview", label: "Previous / Next preview", description: "The upcoming and prior slide column." },
  { id: "slidesStrip", label: "Slides strip", description: "The horizontal slide thumbnails above the toolbar." },
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
];

export type BibleMeta = {
  code: string;
  language: string;
  name: string;
  license: string;
  link: string | null;
  path: string;
};

export type BibleVerse = { number: number; text: string };
export type BibleChapter = { number: number; verses: BibleVerse[] };
export type BibleBook = { number: number; name: string; testament: "Old" | "New"; chapters: BibleChapter[] };
export type BibleTranslation = { meta: BibleMeta; books: BibleBook[] };

export const DEFAULT_TRANSLATION = "EnglishKJ";

export const LOADING_PASSAGE = ["Loading translation…"];
export const MISSING_PASSAGE = ["This chapter isn't available in this translation."];

export const CHIPS = ["All", "Favorites", "Hymn", "Contemporary", "Español"];
export const SORTS = ["Recent", "A–Z", "Key"];
