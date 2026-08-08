"use client";

import { useCallback } from "react";
import { DEFAULT_LAYOUT_SIZES, DEFAULT_LAYOUT_VISIBILITY, LAYOUT_SIZE_LIMITS, type LayoutPanelId, type LayoutSizes } from "../data";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";

// Panel resize/show-hide actions for the sidebar, preview column, and slides strip.
export function useLayoutPanels(patch: PatchFn<LumenState>) {
  const adjustLayoutSize = useCallback((sizeKey: keyof LayoutSizes, deltaPixels: number) => {
    patch((previousState) => {
      const sizeLimits = LAYOUT_SIZE_LIMITS[sizeKey];
      const currentSize = previousState.layoutSizes[sizeKey];
      const nextSize = Math.min(sizeLimits.max, Math.max(sizeLimits.min, currentSize + deltaPixels));
      return { layoutSizes: { ...previousState.layoutSizes, [sizeKey]: nextSize } };
    });
  }, [patch]);

  const toggleLayoutPanel = useCallback((panelId: LayoutPanelId) => {
    patch((previousState) => ({
      layoutVisibility: { ...previousState.layoutVisibility, [panelId]: !previousState.layoutVisibility[panelId] },
    }));
  }, [patch]);

  const resetLayout = useCallback(() => {
    patch({ layoutSizes: DEFAULT_LAYOUT_SIZES, layoutVisibility: DEFAULT_LAYOUT_VISIBILITY });
  }, [patch]);

  return { adjustLayoutSize, toggleLayoutPanel, resetLayout };
}
