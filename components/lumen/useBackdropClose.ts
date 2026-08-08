import { useRef, type MouseEvent } from "react";

// Closes on backdrop click, but only when the mousedown also started on the backdrop.
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
