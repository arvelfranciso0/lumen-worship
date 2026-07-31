import { useRef, type MouseEvent } from "react";

// Closing a modal on a plain backdrop onClick also fires when a drag started
// *inside* the modal (e.g. dragging a <textarea>'s resize handle) ends with
// the mouse released over the backdrop — browsers target that click at the
// nearest common ancestor of the mousedown/mouseup elements, which is the
// backdrop itself, so the inner panel's stopPropagation never even runs.
// Requiring the mousedown to have *also* started directly on the backdrop
// fixes that without changing normal click-outside-to-close behavior.
export function useBackdropClose(close: () => void) {
  const mouseDownOnBackdrop = useRef(false);
  return {
    onMouseDown: (event: MouseEvent) => {
      mouseDownOnBackdrop.current = event.target === event.currentTarget;
    },
    onClick: (event: MouseEvent) => {
      if (mouseDownOnBackdrop.current && event.target === event.currentTarget) close();
    },
  };
}
