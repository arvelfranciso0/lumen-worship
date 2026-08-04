"use client";

import { useCallback, useRef } from "react";
import { cx } from "./cx";

type ResizeHandleProps = {
  axis: "horizontal" | "vertical";
  onResizeDelta: (deltaPixels: number) => void;
  className?: string;
};

// Reports the incremental pointer-movement delta on every drag step, rather than
// a size — callers decide how a delta maps to their own dimension (and its sign,
// since a handle can sit on either side of the panel it resizes).
export function ResizeHandle({ axis, onResizeDelta, className }: ResizeHandleProps) {
  const lastPointerPositionRef = useRef(0);

  const handlePointerMove = useCallback((moveEvent: PointerEvent) => {
    const pointerPosition = axis === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
    const deltaPixels = pointerPosition - lastPointerPositionRef.current;
    lastPointerPositionRef.current = pointerPosition;
    onResizeDelta(deltaPixels);
  }, [axis, onResizeDelta]);

  const handlePointerUp = useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  const handlePointerDown = useCallback((downEvent: React.PointerEvent) => {
    downEvent.preventDefault();
    lastPointerPositionRef.current = axis === "horizontal" ? downEvent.clientX : downEvent.clientY;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [axis, handlePointerMove, handlePointerUp]);

  return (
    // The handle IS the divider line — a solid 3px rule, not a wide transparent
    // strip with a hairline drawn inside it. The transparent version used to be
    // invisible only because the panels either side had no background of their
    // own; now that they do, it opened a strip of page background between them
    // that read as a gap.
    //
    // The ::after box restores a comfortable grab target either side of that 3px
    // without occupying any layout space (and so without reopening the gap). It
    // needs the z-index because it overlaps the next panel, which comes later in
    // the DOM and would otherwise swallow the pointer on its half.
    <div
      onPointerDown={handlePointerDown}
      className={cx(
        "flex-none relative z-10 select-none bg-border2 hover:bg-accent transition-colors after:absolute after:content-['']",
        axis === "horizontal"
          ? "w-0.75 cursor-col-resize after:inset-y-0 after:-left-1.5 after:-right-1.5"
          : "h-0.75 cursor-row-resize after:inset-x-0 after:-top-1.5 after:-bottom-1.5",
        className
      )}
    />
  );
}
