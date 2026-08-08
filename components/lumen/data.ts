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

// Bible verse highlights, keyed by translation + reference.
export type BibleHighlights = Record<string, HighlightRange[]>;

export * from "./highlightUtils";
export * from "./bookNames";

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

export * from "./sampleSongs";
export * from "./sampleLooks";

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
