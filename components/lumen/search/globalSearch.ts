import type { BibleBook, Lineup, LookOption, Song } from "../data";

export type SearchResult = {
  kind: "song" | "bible-book" | "lineup" | "background" | "slide-note";
  id: string;
  title: string;
  subtitle?: string;
};

export type SearchIndex = {
  songs: Song[];
  bibleBooks: BibleBook[];
  lineups: Lineup[];
  looks: LookOption[];
};

const MAX_RESULTS_PER_KIND = 5;

// Searches songs, Bible books, lineups, and looks for a matching query.
export function searchAll(query: string, index: SearchIndex): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];

  for (const song of index.songs) {
    const firstLine = song.sections[0]?.lines[0] || "";
    const haystack = [song.title, song.artist, song.tags.join(" "), song.ccli || "", firstLine].join(" ").toLowerCase();
    if (haystack.includes(q)) {
      results.push({ kind: "song", id: song.id, title: song.title, subtitle: song.artist });
    }
    for (const section of song.sections) {
      if (section.note && section.note.toLowerCase().includes(q)) {
        results.push({ kind: "slide-note", id: song.id + "|" + section.label, title: section.note, subtitle: song.title + " — " + section.label });
      }
    }
  }

  for (const book of index.bibleBooks) {
    if (book.name.toLowerCase().includes(q)) {
      results.push({ kind: "bible-book", id: book.name, title: book.name, subtitle: book.testament + " Testament" });
    }
  }

  for (const lineup of index.lineups) {
    if (lineup.name.toLowerCase().includes(q)) {
      results.push({ kind: "lineup", id: lineup.id, title: lineup.name, subtitle: lineup.songIds.length + " songs" });
    }
  }

  for (const look of index.looks) {
    if (look.name.toLowerCase().includes(q)) {
      results.push({ kind: "background", id: look.id, title: look.name });
    }
  }

  const byKind = new Map<string, number>();
  return results.filter((result) => {
    const count = byKind.get(result.kind) || 0;
    if (count >= MAX_RESULTS_PER_KIND) return false;
    byKind.set(result.kind, count + 1);
    return true;
  });
}
