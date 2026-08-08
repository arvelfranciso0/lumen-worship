"use client";

import { useCallback, useEffect, useRef } from "react";
import { cx } from "./cx";

type ResizeHandleProps = {
  axis: "horizontal" | "vertical";
  onResizeDelta: (deltaPixels: number) => void;
  className?: string;
};

// Reports the incremental pointer-movement delta on every drag step.
export function ResizeHandle({ axis, onResizeDelta, className }: ResizeHandleProps) {
  const lastPointerPositionRef = useRef(0);
  // Accumulates pointer delta and flushes once per animation frame.
  const pendingDeltaRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const onResizeDeltaRef = useRef(onResizeDelta);
  // Keeps the latest onResizeDelta callback in a ref.
  useEffect(() => {
    onResizeDeltaRef.current = onResizeDelta;
  });

  const flushPendingDelta = useCallback(() => {
    rafIdRef.current = null;
    if (pendingDeltaRef.current === 0) return;
    const deltaPixels = pendingDeltaRef.current;
    pendingDeltaRef.current = 0;
    onResizeDeltaRef.current(deltaPixels);
  }, []);

  const handlePointerMove = useCallback((moveEvent: PointerEvent) => {
    const pointerPosition = axis === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
    const deltaPixels = pointerPosition - lastPointerPositionRef.current;
    lastPointerPositionRef.current = pointerPosition;
    pendingDeltaRef.current += deltaPixels;
    if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushPendingDelta);
  }, [axis, flushPendingDelta]);

  const handlePointerUp = useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    // Restores text selection and flushes any queued movement.
    document.body.style.removeProperty("user-select");
    if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
    flushPendingDelta();
  }, [handlePointerMove, flushPendingDelta]);

  const handlePointerDown = useCallback((downEvent: React.PointerEvent) => {
    downEvent.preventDefault();
    lastPointerPositionRef.current = axis === "horizontal" ? downEvent.clientX : downEvent.clientY;
    // Disables text selection for the duration of the drag.
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [axis, handlePointerMove, handlePointerUp]);

  // Cleans up listeners if the handle unmounts mid-drag.
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.removeProperty("user-select");
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    // The 3px bar is the divider; the ::after pseudo-element widens the grab target.
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
