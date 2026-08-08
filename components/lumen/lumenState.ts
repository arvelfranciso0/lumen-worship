import {
  DEFAULT_LAYOUT_SIZES, DEFAULT_LAYOUT_VISIBILITY, DEFAULT_LYRIC_FONT, DEFAULT_LYRIC_STYLE, DEFAULT_TRANSLATION,
  type BibleHighlights, type CustomBackground, type DownloadedBibleTranslation, type HighlightRange,
  type LayoutSizes, type LayoutVisibility, type Lineup, type LiveHighlightSelection, type LyricFontId,
  type LyricStyle, type Section, type Song, type TourMode, type TourSeenFlags,
} from "./data";
import { DEFAULT_TRANSITION_MS } from "./hooks/useSlideTransition";

export type Mode = "songs" | "bible" | "lineups";

export type ConfirmDialogState = {
  title: string;
  body?: string;
  danger?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
};

const TOUR_SEEN_DEFAULT: TourSeenFlags = { songs: false, bible: false, lineups: false };

export type LumenState = {
  query: string;
  chip: string;
  sort: string;
  songId: string;
  idx: number;
  favs: Record<string, boolean>;
  look: string;
  scale: number;
  presenting: boolean;
  // 3/2/1 countdown shown on the Present button; null when not running. Not persisted.
  presentCountdown: number | null;
  blank: boolean;
  black: boolean;
  settingsOpen: boolean;
  font: LyricFontId;
  theme: "dark" | "light" | null;
  mode: Mode;
  book: string;
  chapter: number;
  trans: string;
  setIds: string[];
  setName: string;
  activeLineupId: string | null;
  setPanelOpen: boolean;
  songOverrides: Record<string, Section[]>;
  lyricsEditorOpen: boolean;
  customSongs: Song[];
  uploadOpen: boolean;
  lineups: Lineup[];
  lineupModalOpen: boolean;
  editingLineupId: string | null;
  // Which lineup's detail view (Sidebar's LineupDetail) is currently open; not persisted.
  viewingLineupId: string | null;
  layoutSizes: LayoutSizes;
  layoutVisibility: LayoutVisibility;
  customBackgrounds: CustomBackground[];
  downloadedTranslations: DownloadedBibleTranslation[];
  lyricStyle: LyricStyle;
  bibleHighlights: BibleHighlights;
  // Whether the second-monitor audience output window should be open right now. Not persisted.
  outputEnabled: boolean;
  // Which display "auto"/a specific id should target; persisted.
  outputDisplayId: number | "auto";
  // Whether the desktop build checks GitHub Releases for updates on launch; no-op in the browser build.
  autoUpdateEnabled: boolean;
  // Whether the first-launch welcome guide has already been shown/dismissed. Superseded by tourSeen.
  hasSeenOnboarding: boolean;

  // ---- Redesign additions (persisted) ----
  performanceMode: boolean;
  transitionType: "cut" | "fade" | "slide" | "zoom" | "push";
  transitionDurationMs: number;
  operatorNotes: string;
  tourSeen: TourSeenFlags;
  deletedLookIds: string[];
  songMetaOverrides: Record<string, Partial<Song>>;
  // Per-lineup slide background overrides, kept separate from songOverrides.
  lineupSongLooks: Record<string, Record<string, (string | null)[]>>;

  // ---- Redesign additions (ephemeral — never persisted) ----
  confirmDialog: ConfirmDialogState | null;
  saveStatus: "idle" | "saving" | "saved";
  displaysModalOpen: boolean;
  bibleTranslationsPanelOpen: boolean;
  // In-panel UI state for the Backgrounds/Transitions panels.
  transitionRowOpen: boolean;
  backgroundCategory: string;
  backgroundApplyAllArmed: boolean;
  operatorNotesOpen: boolean;
  // Text selected on the Live output box, read by the Highlight controls.
  liveSelection: LiveHighlightSelection | null;
  highlightColor: string;
  hotkeysOpen: boolean;
  globalSearchOpen: boolean;
  globalSearchQuery: string;
  songEditorOpen: boolean;
  songEditorMode: "create" | "edit";
  bibleSubTab: "browse" | "compare";
  // Session-only key transpose for the operator view; not persisted or sent to the output.
  transposeSemitones: number;
  // Sidebar drawer open state; tablet/mobile only.
  sidebarDrawerOpen: boolean;
  // Mobile single-pane view switcher, driven by MobileTabBar.tsx.
  mobileView: "library" | "slides" | "live";
  tourStep: number;
  tourMode: TourMode | null;
  compareMode: { verseIndex: number; translationB: string } | null;
};

export type Slide = {
  label: string; lines: string[]; lineHighlights?: HighlightRange[][]; slideNumber: number; caption: string;
  // Song mode only: per-slide background override and operator note, carried from Section.
  lookId?: string; note?: string;
  // Bible Compare only: both translations' wording of a verse, with the shared superscript verse number.
  compare?: { verseNumber: string };
};

// Slide shown while blanked: no lines, label, or caption.
export const BLANK_SLIDE: Slide = { label: "", lines: [], slideNumber: 0, caption: "" };

export const UNDO_STACK_CAP = 50;

// State keys tracked for undo/redo — content edits only, not navigation/UI state.
export const HISTORY_TRACKED_KEYS: (keyof LumenState)[] = [
  "songOverrides", "songMetaOverrides", "setIds", "setName", "lyricStyle",
  "customBackgrounds", "bibleHighlights", "favs", "lineups", "lineupSongLooks",
  "customSongs", "font", "scale", "transitionType", "transitionDurationMs",
  "downloadedTranslations",
];

export const INITIAL_STATE: LumenState = {
  query: "", chip: "All", sort: "Recent", songId: "s3", idx: 2,
  favs: { s1: true, s3: true, s6: true },
  look: "aurora", scale: 1, presenting: false, presentCountdown: null, blank: false, black: false,
  settingsOpen: false, font: DEFAULT_LYRIC_FONT, theme: null,
  mode: "songs", book: "Genesis", chapter: 1, trans: DEFAULT_TRANSLATION,
  setIds: ["s1", "s3", "s4", "s6"], setName: "Set 1", activeLineupId: null, setPanelOpen: false,
  songOverrides: {}, lyricsEditorOpen: false,
  customSongs: [], uploadOpen: false,
  lineups: [], lineupModalOpen: false, editingLineupId: null, viewingLineupId: null,
  layoutSizes: DEFAULT_LAYOUT_SIZES, layoutVisibility: DEFAULT_LAYOUT_VISIBILITY,
  customBackgrounds: [],
  downloadedTranslations: [],
  lyricStyle: DEFAULT_LYRIC_STYLE,
  bibleHighlights: {},
  outputEnabled: false, outputDisplayId: "auto",
  autoUpdateEnabled: false,
  hasSeenOnboarding: false,

  performanceMode: false,
  transitionType: "cut", transitionDurationMs: DEFAULT_TRANSITION_MS,
  operatorNotes: "",
  tourSeen: TOUR_SEEN_DEFAULT, deletedLookIds: [],
  songMetaOverrides: {},
  lineupSongLooks: {},

  confirmDialog: null, saveStatus: "idle",
  displaysModalOpen: false, hotkeysOpen: false, globalSearchOpen: false, globalSearchQuery: "",
  bibleTranslationsPanelOpen: false,
  transitionRowOpen: true, backgroundCategory: "All", backgroundApplyAllArmed: false,
  operatorNotesOpen: false, liveSelection: null, highlightColor: "#fde047",
  songEditorOpen: false, songEditorMode: "create",
  bibleSubTab: "browse", transposeSemitones: 0,
  sidebarDrawerOpen: false, mobileView: "slides",
  tourStep: 0, tourMode: null, compareMode: null,
};

// Migrates the legacy hasSeenOnboarding flag into per-mode tourSeen, once.
export function resolveTourSeenOnHydrate(hasSeenOnboarding: boolean): TourSeenFlags {
  return hasSeenOnboarding ? { songs: true, bible: true, lineups: true } : TOUR_SEEN_DEFAULT;
}
