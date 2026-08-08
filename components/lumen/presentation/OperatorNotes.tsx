"use client";

import { cx } from "../cx";

// Collapsible free-text notes for the operator (service reminders, cues, announcements).
export function OperatorNotes({
  open, notes, onToggleOpen, onChangeNotes,
}: {
  open: boolean; notes: string; onToggleOpen: () => void; onChangeNotes: (value: string) => void;
}) {
  return (
    <div className="flex-none">
      <button
        onClick={onToggleOpen}
        className="flex items-center gap-1.25 w-full bg-transparent border-none p-[8px_0_4px] cursor-pointer text-faint text-[11px] hover:text-text"
      >
        <span className={cx("inline-block text-[13px] transition-transform duration-150", open && "rotate-90")}>▸</span>
        Operator notes
      </button>
      {open && (
        <textarea
          value={notes}
          onChange={(changeEvent) => onChangeNotes(changeEvent.target.value)}
          placeholder="Service reminders, cues, announcements…"
          className="w-full h-20 rounded-2 border border-border bg-panel2 text-text text-[12px] p-2 resize-y box-border outline-none"
        />
      )}
    </div>
  );
}
