// Transposes a key name by a number of semitones, normalizing to sharps unless the original key used a flat.
const SHARP_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_SCALE = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

export function transposeKey(key: string, semitones: number): string {
  if (!semitones) return key;
  const trimmed = key.trim();
  const match = trimmed.match(/^([A-Ga-g])([#♯b♭]?)(.*)$/);
  if (!match) return key;
  const [, letter, accidental, rest] = match;
  const noteName = letter.toUpperCase() + (accidental === "♯" ? "#" : accidental === "♭" ? "b" : accidental);
  const index = NOTE_TO_INDEX[noteName];
  if (index === undefined) return key;
  const useFlats = accidental === "b" || accidental === "♭";
  const nextIndex = ((index + semitones) % 12 + 12) % 12;
  const scale = useFlats ? FLAT_SCALE : SHARP_SCALE;
  return scale[nextIndex] + rest;
}
