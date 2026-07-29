import type { Lineup, LayoutSizes, LayoutVisibility, Section, Song } from "@/components/lumen/data";

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
  songOverrides: Record<string, Section[]>;
  prefs: PersistedPrefs;
};

export interface AppRepository {
  loadAll(): Promise<PersistedData>;
  upsertSong(song: Song): Promise<void>;
  deleteSong(id: string): Promise<void>;
  upsertLineup(lineup: Lineup): Promise<void>;
  deleteLineup(id: string): Promise<void>;
  setSongOverride(songId: string, sections: Section[]): Promise<void>;
  setPrefs(patch: PersistedPrefs): Promise<void>;
}
