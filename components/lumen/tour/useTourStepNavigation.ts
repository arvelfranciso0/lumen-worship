"use client";

import { useEffect, useRef, useState } from "react";
import {
  stepSurface, tourStepsFor, type TourContext, type TourStep, type TourSurface,
} from "./tourSteps";
import type { UseLumen } from "../useLumen";

// Resolves the active tour's steps, auto-starts tours, and advances/finishes them.
export function useTourStepNavigation(lumen: UseLumen) {
  const { state, patch, prefsLoaded } = lumen;
  const startedModesRef = useRef<Set<string>>(new Set());

  const tourContext: TourContext = {
    hasBibleTranslations: state.downloadedTranslations.length > 0,
    hasMultipleBibleTranslations: state.downloadedTranslations.length >= 2,
  };

  // Tour steps resolved once when the tour starts, not on every render.
  const [activeSteps, setActiveSteps] = useState<TourStep[] | null>(null);
  useEffect(() => {
    // Sets tour steps when a tour begins.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveSteps(state.tourMode ? tourStepsFor(state.tourMode, tourContext) : null);
    // tourContext intentionally excluded — steps are fixed once the tour starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tourMode]);

  // Auto-starts the tour the first time a mode is entered.
  useEffect(() => {
    if (!prefsLoaded || state.tourMode) return;
    if (state.tourSeen[state.mode] || startedModesRef.current.has(state.mode)) return;
    startedModesRef.current.add(state.mode);
    patch({ tourMode: state.mode, tourStep: 0 });
  }, [prefsLoaded, state.mode, state.tourSeen, state.tourMode, patch]);

  // Which dialog/surface is currently on screen.
  const currentSurface: TourSurface =
    state.lineupModalOpen && !state.editingLineupId ? "lineupModal"
      : state.bibleTranslationsPanelOpen ? "bibleTranslations"
        : state.songEditorOpen ? "songEditor"
          : state.mode === "bible" && state.bibleSubTab === "compare" ? "bibleCompare"
            : "page";

  const steps = activeSteps;
  const step = steps ? steps[state.tourStep] : null;

  // Jumps to the next step matching the currently visible surface.
  useEffect(() => {
    if (!steps || !step || stepSurface(step) === currentSurface) return;
    const nextHere = steps.findIndex(
      (candidate, index) => index > state.tourStep && stepSurface(candidate) === currentSurface
    );
    // No matching later step: stay on the current step, hidden.
    if (nextHere === -1) return;
    patch({ tourStep: nextHere });
  }, [steps, step, currentSurface, state.tourStep, patch]);

  const isLastStep = steps ? state.tourStep === steps.length - 1 : false;

  // Ends the tour and marks the current mode as seen.
  const finish = () => {
    const finishedMode = state.tourMode;
    if (!finishedMode) return;
    patch((previousState) => ({
      tourMode: null, tourStep: 0,
      tourSeen: { ...previousState.tourSeen, [finishedMode]: true },
    }));
  };

  // Open/close patches for each surface, keyed by tour surface.
  const surfacePatch: Record<TourSurface, { open: Partial<typeof state>; close: Partial<typeof state> }> = {
    page: { open: {}, close: {} },
    lineupModal: {
      open: { lineupModalOpen: true, editingLineupId: null },
      close: { lineupModalOpen: false, editingLineupId: null },
    },
    bibleTranslations: {
      open: { bibleTranslationsPanelOpen: true },
      close: { bibleTranslationsPanelOpen: false },
    },
    songEditor: {
      open: { songEditorOpen: true, songEditorMode: "create" },
      close: { songEditorOpen: false },
    },
    bibleCompare: {
      open: { bibleSubTab: "compare" },
      close: { bibleSubTab: "browse" },
    },
  };

  const next = () => {
    if (!steps || !step) return;
    if (isLastStep) { finish(); return; }
    const fromSurface = stepSurface(step);
    const toSurface = stepSurface(steps[state.tourStep + 1]);
    patch((previousState) => ({
      ...(fromSurface === toSurface ? {} : { ...surfacePatch[fromSurface].close, ...surfacePatch[toSurface].open }),
      tourStep: previousState.tourStep + 1,
    }));
  };

  return { steps, step, currentSurface, isLastStep, finish, next };
}
