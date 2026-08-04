import type { Section } from "./data";

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
  // Spanish equivalents — the existing "Noche De Paz" sample song uses "Verso 1"/"Verso 2".
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

// A recognized label on its own line (e.g. "Verse 1", "Chorus") starts a new section — every
// line after it belongs to that section until the next label line. A blank line always starts
// a new slide: within the current label if one has been declared, or auto-numbered "Verse N"
// if no label has appeared yet (matches how multi-slide sections are already modeled in the
// sample data — several Section entries sharing one label).
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

// Reverse of parseLyricsBlock, for pre-filling the textarea from an existing Song's sections —
// round-trip safe: consecutive slides sharing a label are re-joined under one label line,
// separated by blank lines, so re-parsing the result reproduces the same Section[].
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

// Only used by the file-upload convenience feature — extracts leading "Key: value" lines and
// returns the rest of the file as raw, unparsed body text for the textarea; parseLyricsBlock
// runs on it later, at save time, the same as manually-typed text.
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
