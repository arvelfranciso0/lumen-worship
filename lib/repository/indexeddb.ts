import type { Lineup, Section, Song } from "@/components/lumen/data";
import type { AppRepository, NewBackgroundInput, PersistedData, PersistedPrefs } from "./types";

const DB_NAME = "lumen";
const DB_VERSION = 2;
const STORES = ["songs", "lineups", "songOverrides", "prefs", "backgrounds"] as const;

type StoredBackground = {
  id: string;
  name: string;
  mediaType: "image" | "video";
  mimeType: string;
  data: ArrayBuffer;
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
      const [customSongs, lineups, overrideRows, prefRows, backgroundRows] = await Promise.all([
        getAll<Song>(db, "songs"),
        getAll<Lineup>(db, "lineups"),
        getAll<{ songId: string; sections: Section[] }>(db, "songOverrides"),
        getAll<{ key: string; value: unknown }>(db, "prefs"),
        getAll<StoredBackground>(db, "backgrounds"),
      ]);
      const songOverrides = Object.fromEntries(overrideRows.map((r) => [r.songId, r.sections]));
      const prefs = Object.fromEntries(prefRows.map((r) => [r.key, r.value])) as PersistedPrefs;
      const customBackgrounds = backgroundRows.map((row) => ({
        id: row.id,
        name: row.name,
        mediaType: row.mediaType,
        url: URL.createObjectURL(new Blob([row.data], { type: row.mimeType })),
      }));
      return { customSongs, lineups, customBackgrounds, songOverrides, prefs };
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
  };
}
