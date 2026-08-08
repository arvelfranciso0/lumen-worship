export const DB_NAME = "lumen";
export const DB_VERSION = 4;
export const STORES = [
  "songs", "lineups", "songOverrides", "prefs", "backgrounds", "bibleTranslations",
  "songMetaOverrides",
] as const;

export function openDb(): Promise<IDBDatabase> {
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
      if (!db.objectStoreNames.contains("songMetaOverrides")) db.createObjectStore("songMetaOverrides", { keyPath: "songId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getAll<T>(db: IDBDatabase, store: (typeof STORES)[number]): Promise<T[]> {
  const tx = db.transaction(store, "readonly");
  return reqToPromise(tx.objectStore(store).getAll());
}

export function getOne<T>(db: IDBDatabase, store: (typeof STORES)[number], key: string): Promise<T | undefined> {
  const tx = db.transaction(store, "readonly");
  return reqToPromise(tx.objectStore(store).get(key));
}

export function put(db: IDBDatabase, store: (typeof STORES)[number], value: unknown): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(value);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function del(db: IDBDatabase, store: (typeof STORES)[number], key: string): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
