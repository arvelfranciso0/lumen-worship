"use client";

import { useEffect } from "react";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";

export type KeyboardShortcutHandlers = {
  go: (direction: number) => void;
  patch: PatchFn<LumenState>;
  startPresenting: () => void;
  stopPresenting: () => void;
  undo: () => void;
  redo: () => void;
};

// Global keyboard shortcuts: deck navigation, blank/black, undo/redo, present, search, escape-to-close.
export function useKeyboardShortcuts({ go, patch, startPresenting, stopPresenting, undo, redo }: KeyboardShortcutHandlers) {
  useEffect(() => {
    const onKey = (keyboardEvent: KeyboardEvent) => {
      const pressedKey = keyboardEvent.key;
      const isCmdOrCtrl = keyboardEvent.metaKey || keyboardEvent.ctrlKey;
      if (pressedKey === "F5") { keyboardEvent.preventDefault(); startPresenting(); return; }
      if (pressedKey === "Escape") {
        // Routed through stopPresenting so Escape also cancels an in-flight countdown.
        stopPresenting();
        patch({
          settingsOpen: false, setPanelOpen: false, lyricsEditorOpen: false, uploadOpen: false,
          lineupModalOpen: false, editingLineupId: null, displaysModalOpen: false, hotkeysOpen: false,
          globalSearchOpen: false, globalSearchQuery: "", songEditorOpen: false,
          bibleTranslationsPanelOpen: false, sidebarDrawerOpen: false,
        });
        return;
      }
      if (isCmdOrCtrl && (pressedKey === "k" || pressedKey === "K")) {
        keyboardEvent.preventDefault();
        patch((previousState) => ({ globalSearchOpen: !previousState.globalSearchOpen }));
        return;
      }
      const target = keyboardEvent.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;
      if (isCmdOrCtrl && (pressedKey === "z" || pressedKey === "Z")) {
        keyboardEvent.preventDefault();
        if (keyboardEvent.shiftKey) redo(); else undo();
        return;
      }
      if (pressedKey === "ArrowRight" || pressedKey === " " || pressedKey === "PageDown") { keyboardEvent.preventDefault(); go(1); }
      else if (pressedKey === "ArrowLeft" || pressedKey === "PageUp" || pressedKey === "Backspace") { keyboardEvent.preventDefault(); go(-1); }
      // B toggles Blank, Shift+B toggles Black.
      else if (keyboardEvent.shiftKey && (pressedKey === "b" || pressedKey === "B")) {
        patch((previousState) => ({ black: !previousState.black, blank: false }));
      } else if (pressedKey === "b" || pressedKey === "B") {
        patch((previousState) => ({ blank: !previousState.blank, black: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, patch, startPresenting, stopPresenting, undo, redo]);
}
