"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PatchFn<TState> = (next: Partial<TState> | ((previousState: TState) => Partial<TState>)) => void;

function pickTrackedKeys<TState extends Record<string, unknown>>(
  source: TState, keys: (keyof TState)[]
): Partial<TState> {
  const result: Partial<TState> = {};
  for (const key of keys) result[key] = source[key];
  return result;
}

// Generic undo/redo stack over a subset of a state object's keys.
export function useUndoRedoHistory<TState extends Record<string, unknown>>(
  state: TState, patch: PatchFn<TState>, trackedKeys: (keyof TState)[], stackCap: number
) {
  const previousStateForHistoryRef = useRef(state);
  const [undoStack, setUndoStack] = useState<Partial<TState>[]>([]);
  const [redoStack, setRedoStack] = useState<Partial<TState>[]>([]);
  const isUndoRedoApplyingRef = useRef(false);

  useEffect(() => {
    const previousState = previousStateForHistoryRef.current;
    previousStateForHistoryRef.current = state;
    if (isUndoRedoApplyingRef.current) { isUndoRedoApplyingRef.current = false; return; }
    const touchedKeys = trackedKeys.filter((key) => state[key] !== previousState[key]);
    if (touchedKeys.length === 0) return;
    setUndoStack((stack) => [...stack, pickTrackedKeys(previousState, touchedKeys)].slice(-stackCap));
    setRedoStack([]);
  }, [state, trackedKeys, stackCap]);

  const undo = useCallback(() => {
    const snapshot = undoStack[undoStack.length - 1];
    if (!snapshot) return;
    isUndoRedoApplyingRef.current = true;
    setRedoStack((stack) => [...stack, pickTrackedKeys(state, Object.keys(snapshot) as (keyof TState)[])]);
    setUndoStack((stack) => stack.slice(0, -1));
    patch(snapshot);
  }, [undoStack, state, patch]);

  const redo = useCallback(() => {
    const snapshot = redoStack[redoStack.length - 1];
    if (!snapshot) return;
    isUndoRedoApplyingRef.current = true;
    setUndoStack((stack) => [...stack, pickTrackedKeys(state, Object.keys(snapshot) as (keyof TState)[])]);
    setRedoStack((stack) => stack.slice(0, -1));
    patch(snapshot);
  }, [redoStack, state, patch]);

  // Marks the next state change as hydration/replay, so it isn't itself captured for undo.
  const markAsHydration = useCallback(() => {
    isUndoRedoApplyingRef.current = true;
  }, []);

  return { undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0, markAsHydration };
}
