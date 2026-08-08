// SQLite schema definition and migrations.

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

// Adds columns to existing tables that predate them.
function migrateSchema(db) {
  for (const statement of [
    "ALTER TABLE bible_translations ADD COLUMN language TEXT DEFAULT ''",
    "ALTER TABLE bible_translations ADD COLUMN license TEXT DEFAULT ''",
    "ALTER TABLE bible_translations ADD COLUMN link TEXT",
    // Backfills existing rows to the 'json' format default.
    "ALTER TABLE bible_translations ADD COLUMN format TEXT DEFAULT 'json'",
    "ALTER TABLE songs ADD COLUMN ccli TEXT DEFAULT ''",
  ]) {
    try { db.exec(statement); } catch { /* column already exists */ }
  }
}

module.exports = { SCHEMA, migrateSchema };
