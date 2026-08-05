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
  outputEnabled: boolean;
  outputDisplayId: number | "auto";
  autoUpdateEnabled: boolean;
  // Deliberately no longer written/read once tourSeen exists — see the
  // hasSeenOnboarding -> tourSeen migration in useLumen.ts's loadAll hydration.
  hasSeenOnboarding: boolean;
  performanceMode: boolean;
  transitionType: "cut" | "fade" | "slide" | "zoom" | "push";
  // Superseded by transitionDurationMs — read once on load to migrate an
  // existing value forward (see useLumen's loadAll hydration), never written.
  transitionSpeedPct: number;
  transitionDurationMs: number;
  operatorNotes: string;
  tourSeen: TourSeenFlags;
  deletedLookIds: string[];
}>;

export type PersistedData = {
  customSongs: Song[];
  lineups: Lineup[];
  customBackgrounds: CustomBackground[];
  downloadedBibleTranslations: DownloadedBibleTranslation[];
  songOverrides: Record<string, Section[]>;
  // Lets tags/CCLI/etc. be edited on built-in (non-custom-*) songs too,
  // mirroring how songOverrides already does this for lyrics — keyed by
  // song id, applied as a shallow patch over the base Song.
  songMetaOverrides: Record<string, Partial<Song>>;
  prefs: PersistedPrefs;
};

// The raw upload payload for a new background. `data` is an ArrayBuffer (not
// a Blob/File) because it has to survive both an IndexedDB put and an
// Electron contextBridge/IPC hop — both structured-clone ArrayBuffer cleanly.
export type NewBackgroundInput = {
  id: string;
  name: string;
  mediaType: "image" | "video";
  mimeType: string;
  data: ArrayBuffer;
};

// The raw payload for a manually-imported Bible translation (see
// DownloadedBibleTranslation/BIBLE_DOWNLOADS_URL in components/lumen/data.ts)
// — `data` is the raw file bytes (JSON or XML — see `format`), kept as an
// ArrayBuffer for the same structured-clone reasons as NewBackgroundInput.
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
  // Lazily reads+parses one translation's full verse data — not part of
  // loadAll()'s eager hydration, since each file can be several megabytes.
  getBibleTranslationData(code: string): Promise<BibleTranslation | null>;
  setSongMetaOverride(songId: string, patch: Partial<Song>): Promise<void>;
}
