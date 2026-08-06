"use client";

import { useCallback, useEffect, useRef } from "react";
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
  // onResizeDelta ultimately drives a patch() on the single app-wide state
  // object (see useLumen.ts), which re-renders the whole tree — calling it
  // once per raw pointermove (which can fire well above display refresh rate
  // on a high-poll-rate mouse/trackpad) has the render queue falling further
  // behind the actual pointer position with every event, which is what read
  // as the drag "stacking"/needing repeated clicks to catch up. Accumulating
  // the delta and flushing once per animation frame caps the update rate to
  // what the browser can actually paint, so the panel tracks the pointer
  // smoothly instead of queuing a growing backlog of renders.
  const pendingDeltaRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const onResizeDeltaRef = useRef(onResizeDelta);
  // Kept current via an effect (not a plain render-time assignment) since
  // it's only ever read later, from pointer event handlers — never during
  // render itself — so there's nothing to gain from the extra risk of
  // mutating a ref mid-render.
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
    // Restores normal text selection (see handlePointerDown for why it was
    // disabled) and flushes any movement still queued for the next frame —
    // otherwise the last sub-frame of the drag is silently dropped once the
    // listeners above are removed.
    document.body.style.removeProperty("user-select");
    if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
    flushPendingDelta();
  }, [handlePointerMove, flushPendingDelta]);

  const handlePointerDown = useCallback((downEvent: React.PointerEvent) => {
    downEvent.preventDefault();
    lastPointerPositionRef.current = axis === "horizontal" ? downEvent.clientX : downEvent.clientY;
    // A fast drag inevitably crosses selectable text in the panels either
    // side of the handle — without this, the browser starts a native text
    // selection mid-drag, which visibly interrupts/derails the resize until
    // the operator clicks again to clear it (the "requires repeated
    // clicking" symptom). window-level pointermove/up listeners don't care
    // what's under the cursor, so suppressing selection here is enough; no
    // pointer capture needed.
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [axis, handlePointerMove, handlePointerUp]);

  // Catches a drag left in progress if the panel owning this handle is
  // hidden/unmounted mid-drag (e.g. a layout-panel toggle fires while the
  // user is still dragging) — handlePointerUp above only ever runs on an
  // actual pointerup, which never comes once the handle itself is gone.
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.removeProperty("user-select");
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [handlePointerMove, handlePointerUp]);

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
