"use client";

import { useEffect, useRef } from "react";
import { findLineElement, measureTextOffset } from "./liveSelectionMeasurement";
import type { UseLumen } from "../useLumen";

// Tracks the operator's text selection on the Live output box into lumen state.
export function useLiveSelectionTracking(lumen: UseLumen) {
  const { patch, idx } = lumen;
  const liveOutputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const container = liveOutputRef.current;
      if (!selection || !container || selection.isCollapsed || selection.rangeCount === 0) {
        patch({ liveSelection: null });
        return;
      }
      // Uses the Range's start/end, not anchor/focus, for consistent ordering.
      const range = selection.getRangeAt(0);
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        patch({ liveSelection: null });
        return;
      }
      const startLine = findLineElement(range.startContainer, container);
      const endLine = findLineElement(range.endContainer, container);
      if (!startLine || !endLine) {
        patch({ liveSelection: null });
        return;
      }
      const startOffset = measureTextOffset(startLine, range.startContainer, range.startOffset);
      const endOffset = measureTextOffset(endLine, range.endContainer, range.endOffset);
      const startLineIndex = Number(startLine.dataset.lineIndex);
      const endLineIndex = Number(endLine.dataset.lineIndex);
      if (startLineIndex === endLineIndex && startOffset === endOffset) { patch({ liveSelection: null }); return; }
      patch({ liveSelection: { startLineIndex, startOffset, endLineIndex, endOffset } });
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [patch]);

  // Old selection offsets don't mean anything once the live slide changes.
  useEffect(() => { patch({ liveSelection: null }); }, [idx, patch]);

  return liveOutputRef;
}
