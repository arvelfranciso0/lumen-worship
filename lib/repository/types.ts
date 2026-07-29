import type { CustomBackground, Lineup, LayoutSizes, LayoutVisibility, Section, Song } from "@/components/lumen/data";

export type PersistedPrefs = Partial<{
  favs: Record<string, boolean>;
  look: string;
  scale: number;
  theme: "dark" | "light" | null;
  font: "sans" | "serif";
  chords: boolean;
  setIds: string[];
  setName: string;
  layoutSizes: LayoutSizes;
  layoutVisibility: LayoutVisibility;
}>;

export type PersistedData = {
  customSongs: Song[];
  lineups: Lineup[];
  customBackgrounds: CustomBackground[];
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
}
