"use client";

import { cx } from "./cx";
import type { UseLumen } from "./useLumen";

// Recording happens in useLumen.ts (a useEffect watching book/chapter/idx
// while in bible mode) — this component is purely a reader of
// state.bibleHistory, newest first.
export function BibleHistoryPanel({ lumen }: { lumen: UseLumen }) {
  const { state, patch } = lumen;
  const history = state.bibleHistory;

  if (history.length === 0) {
    return <div className="text-[12px] text-faint p-[10px_6px]">No passages viewed yet.</div>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {history.map((entry) => (
        <button
          key={entry.key}
          onClick={() => {
            const [, book, chapter] = entry.key.split("|");
            patch({ book, chapter: Number(chapter), idx: 0, black: false, blank: false, bibleSubTab: "browse" });
          }}
          className={cx(
            "text-left p-[8px_9px] rounded-2.25 cursor-pointer border border-border bg-panel2"
          )}
        >
          <div className="text-[11px] font-mono text-accent">{entry.label}</div>
        </button>
      ))}
      <button
        onClick={() => patch({ bibleHistory: [] })}
        className="self-start border-none bg-transparent text-faint text-[11px] cursor-pointer mt-1 p-0"
      >
        Clear history
      </button>
    </div>
  );
}
