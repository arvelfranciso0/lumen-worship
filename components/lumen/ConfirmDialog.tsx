"use client";

import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import { useBackdropClose } from "./useBackdropClose";
import type { UseLumen } from "./useLumen";

// Generic confirmation dialog driven by lumen.state.confirmDialog.
export function ConfirmDialog({ lumen }: { lumen: UseLumen }) {
  const { state, closeConfirm } = lumen;
  const dialog = state.confirmDialog;
  const close = () => closeConfirm();
  const backdropProps = useBackdropClose(close);

  if (!dialog) return null;

  const confirm = () => {
    dialog.onConfirm();
    closeConfirm();
  };

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-140 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-90 max-w-[92vw] flex flex-col rounded-[16px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="p-[20px_20px_16px]">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">{dialog.title}</div>
          {dialog.body && <div className="text-[12.5px] text-muted mt-1.5 leading-[1.5]">{dialog.body}</div>}
        </div>
        <div className="flex justify-end gap-2.25 p-[14px_20px] border-t border-border bg-panel2">
          <InteractiveButton
            onClick={close}
            className="h-9 px-3.5 rounded-2.25 border border-border bg-panel text-[13px] text-muted cursor-pointer hover:text-text"
          >
            Cancel
          </InteractiveButton>
          <button
            onClick={confirm}
            className={cx(
              "h-9 px-4 rounded-2.25 border-none text-[13px] font-semibold cursor-pointer text-white",
              dialog.danger ? "bg-danger" : "bg-accent"
            )}
          >
            {dialog.confirmLabel || (dialog.danger ? "Delete" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
