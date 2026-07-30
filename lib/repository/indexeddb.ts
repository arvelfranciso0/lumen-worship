import type { BibleTranslation, Lineup, Section, Song } from "@/components/lumen/data";
import type { AppRepository, NewBackgroundInput, NewBibleTranslationInput, PersistedData, PersistedPrefs } from "./types";

const DB_NAME = "lumen";
const DB_VERSION = 3;
const STORES = ["songs", "lineups", "songOverrides", "prefs", "backgrounds", "bibleTranslations"] as const;

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
  data: ArrayBuffer;
  downloadedAt: number;
  sizeBytes: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("songs")) db.createObjectStore("songs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("lineups")) db.createObjectStore("lineups", { keyPath: "id" });
      if (!db.objectStoreNames.contains("songOverrides")) db.createObjectStore("songOverrides", { keyPath: "songId" });
      if (!db.objectStoreNames.contains("prefs")) db.createObjectStore("prefs", { keyPath: "key" });
      if (!db.objectStoreNames.contains("backgrounds")) db.createObjectStore("backgrounds", { keyPath: "id" });
      if (!db.objectStoreNames.contains("bibleTranslations")) db.createObjectStore("bibleTranslations", { keyPath: "code" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll<T>(db: IDBDatabase, store: (typeof STORES)[number]): Promise<T[]> {
  const tx = db.transaction(store, "readonly");
  return reqToPromise(tx.objectStore(store).getAll());
}

function getOne<T>(db: IDBDatabase, store: (typeof STORES)[number], key: string): Promise<T | undefined> {
  const tx = db.transaction(store, "readonly");
  return reqToPromise(tx.objectStore(store).get(key));
}

function put(db: IDBDatabase, store: (typeof STORES)[number], value: unknown): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(value);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function del(db: IDBDatabase, store: (typeof STORES)[number], key: string): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function createIndexedDbRepository(): AppRepository {
  const dbPromise = openDb();

  return {
    async loadAll(): Promise<PersistedData> {
      const db = await dbPromise;
      const [customSongs, lineups, overrideRows, prefRows, backgroundRows, bibleTranslationRows] = await Promise.all([
        getAll<Song>(db, "songs"),
        getAll<Lineup>(db, "lineups"),
        getAll<{ songId: string; sections: Section[] }>(db, "songOverrides"),
        getAll<{ key: string; value: unknown }>(db, "prefs"),
        getAll<StoredBackground>(db, "backgrounds"),
        getAll<StoredBibleTranslation>(db, "bibleTranslations"),
      ]);
      const songOverrides = Object.fromEntries(overrideRows.map((r) => [r.songId, r.sections]));
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
      return { customSongs, lineups, customBackgrounds, downloadedBibleTranslations, songOverrides, prefs };
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
      await Promise.all(
        Object.entries(patch).map(([key, value]) => put(db, "prefs", { key, value }))
      );
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
      const record: StoredBibleTranslation = {
        code: input.code, language: input.language, name: input.name, license: input.license, link: input.link,
        data: input.data, downloadedAt: Date.now(), sizeBytes: input.data.byteLength,
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
      return JSON.parse(new TextDecoder().decode(row.data)) as BibleTranslation;
    },
  };
}
