"use client";

import { cx } from "../../cx";
import { InteractiveButton } from "../../ui/Interactive";
import type { OutputStatus } from "../../electron-bridges/electronDisplay";

// Second-monitor output status button; opens the displays modal.
export function HeaderOutputButton({
  outputStatus, hidden, secondaryDisplayAvailable, onOpenDisplaysModal,
}: {
  outputStatus: OutputStatus; hidden: boolean; secondaryDisplayAvailable: boolean; onOpenDisplaysModal: () => void;
}) {
  const outputDotClass = outputStatus.active
    ? "bg-ok"
    : hidden
      ? "bg-warn"
      : "bg-border2";
  // Label for detected output state, independent of whether presenting is active.
  const outputLabel =
    outputStatus.active && outputStatus.display
      ? "Output · " + outputStatus.display.label
      : secondaryDisplayAvailable
        ? "Output · Ready"
        : "Output · No display";

  return (
    <InteractiveButton
      onClick={onOpenDisplaysModal}
      title="Configure second-monitor output"
      className="flex items-center gap-2 p-[6px_10px] border border-border rounded-2.25 bg-panel2 text-[12px] text-muted cursor-pointer hover:bg-raise hover:text-text"
    >
      <span className={cx("w-1.5 h-1.5 rounded-full", outputDotClass)} />
      {outputLabel}
    </InteractiveButton>
  );
}
