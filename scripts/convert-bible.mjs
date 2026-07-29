// Converts the Bible XML files in public/bible/*.xml into per-translation
// JSON files under public/bible/json/, plus a manifest.json listing them all.
//
// Run manually with: node scripts/convert-bible.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "..", "public", "bible");
const OUTPUT_DIR = path.join(SOURCE_DIR, "json");

// Standard 66-book Protestant canon. The XML files only number books 1-66;
// they never store the book's name, so this table is the only source of truth.
export const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
  "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
  "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

const OLD_TESTAMENT_BOOK_COUNT = 39;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(amp|lt|gt|quot|apos|#(\d+));/g, (_, name, code) =>
    code ? String.fromCharCode(Number(code)) : ENTITIES[name]
  );
}

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

function parseBibleXml(xml, fileName) {
  const rootTag = xml.match(/<bible\b[^>]*>/)?.[0] || "<bible>";
  const attrs = parseAttrs(rootTag);
  const code = fileName.replace(/Bible\.xml$/, "");
  const language = fileName.startsWith("Cebuano") ? "Cebuano" : "English";

  const meta = {
    code,
    language,
    name: attrs.translation || attrs.name || attrs.title || attrs.language || code,
    license: attrs.status || attrs.info || "Unknown",
    link: attrs.link || null,
  };

  const books = [];
  for (const bookMatch of xml.matchAll(/<book\s+number="(\d+)"[^>]*>([\s\S]*?)<\/book>/g)) {
    const number = Number(bookMatch[1]);
    const bookBody = bookMatch[2];
    const chapters = [];

    for (const chapterMatch of bookBody.matchAll(/<chapter\s+number="(\d+)"[^>]*>([\s\S]*?)<\/chapter>/g)) {
      const chapterNumber = Number(chapterMatch[1]);
      const chapterBody = chapterMatch[2];
      const verses = [];

      for (const verseMatch of chapterBody.matchAll(/<verse\s+number="(\d+)"[^>]*>([\s\S]*?)<\/verse>/g)) {
        verses.push({
          number: Number(verseMatch[1]),
          text: decodeEntities(verseMatch[2]).trim(),
        });
      }

      chapters.push({ number: chapterNumber, verses });
    }

    books.push({
      number,
      name: BOOKS[number - 1] || "Unknown " + number,
      testament: number <= OLD_TESTAMENT_BOOK_COUNT ? "Old" : "New",
      chapters,
    });
  }

  return { meta, books };
}

export function convertFile(fileName) {
  const xml = fs.readFileSync(path.join(SOURCE_DIR, fileName), "utf-8");
  return parseBibleXml(xml, fileName);
}

function readExistingManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    console.warn("Could not parse existing manifest.json, starting fresh.");
    return [];
  }
}

export function convertAll() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".xml"));

  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  const manifestByCode = new Map(readExistingManifest(manifestPath).map((m) => [m.code, m]));

  for (const fileName of files) {
    const { meta, books } = convertFile(fileName);
    fs.writeFileSync(path.join(OUTPUT_DIR, meta.code + ".json"), JSON.stringify({ meta, books }));
    manifestByCode.set(meta.code, { ...meta, path: "json/" + meta.code + ".json" });
    console.log("Converted " + fileName + " -> " + meta.code + ".json (" + books.length + " books)");
  }

  const manifest = [...manifestByCode.values()];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Wrote manifest.json (" + manifest.length + " translations)");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  convertAll();
}
