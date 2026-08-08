import type { Section } from "../data";

export type ParsedSong = {
  title: string;
  artist: string;
  key: string;
  bpm: string;
  cat: string;
  tags: string[];
  ccli?: string;
  sections: Section[];
};

const SECTION_LABEL_WORDS = [
  "Verse", "Chorus", "Pre-Chorus", "Bridge", "Intro", "Outro", "Tag", "Interlude", "Refrain", "Ending",
  // Spanish equivalents.
  "Verso", "Coro", "Puente",
];
const SECTION_LABEL_PATTERN = new RegExp(
  "^(" + SECTION_LABEL_WORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\s*(\\d+)?$",
  "i"
);

function normalizeSectionLabel(word: string, number?: string): string {
  const canonical = SECTION_LABEL_WORDS.find((candidate) => candidate.toLowerCase() === word.toLowerCase()) || word;
  return number ? canonical + " " + number : canonical;
}

// A recognized label starts a new section; a blank line starts a new slide within it.
export function parseLyricsBlock(rawText: string): Section[] {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const sections: Section[] = [];
  let label: string | null = null;
  let autoVerseCount = 0;
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    if (label === null) {
      autoVerseCount += 1;
      sections.push({ label: "Verse " + autoVerseCount, lines: current });
    } else {
      sections.push({ label, lines: current });
    }
    current = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(SECTION_LABEL_PATTERN);
    if (match) {
      flush();
      label = normalizeSectionLabel(match[1], match[2]);
      continue;
    }
    if (line === "") {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();

  return sections.length ? sections : [{ label: "Verse 1", lines: [""] }];
}

// Reverse of parseLyricsBlock, for pre-filling the textarea from an existing Song's sections.
export function sectionsToText(sections: Section[]): string {
  const blocks: string[] = [];
  let index = 0;
  while (index < sections.length) {
    const label = sections[index].label;
    const slides: string[] = [];
    while (index < sections.length && sections[index].label === label) {
      slides.push(sections[index].lines.join("\n"));
      index += 1;
    }
    blocks.push(label + "\n" + slides.join("\n\n"));
  }
  return blocks.join("\n\n");
}

export type SongMetadataHeader = {
  title: string;
  artist: string;
  key: string;
  bpm: string;
  cat: string;
  tags: string[];
  ccli: string;
  body: string;
};

// Extracts leading "Key: value" lines and returns the rest as raw body text.
export function extractMetadataHeader(raw: string): SongMetadataHeader {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const meta: Record<string, string> = {};
  let bodyStart = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") { bodyStart += 1; continue; }
    const match = line.match(/^([A-Za-z ]+):\s*(.*)$/);
    if (!match) break;
    meta[match[1].trim().toLowerCase()] = match[2].trim();
    bodyStart += 1;
  }
  return {
    title: meta.title || "",
    artist: meta.artist || "",
    key: meta.key || "",
    bpm: meta.bpm || "",
    cat: meta.category || meta.cat || "",
    tags: meta.tags ? meta.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    ccli: meta.ccli || "",
    body: lines.slice(bodyStart).join("\n"),
  };
}
