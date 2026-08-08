// SQLite persistence for the Electron main process.

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { parseBibleXml } = require("../bibleXml.js");
const { SCHEMA, migrateSchema } = require("./schema.js");
const { rowToSong, rowToLineup, rowToBackground, rowToDownloadedBibleTranslation } = require("./mappers.js");
const { resolveWithinDir, sanitizeFileNameSegment } = require("../fsSecurity.js");

function createDb(dbPath) {
  const db = new DatabaseSync(dbPath);
  // Enables WAL mode for cheaper commits on frequent writes.
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
      // Wraps all key writes in a single transaction.
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

    // Writes the uploaded media file asynchronously.
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

    // Writes the translation file asynchronously.
    async addBibleTranslation({ code, language, name, license, link, data, format }) {
      // Restricts format to "xml" or "json", defaulting to "json".
      const safeFormat = format === "xml" ? "xml" : "json";
      // Parses XML once at import time and stores it as JSON.
      const bytesToStore = safeFormat === "xml"
        ? Buffer.from(JSON.stringify(parseBibleXml(Buffer.from(data).toString("utf-8"))))
        : Buffer.from(data);
      const storedFormat = safeFormat === "xml" ? "json" : safeFormat;
      const fileName = sanitizeFileNameSegment(code) + "." + storedFormat;
      const filePath = resolveWithinDir(bibleTranslationsDir, fileName);
      // Throws if the resolved path escapes bibleTranslationsDir.
      if (!filePath) throw new Error("resolved path escapes its containing directory: " + fileName);
      // Removes the old file if re-importing changes its extension.
      const previousRow = db.prepare("SELECT file_name FROM bible_translations WHERE code = ?").get(code);
      await fs.promises.writeFile(filePath, bytesToStore);
      if (previousRow && previousRow.file_name !== fileName) {
        try { fs.unlinkSync(path.join(bibleTranslationsDir, previousRow.file_name)); } catch { /* already gone */ }
      }
      db.prepare(
        `INSERT INTO bible_translations (code, language, name, license, link, file_name, downloaded_at, size_bytes, format)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET
           language=excluded.language, name=excluded.name, license=excluded.license, link=excluded.link,
           file_name=excluded.file_name, downloaded_at=excluded.downloaded_at, size_bytes=excluded.size_bytes,
           format=excluded.format`
      ).run(code, language, name, license, link, fileName, Date.now(), data.byteLength, storedFormat);
    },

    deleteBibleTranslation(code) {
      const row = db.prepare("SELECT file_name FROM bible_translations WHERE code = ?").get(code);
      if (row) {
        try { fs.unlinkSync(path.join(bibleTranslationsDir, row.file_name)); } catch { /* already gone */ }
      }
      db.prepare("DELETE FROM bible_translations WHERE code = ?").run(code);
    },

    // Returns the raw translation file text and format, unparsed.
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
