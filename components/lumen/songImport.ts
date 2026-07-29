import type { Section } from "./data";

export type ParsedSong = {
  title: string;
  artist: string;
  key: string;
  bpm: string;
  cat: string;
  tags: string[];
  sections: Section[];
};

// Leading "Key: value" lines set metadata; "[Section]" lines start a section;
// a blank line inside a section starts a new slide under the same label.
export function parseSongText(raw: string): ParsedSong {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const meta: Record<string, string> = {};
  const sections: Section[] = [];

  let label = "Verse 1";
  let current: string[] = [];
  let inBody = false;

  const flush = () => {
    if (current.length) sections.push({ label, lines: current });
    current = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      inBody = true;
      flush();
      label = sectionMatch[1].trim();
      continue;
    }
    if (!inBody) {
      const metaMatch = line.match(/^([A-Za-z ]+):\s*(.*)$/);
      if (metaMatch) {
        meta[metaMatch[1].trim().toLowerCase()] = metaMatch[2].trim();
        continue;
      }
    }
    if (line === "") {
      if (inBody) flush();
      continue;
    }
    inBody = true;
    current.push(line);
  }
  flush();

  return {
    title: meta.title || "Untitled Song",
    artist: meta.artist || "",
    key: meta.key || "",
    bpm: meta.bpm || "",
    cat: meta.category || meta.cat || "Contemporary",
    tags: meta.tags ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    sections: sections.length ? sections : [{ label: "Verse 1", lines: [""] }],
  };
}
