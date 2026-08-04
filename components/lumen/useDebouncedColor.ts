"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DEBOUNCE_MS = 250;

// Native <input type="color"> fires onChange continuously while dragging —
// this keeps the swatch responsive instantly while debouncing the actual
// commit (a state patch, and therefore persistence + a slide re-render) so
// dragging across the picker doesn't spam updates. Extracted from
// MainPanel's original inline text-color logic; reused for the outline
// color picker too.
export function useDebouncedColor(value: string, onCommit: (value: string) => void, debounceMs = DEFAULT_DEBOUNCE_MS) {
  const [draft, setDraft] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resets the local draft whenever the external committed value changes
  // (e.g. a "Reset" button elsewhere sets lyricStyle.color directly) — the
  // same "sync local UI state to a changed prop" shape already accepted at
  // this codebase's other liveSelection-reset effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value);
  }, [value]);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const onChange = (next: string) => {
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(next), debounceMs);
  };

  return [draft, onChange] as const;
}
