import type { BibleHighlights, BibleTranslation, CustomBackground, DownloadedBibleTranslation, Lineup, LayoutSizes, LayoutVisibility, LyricFontId, LyricStyle, Section, Song } from "@/components/lumen/data";

export type PersistedPrefs = Partial<{
  favs: Record<string, boolean>;
  look: string;
  scale: number;
  theme: "dark" | "light" | null;
  font: LyricFontId;
  chords: boolean;
  setIds: string[];
  setName: string;
  layoutSizes: LayoutSizes;
  layoutVisibility: LayoutVisibility;
  lyricStyle: LyricStyle;
  bibleHighlights: BibleHighlights;
  outputEnabled: boolean;
  outputDisplayId: number | "auto";
  autoUpdateEnabled: boolean;
}>;

export type PersistedData = {
  customSongs: Song[];
  lineups: Lineup[];
  customBackgrounds: CustomBackground[];
  downloadedBibleTranslations: DownloadedBibleTranslation[];
  songOverrides: Record<string, Section[]>;
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
// — `data` is the raw JSON file bytes, kept as an ArrayBuffer for the same
// structured-clone reasons as NewBackgroundInput.
export type NewBibleTranslationInput = {
  code: string;
  language: string;
  name: string;
  license: string;
  link: string | null;
  data: ArrayBuffer;
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
}
