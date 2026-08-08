import type { BibleHighlights, BibleTranslation, CustomBackground, DownloadedBibleTranslation, Lineup, LayoutSizes, LayoutVisibility, LyricFontId, LyricStyle, Section, Song, TourSeenFlags } from "@/components/lumen/data";

export type PersistedPrefs = Partial<{
  favs: Record<string, boolean>;
  look: string;
  scale: number;
  theme: "dark" | "light" | null;
  font: LyricFontId;
  setIds: string[];
  setName: string;
  layoutSizes: LayoutSizes;
  layoutVisibility: LayoutVisibility;
  lyricStyle: LyricStyle;
  bibleHighlights: BibleHighlights;
  // outputEnabled is not persisted; it's session-only runtime state in useLumen's LumenState.
  outputDisplayId: number | "auto";
  autoUpdateEnabled: boolean;
  // Superseded by tourSeen; no longer written or read.
  hasSeenOnboarding: boolean;
  performanceMode: boolean;
  transitionType: "cut" | "fade" | "slide" | "zoom" | "push";
  // Superseded by transitionDurationMs; read once on load to migrate, never written.
  transitionSpeedPct: number;
  transitionDurationMs: number;
  operatorNotes: string;
  tourSeen: TourSeenFlags;
  deletedLookIds: string[];
  // Per-lineup slide background overrides, keyed by lineup id then song id.
  lineupSongLooks: Record<string, Record<string, (string | null)[]>>;
}>;

export type PersistedData = {
  customSongs: Song[];
  lineups: Lineup[];
  customBackgrounds: CustomBackground[];
  downloadedBibleTranslations: DownloadedBibleTranslation[];
  songOverrides: Record<string, Section[]>;
  // Metadata edits (tags, CCLI, etc.), applied as a shallow patch over the base Song, keyed by song id.
  songMetaOverrides: Record<string, Partial<Song>>;
  prefs: PersistedPrefs;
};

// Raw upload payload for a new background.
export type NewBackgroundInput = {
  id: string;
  name: string;
  mediaType: "image" | "video";
  mimeType: string;
  data: ArrayBuffer;
};

// Raw payload for a manually-imported Bible translation.
export type NewBibleTranslationInput = {
  code: string;
  language: string;
  name: string;
  license: string;
  link: string | null;
  data: ArrayBuffer;
  format: "json" | "xml";
};

export interface AppRepository {
  loadAll(): Promise<PersistedData>;
  upsertSong(song: Song): Promise<void>;
  deleteSong(id: string): Promise<void>;
  upsertLineup(lineup: Lineup): Promise<void>;
  deleteLineup(id: string): Promise<void>;
  setSongOverride(songId: string, sections: Section[]): Promise<void>;
  setPrefs(patch: PersistedPrefs): Promise<void>;
  addBackground(input: NewBackgroundInput): Promise<void>;
  deleteBackground(id: string): Promise<void>;
  addBibleTranslation(input: NewBibleTranslationInput): Promise<void>;
  deleteBibleTranslation(code: string): Promise<void>;
  // Lazily reads and parses one translation's full verse data.
  getBibleTranslationData(code: string): Promise<BibleTranslation | null>;
  setSongMetaOverride(songId: string, patch: Partial<Song>): Promise<void>;
}
