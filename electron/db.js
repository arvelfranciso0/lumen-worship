// SQLite persistence for the Electron main process, backed by Node's
// built-in node:sqlite module (no native module / rebuild step needed).

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY, title TEXT, artist TEXT, song_key TEXT, bpm TEXT,
    cat TEXT, tags TEXT, fav INTEGER, when_used TEXT, sections TEXT
  );
  CREATE TABLE IF NOT EXISTS lineups (
    id TEXT PRIMARY KEY, name TEXT, song_ids TEXT
  );
  CREATE TABLE IF NOT EXISTS song_overrides (
    song_id TEXT PRIMARY KEY, sections TEXT
  );
  CREATE TABLE IF NOT EXISTS prefs (
    key TEXT PRIMARY KEY, value TEXT
  );
  CREATE TABLE IF NOT EXISTS backgrounds (
    id TEXT PRIMARY KEY, name TEXT, media_type TEXT, mime_type TEXT, file_name TEXT
  );
  CREATE TABLE IF NOT EXISTS bible_translations (
    code TEXT PRIMARY KEY, language TEXT, name TEXT, license TEXT, link TEXT,
    file_name TEXT, downloaded_at INTEGER, size_bytes INTEGER, format TEXT DEFAULT 'json'
  );
  CREATE TABLE IF NOT EXISTS song_meta_overrides (
    song_id TEXT PRIMARY KEY, patch TEXT
  );
`;

// Guards a schema change made after bible_translations may have already
// shipped once (an earlier build) — CREATE TABLE IF NOT EXISTS is a no-op
// against an already-created table, so a fresh column needs an explicit
// ALTER TABLE. Each is wrapped since SQLite errors on adding a column that
// already exists.
function migrateSchema(db) {
  for (const statement of [
    "ALTER TABLE bible_translations ADD COLUMN language TEXT DEFAULT ''",
    "ALTER TABLE bible_translations ADD COLUMN license TEXT DEFAULT ''",
    "ALTER TABLE bible_translations ADD COLUMN link TEXT",
    // Existing rows all predate XML support and are backfilled to 'json' by
    // SQLite itself (a DEFAULT-bearing ADD COLUMN populates existing rows,
    // not just new ones) — so getBibleTranslationData never needs a
    // NULL-means-json fallback anywhere in the read path.
    "ALTER TABLE bible_translations ADD COLUMN format TEXT DEFAULT 'json'",
    "ALTER TABLE songs ADD COLUMN ccli TEXT DEFAULT ''",
  ]) {
    try { db.exec(statement); } catch { /* column already exists */ }
  }
}

function rowToSong(row) {
  return {
    id: row.id, title: row.title, artist: row.artist, key: row.song_key, bpm: row.bpm,
    cat: row.cat, tags: JSON.parse(row.tags || "[]"), fav: !!row.fav, when: row.when_used,
    sections: JSON.parse(row.sections || "[]"), ccli: row.ccli || "",
  };
}

function rowToLineup(row) {
  return { id: row.id, name: row.name, songIds: JSON.parse(row.song_ids || "[]") };
}

function rowToBackground(row) {
  // The filename goes in the URL's path, not its host — "lumen-media" is a
  // standard: true scheme, so a host-position filename gets reshaped by
  // Chromium's URL parser (host normalization, a mandatory trailing "/"
  // when there's no path), and the protocol handler's request.url no
  // longer matches what was built here, silently failing to resolve.
  return { id: row.id, name: row.name, mediaType: row.media_type, url: "lumen-media://local/" + encodeURIComponent(row.file_name) };
}

function rowToDownloadedBibleTranslation(row) {
  return {
    code: row.code, language: row.language, name: row.name, license: row.license, link: row.link,
    downloadedAt: row.downloaded_at, sizeBytes: row.size_bytes,
  };
}

function createDb(dbPath) {
  const db = new DatabaseSync(dbPath);
  // WAL mode replaces per-statement fsync-backed rollback-journal commits
  // with a much cheaper append-to-log commit (fsync only on checkpoint), so
  // the many individual auto-committed writes below (one per prefs key,
  // one per song/lineup/etc. upsert) no longer each block the main process
  // — and therefore output-window IPC — for a full disk fsync.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);
  migrateSchema(db);
  const backgroundsDir = path.join(path.dirname(dbPath), "backgrounds");
  fs.mkdirSync(backgroundsDir, { recursive: true });
  const bibleTranslationsDir = path.join(path.dirname(dbPath), "bibleTranslations");
  fs.mkdirSync(bibleTranslationsDir, { recursive: true });

  return {
    loadAll() {
      const customSongs = db.prepare("SELECT * FROM songs").all().map(rowToSong);
      const lineups = db.prepare("SELECT * FROM lineups").all().map(rowToLineup);
      const overrideRows = db.prepare("SELECT * FROM song_overrides").all();
      const songOverrides = Object.fromEntries(
        overrideRows.map((r) => [r.song_id, JSON.parse(r.sections)])
      );
      const prefRows = db.prepare("SELECT * FROM prefs").all();
      const prefs = Object.fromEntries(prefRows.map((r) => [r.key, JSON.parse(r.value)]));
      const customBackgrounds = db.prepare("SELECT * FROM backgrounds").all().map(rowToBackground);
      const downloadedBibleTranslations = db.prepare("SELECT * FROM bible_translations").all().map(rowToDownloadedBibleTranslation);
      const songMetaOverrideRows = db.prepare("SELECT * FROM song_meta_overrides").all();
      const songMetaOverrides = Object.fromEntries(
        songMetaOverrideRows.map((r) => [r.song_id, JSON.parse(r.patch)])
      );
      return { customSongs, lineups, customBackgrounds, downloadedBibleTranslations, songOverrides, songMetaOverrides, prefs };
    },

    upsertSong(song) {
      db.prepare(
        `INSERT INTO songs (id, title, artist, song_key, bpm, cat, tags, fav, when_used, sections, ccli)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title=excluded.title, artist=excluded.artist, song_key=excluded.song_key, bpm=excluded.bpm,
           cat=excluded.cat, tags=excluded.tags, fav=excluded.fav, when_used=excluded.when_used, sections=excluded.sections,
           ccli=excluded.ccli`
      ).run(
        song.id, song.title, song.artist, song.key, song.bpm,
        song.cat, JSON.stringify(song.tags), song.fav ? 1 : 0, song.when, JSON.stringify(song.sections), song.ccli || ""
      );
    },

    deleteSong(id) {
      db.prepare("DELETE FROM songs WHERE id = ?").run(id);
    },

    upsertLineup(lineup) {
      db.prepare(
        `INSERT INTO lineups (id, name, song_ids) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, song_ids=excluded.song_ids`
      ).run(lineup.id, lineup.name, JSON.stringify(lineup.songIds));
    },

    deleteLineup(id) {
      db.prepare("DELETE FROM lineups WHERE id = ?").run(id);
    },

    setSongOverride(songId, sections) {
      db.prepare(
        `INSERT INTO song_overrides (song_id, sections) VALUES (?, ?)
         ON CONFLICT(song_id) DO UPDATE SET sections=excluded.sections`
      ).run(songId, JSON.stringify(sections));
    },

    setPrefs(patch) {
      const stmt = db.prepare(
        `INSERT INTO prefs (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`
      );
      // One commit/fsync for the whole debounced flush instead of one per
      // key — setPrefs writes ~20 keys at a time, and without an explicit
      // transaction each stmt.run() is its own implicit commit.
      db.exec("BEGIN");
      try {
        for (const [key, value] of Object.entries(patch)) {
          stmt.run(key, JSON.stringify(value));
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },

    // async: writes the uploaded media with fs.promises rather than
    // writeFileSync, so a large background file doesn't block the main
    // process's event loop (and with it every IPC channel, including the
    // output window) for the duration of the write.
    async addBackground({ id, name, mediaType, mimeType, data }) {
      const extension = mimeType.split("/")[1] || "bin";
      const fileName = id + "." + extension;
      await fs.promises.writeFile(path.join(backgroundsDir, fileName), Buffer.from(data));
      db.prepare(
        `INSERT INTO backgrounds (id, name, media_type, mime_type, file_name) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, media_type=excluded.media_type, mime_type=excluded.mime_type, file_name=excluded.file_name`
      ).run(id, name, mediaType, mimeType, fileName);
    },

    deleteBackground(id) {
      const row = db.prepare("SELECT file_name FROM backgrounds WHERE id = ?").get(id);
      if (row) {
        try { fs.unlinkSync(path.join(backgroundsDir, row.file_name)); } catch { /* already gone */ }
      }
      db.prepare("DELETE FROM backgrounds WHERE id = ?").run(id);
    },

    // async: same reasoning as addBackground — a downloaded translation can
    // be several MB, and writeFileSync would stall the main process for the
    // whole write.
    async addBibleTranslation({ code, language, name, license, link, data, format }) {
      const fileName = code + "." + format;
      await fs.promises.writeFile(path.join(bibleTranslationsDir, fileName), Buffer.from(data));
      db.prepare(
        `INSERT INTO bible_translations (code, language, name, license, link, file_name, downloaded_at, size_bytes, format)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET
           language=excluded.language, name=excluded.name, license=excluded.license, link=excluded.link,
           file_name=excluded.file_name, downloaded_at=excluded.downloaded_at, size_bytes=excluded.size_bytes,
           format=excluded.format`
      ).run(code, language, name, license, link, fileName, Date.now(), data.byteLength, format);
    },

    deleteBibleTranslation(code) {
      const row = db.prepare("SELECT file_name FROM bible_translations WHERE code = ?").get(code);
      if (row) {
        try { fs.unlinkSync(path.join(bibleTranslationsDir, row.file_name)); } catch { /* already gone */ }
      }
      db.prepare("DELETE FROM bible_translations WHERE code = ?").run(code);
    },

    // Returns the raw file text + its format, unparsed — parsing a
    // multi-MB translation is real CPU work, and doing it here (the main
    // process) would block IPC for every window, including the
    // second-monitor audience output. preload.js's getBibleTranslationData
    // does the actual JSON.parse/parseBibleXml instead, in the renderer's
    // own isolated context.
    async getBibleTranslationData(code) {
      const row = db.prepare("SELECT file_name, format FROM bible_translations WHERE code = ?").get(code);
      if (!row) return null;
      try {
        const text = await fs.promises.readFile(path.join(bibleTranslationsDir, row.file_name), "utf-8");
        return { text, format: row.format };
      } catch {
        return null;
      }
    },

    setSongMetaOverride(songId, patch) {
      db.prepare(
        `INSERT INTO song_meta_overrides (song_id, patch) VALUES (?, ?)
         ON CONFLICT(song_id) DO UPDATE SET patch=excluded.patch`
      ).run(songId, JSON.stringify(patch));
    },

    close() {
      db.close();
    },
  };
}

module.exports = { createDb };
