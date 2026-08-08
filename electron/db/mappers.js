// Row-to-domain-object mappers for SQLite query results.

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
  // Builds the lumen-media URL with the filename in the path, not the host.
  return { id: row.id, name: row.name, mediaType: row.media_type, url: "lumen-media://local/" + encodeURIComponent(row.file_name) };
}

function rowToDownloadedBibleTranslation(row) {
  return {
    code: row.code, language: row.language, name: row.name, license: row.license, link: row.link,
    downloadedAt: row.downloaded_at, sizeBytes: row.size_bytes,
  };
}

module.exports = { rowToSong, rowToLineup, rowToBackground, rowToDownloadedBibleTranslation };
