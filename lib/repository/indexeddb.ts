import type { BibleTranslation, Lineup, Section, Song } from "@/components/lumen/data";
import type { AppRepository, NewBackgroundInput, NewBibleTranslationInput, PersistedData, PersistedPrefs } from "./types";
// Plain CJS module shared verbatim with electron/preload.js.
import { parseBibleXml } from "../../electron/bibleXml.js";
import { del, getAll, getOne, openDb, put } from "./idbHelpers";

type StoredBackground = {
  id: string;
  name: string;
  mediaType: "image" | "video";
  mimeType: string;
  data: ArrayBuffer;
};

type StoredBibleTranslation = {
  code: string;
  language: string;
  name: string;
  license: string;
  link: string | null;
  downloadedAt: number;
  sizeBytes: number;
  // Parsed once at import time and persisted directly.
  parsedData?: BibleTranslation;
  // Raw file bytes, only present on rows written before parsedData existed.
  data?: ArrayBuffer;
  format?: "json" | "xml";
};

export function createIndexedDbRepository(): AppRepository {
  const dbPromise = openDb();

  return {
    async loadAll(): Promise<PersistedData> {
      const db = await dbPromise;
      const [customSongs, lineups, overrideRows, prefRows, backgroundRows, bibleTranslationRows, songMetaOverrideRows] = await Promise.all([
        getAll<Song>(db, "songs"),
        getAll<Lineup>(db, "lineups"),
        getAll<{ songId: string; sections: Section[] }>(db, "songOverrides"),
        getAll<{ key: string; value: unknown }>(db, "prefs"),
        getAll<StoredBackground>(db, "backgrounds"),
        getAll<StoredBibleTranslation>(db, "bibleTranslations"),
        getAll<{ songId: string; patch: Partial<Song> }>(db, "songMetaOverrides"),
      ]);
      const songOverrides = Object.fromEntries(overrideRows.map((r) => [r.songId, r.sections]));
      const songMetaOverrides = Object.fromEntries(songMetaOverrideRows.map((r) => [r.songId, r.patch]));
      const prefs = Object.fromEntries(prefRows.map((r) => [r.key, r.value])) as PersistedPrefs;
      const customBackgrounds = backgroundRows.map((row) => ({
        id: row.id,
        name: row.name,
        mediaType: row.mediaType,
        url: URL.createObjectURL(new Blob([row.data], { type: row.mimeType })),
      }));
      const downloadedBibleTranslations = bibleTranslationRows.map((row) => ({
        code: row.code,
        language: row.language,
        name: row.name,
        license: row.license,
        link: row.link,
        downloadedAt: row.downloadedAt,
        sizeBytes: row.sizeBytes,
      }));
      return { customSongs, lineups, customBackgrounds, downloadedBibleTranslations, songOverrides, songMetaOverrides, prefs };
    },

    async upsertSong(song: Song) {
      const db = await dbPromise;
      await put(db, "songs", song);
    },

    async deleteSong(id: string) {
      const db = await dbPromise;
      await del(db, "songs", id);
    },

    async upsertLineup(lineup: Lineup) {
      const db = await dbPromise;
      await put(db, "lineups", lineup);
    },

    async deleteLineup(id: string) {
      const db = await dbPromise;
      await del(db, "lineups", id);
    },

    async setSongOverride(songId: string, sections: Section[]) {
      const db = await dbPromise;
      await put(db, "songOverrides", { songId, sections });
    },

    async setPrefs(patch: PersistedPrefs) {
      const db = await dbPromise;
      const tx = db.transaction("prefs", "readwrite");
      const store = tx.objectStore("prefs");
      for (const [key, value] of Object.entries(patch)) {
        store.put({ key, value });
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },

    async addBackground(input: NewBackgroundInput) {
      const db = await dbPromise;
      const record: StoredBackground = {
        id: input.id, name: input.name, mediaType: input.mediaType, mimeType: input.mimeType, data: input.data,
      };
      await put(db, "backgrounds", record);
    },

    async deleteBackground(id: string) {
      const db = await dbPromise;
      await del(db, "backgrounds", id);
    },

    async addBibleTranslation(input: NewBibleTranslationInput) {
      const db = await dbPromise;
      // Parse once at import time rather than storing raw bytes.
      const text = new TextDecoder().decode(input.data);
      const parsedData = input.format === "xml" ? (parseBibleXml(text) as BibleTranslation) : (JSON.parse(text) as BibleTranslation);
      const record: StoredBibleTranslation = {
        code: input.code, language: input.language, name: input.name, license: input.license, link: input.link,
        parsedData, downloadedAt: Date.now(), sizeBytes: input.data.byteLength,
      };
      await put(db, "bibleTranslations", record);
    },

    async deleteBibleTranslation(code: string) {
      const db = await dbPromise;
      await del(db, "bibleTranslations", code);
    },

    async getBibleTranslationData(code: string): Promise<BibleTranslation | null> {
      const db = await dbPromise;
      const row = await getOne<StoredBibleTranslation>(db, "bibleTranslations", code);
      if (!row) return null;
      if (row.parsedData) return row.parsedData;
      // Legacy row: parse the raw bytes since parsedData wasn't stored yet.
      const text = new TextDecoder().decode(row.data as ArrayBuffer);
      return row.format === "xml" ? (parseBibleXml(text) as BibleTranslation) : (JSON.parse(text) as BibleTranslation);
    },

    async setSongMetaOverride(songId: string, patch: Partial<Song>) {
      const db = await dbPromise;
      await put(db, "songMetaOverrides", { songId, patch });
    },
  };
}
