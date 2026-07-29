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
    <div
      onPointerDown={handlePointerDown}
      className={cx(
        "flex-none group relative bg-transparent select-none",
        axis === "horizontal" ? "w-2.5 cursor-col-resize" : "h-2.5 cursor-row-resize",
        className
      )}
    >
      <div
        className={cx(
          "absolute bg-border2 group-hover:bg-accent transition-colors rounded-full",
          axis === "horizontal" ? "inset-y-0 left-1/2 -translate-x-1/2 w-px" : "inset-x-0 top-1/2 -translate-y-1/2 h-px"
        )}
      />
    </div>
  );
}
