"use client";

import { cx } from "../../cx";

// Always-mounted save status label (faded when empty) to avoid layout shift.
export function HeaderSaveStatus({ label }: { label: string }) {
  return (
    <span
      aria-hidden={label === "" ? true : undefined}
      className={cx(
        "font-mono text-[10.5px] text-faint w-11.5 flex-none transition-opacity duration-200",
        label ? "opacity-100" : "opacity-0"
      )}
    >
      {label || "Saved"}
    </span>
  );
}
