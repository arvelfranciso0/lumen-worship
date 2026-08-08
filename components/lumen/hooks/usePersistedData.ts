"use client";

import { useEffect, useState } from "react";
import { getRepository } from "@/lib/repository";
import { normalizeBibleLanguage } from "../../../electron/bibleXml.js";
import { generateVideoPoster } from "../media/backgroundMedia";
import { resolveTourSeenOnHydrate, type LumenState } from "../lumenState";
import { speedPctToDurationMs } from "./useSlideTransition";
import type { PatchFn } from "./useUndoRedoHistory";

// Loads persisted data on mount and keeps it saved back on every relevant state change.
export function usePersistedData(state: LumenState, patch: PatchFn<LumenState>, markAsHydration: () => void) {
  // Gates WelcomeModal until loadAll() resolves.
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRepository().loadAll().then((data) => {
      if (cancelled) return;
      // Reverses to most-recently-added-first order and re-normalizes each entry's language.
      const downloadedTranslations = [...data.downloadedBibleTranslations].reverse().map((entry) => ({
        ...entry,
        language: normalizeBibleLanguage(entry.language, entry.name),
      }));
      // Marks this as hydration, not a user edit, so it isn't captured for undo.
      markAsHydration();
      patch({
        customSongs: [...data.customSongs].reverse(),
        lineups: [...data.lineups].reverse(),
        customBackgrounds: [...data.customBackgrounds].reverse(),
        downloadedTranslations,
        songOverrides: data.songOverrides,
        songMetaOverrides: data.songMetaOverrides,
        ...data.prefs,
        // Forces outputEnabled off on every launch.
        outputEnabled: false,
        // Migrates the legacy hasSeenOnboarding flag into per-mode tourSeen, once.
        ...(data.prefs.tourSeen ? {} : { tourSeen: resolveTourSeenOnHydrate(data.prefs.hasSeenOnboarding ?? false) }),
        // Converts a legacy percentage-based transition speed into a duration.
        ...(data.prefs.transitionDurationMs === undefined && data.prefs.transitionSpeedPct !== undefined
          ? { transitionDurationMs: speedPctToDurationMs(data.prefs.transitionSpeedPct) }
          : {}),
        // Lands on the most recently imported translation at Genesis 1.
        ...(downloadedTranslations.length > 0
          ? { trans: downloadedTranslations[0].code, book: "Genesis", chapter: 1, idx: 0 }
          : {}),
      });
      setPrefsLoaded(true);
      data.customBackgrounds
        .filter((background) => background.mediaType === "video")
        .forEach((background) => {
          generateVideoPoster(background.url).then((posterUrl) => {
            if (cancelled) return;
            patch((previousState) => ({
              customBackgrounds: previousState.customBackgrounds.map((entry) =>
                entry.id === background.id ? { ...entry, posterUrl } : entry
              ),
            }));
          }).catch((error) => {
            // Logs poster generation failures.
            console.error("Failed to generate poster for background " + background.id + ":", error);
          });
        });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [patch, markAsHydration]);

  useEffect(() => {
    // Waits for loadAll() to finish before persisting, so it never clobbers saved prefs with defaults.
    if (!prefsLoaded) return;
    const persistTimeout = setTimeout(() => {
      patch({ saveStatus: "saving" });
      getRepository().setPrefs({
        favs: state.favs, look: state.look, scale: state.scale, theme: state.theme,
        font: state.font, setIds: state.setIds, setName: state.setName,
        layoutSizes: state.layoutSizes, layoutVisibility: state.layoutVisibility, lyricStyle: state.lyricStyle,
        // outputEnabled is not persisted; only outputDisplayId is saved.
        bibleHighlights: state.bibleHighlights, outputDisplayId: state.outputDisplayId,
        autoUpdateEnabled: state.autoUpdateEnabled, hasSeenOnboarding: state.hasSeenOnboarding,
        performanceMode: state.performanceMode, transitionType: state.transitionType,
        transitionDurationMs: state.transitionDurationMs,
        operatorNotes: state.operatorNotes, tourSeen: state.tourSeen,
        deletedLookIds: state.deletedLookIds,
        lineupSongLooks: state.lineupSongLooks,
      }).then(() => {
        patch({ saveStatus: "saved" });
        setTimeout(() => patch({ saveStatus: "idle" }), 1500);
      });
    }, 400);
    return () => clearTimeout(persistTimeout);
  }, [
    prefsLoaded, patch,
    state.favs, state.look, state.scale, state.theme, state.font, state.setIds, state.setName,
    state.layoutSizes, state.layoutVisibility, state.lyricStyle, state.bibleHighlights,
    state.outputDisplayId, state.autoUpdateEnabled, state.hasSeenOnboarding,
    state.performanceMode, state.transitionType, state.transitionDurationMs,
    state.operatorNotes, state.tourSeen, state.deletedLookIds, state.lineupSongLooks,
  ]);

  return { prefsLoaded };
}
