// SQLite persistence for the Electron main process, backed by Node's
// built-in node:sqlite module (no native module / rebuild step needed).

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
`;

function rowToSong(row) {
  return {
    id: row.id, title: row.title, artist: row.artist, key: row.song_key, bpm: row.bpm,
    cat: row.cat, tags: JSON.parse(row.tags || "[]"), fav: !!row.fav, when: row.when_used,
    sections: JSON.parse(row.sections || "[]"),
  };
}

function rowToLineup(row) {
  return { id: row.id, name: row.name, songIds: JSON.parse(row.song_ids || "[]") };
}

function createDb(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);

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
      return { customSongs, lineups, songOverrides, prefs };
    },

    upsertSong(song) {
      db.prepare(
        `INSERT INTO songs (id, title, artist, song_key, bpm, cat, tags, fav, when_used, sections)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title=excluded.title, artist=excluded.artist, song_key=excluded.song_key, bpm=excluded.bpm,
           cat=excluded.cat, tags=excluded.tags, fav=excluded.fav, when_used=excluded.when_used, sections=excluded.sections`
      ).run(
        song.id, song.title, song.artist, song.key, song.bpm,
        song.cat, JSON.stringify(song.tags), song.fav ? 1 : 0, song.when, JSON.stringify(song.sections)
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
      for (const [key, value] of Object.entries(patch)) {
        stmt.run(key, JSON.stringify(value));
      }
    },

    close() {
      db.close();
    },
  };
}

module.exports = { createDb };
