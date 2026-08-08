"use client";

import { useCallback } from "react";
import { getRepository } from "@/lib/repository";
import type { Section, Song } from "../data";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";

// Slide filmstrip editing for the active song: duplicate/merge/split/reorder slides and their backgrounds.
export function useSlideEditing(song: Song, patch: PatchFn<LumenState>, lineupScopeId: string | null) {
  const saveLyrics = useCallback((sections: Section[]) => {
    getRepository().setSongOverride(song.id, sections);
    patch((previousState) => ({ songOverrides: { ...previousState.songOverrides, [song.id]: sections } }));
  }, [patch, song.id]);

  // Keeps each lineup's per-slide background array in sync with song.sections after slide edits.
  const reindexLineupSongLooks = useCallback((songId: string, transform: (lookIds: (string | null)[]) => (string | null)[]) => {
    patch((previousState) => {
      let changed = false;
      const nextLineupSongLooks: typeof previousState.lineupSongLooks = {};
      for (const [lineupId, songLooks] of Object.entries(previousState.lineupSongLooks)) {
        const lookIds = songLooks[songId];
        if (!lookIds) { nextLineupSongLooks[lineupId] = songLooks; continue; }
        changed = true;
        nextLineupSongLooks[lineupId] = { ...songLooks, [songId]: transform(lookIds) };
      }
      return changed ? { lineupSongLooks: nextLineupSongLooks } : {};
    });
  }, [patch]);

  const duplicateSlide = useCallback((sectionIndex: number) => {
    const target = song.sections[sectionIndex];
    if (!target) return;
    const next = song.sections.slice();
    next.splice(sectionIndex + 1, 0, { ...target, lines: [...target.lines] });
    saveLyrics(next);
    reindexLineupSongLooks(song.id, (lookIds) => {
      const nextLookIds = lookIds.slice();
      nextLookIds.splice(sectionIndex + 1, 0, nextLookIds[sectionIndex] ?? null);
      return nextLookIds;
    });
  }, [song.sections, song.id, saveLyrics, reindexLineupSongLooks]);

  const mergeSlideWithNext = useCallback((sectionIndex: number) => {
    const current = song.sections[sectionIndex];
    const next = song.sections[sectionIndex + 1];
    if (!current || !next) return;
    const merged: Section = {
      label: current.label,
      lines: [...current.lines, ...next.lines],
      lineHighlights: (current.lineHighlights || current.lines.map(() => [])).concat(next.lineHighlights || next.lines.map(() => [])),
      lookId: current.lookId,
      note: current.note,
    };
    const updated = song.sections.slice();
    updated.splice(sectionIndex, 2, merged);
    saveLyrics(updated);
    reindexLineupSongLooks(song.id, (lookIds) => {
      const nextLookIds = lookIds.slice();
      nextLookIds.splice(sectionIndex, 2, nextLookIds[sectionIndex] ?? null);
      return nextLookIds;
    });
  }, [song.sections, song.id, saveLyrics, reindexLineupSongLooks]);

  const splitSlide = useCallback((sectionIndex: number, atLineIndex: number) => {
    const target = song.sections[sectionIndex];
    if (!target || atLineIndex <= 0 || atLineIndex >= target.lines.length) return;
    const firstHalf: Section = {
      label: target.label, lines: target.lines.slice(0, atLineIndex), lineHighlights: target.lineHighlights?.slice(0, atLineIndex),
      lookId: target.lookId, note: target.note,
    };
    const secondHalf: Section = {
      label: target.label, lines: target.lines.slice(atLineIndex), lineHighlights: target.lineHighlights?.slice(atLineIndex),
      lookId: target.lookId, note: target.note,
    };
    const updated = song.sections.slice();
    updated.splice(sectionIndex, 1, firstHalf, secondHalf);
    saveLyrics(updated);
    reindexLineupSongLooks(song.id, (lookIds) => {
      const nextLookIds = lookIds.slice();
      const currentLookId = nextLookIds[sectionIndex] ?? null;
      nextLookIds.splice(sectionIndex, 1, currentLookId, currentLookId);
      return nextLookIds;
    });
  }, [song.sections, song.id, saveLyrics, reindexLineupSongLooks]);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const updated = song.sections.slice();
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    saveLyrics(updated);
    reindexLineupSongLooks(song.id, (lookIds) => {
      const nextLookIds = lookIds.slice();
      const [movedLookId] = nextLookIds.splice(fromIndex, 1);
      nextLookIds.splice(toIndex, 0, movedLookId);
      return nextLookIds;
    });
  }, [song.sections, song.id, saveLyrics, reindexLineupSongLooks]);

  // Writes a lookId to slides, scoped to the lineup when editing inside one.
  const setSectionLooks = useCallback((sectionIndexes: number[], lookId: string | undefined) => {
    if (lineupScopeId) {
      const targetSongId = song.id;
      patch((previousState) => {
        const forLineup = previousState.lineupSongLooks[lineupScopeId] ?? {};
        // song.sections is already the lineup-aware view, so its length is always correct here.
        const currentLookIds: (string | null)[] = forLineup[targetSongId] ?? song.sections.map(() => null);
        const nextLookIds = currentLookIds.slice();
        for (const sectionIndex of sectionIndexes) nextLookIds[sectionIndex] = lookId ?? null;
        return {
          lineupSongLooks: {
            ...previousState.lineupSongLooks,
            [lineupScopeId]: { ...forLineup, [targetSongId]: nextLookIds },
          },
        };
      });
      return;
    }
    const sectionIndexSet = new Set(sectionIndexes);
    saveLyrics(song.sections.map((section, index) => (sectionIndexSet.has(index) ? { ...section, lookId } : section)));
  }, [lineupScopeId, song.id, song.sections, patch, saveLyrics]);

  const setSlideLook = useCallback((sectionIndex: number, lookId: string | undefined) => {
    setSectionLooks([sectionIndex], lookId);
  }, [setSectionLooks]);

  // Applies a background to every slide sharing the current slide's label.
  const applySlideLookToLabel = useCallback((sectionIndex: number, lookId: string | undefined) => {
    const label = song.sections[sectionIndex]?.label;
    if (label === undefined) return;
    const matchingIndexes = song.sections.reduce<number[]>(
      (indexes, section, index) => (section.label === label ? [...indexes, index] : indexes), []
    );
    setSectionLooks(matchingIndexes, lookId);
  }, [song.sections, setSectionLooks]);

  // Applies a background to every slide of the current song.
  const applyLookToAllSlides = useCallback((lookId: string | undefined) => {
    setSectionLooks(song.sections.map((_section, index) => index), lookId);
  }, [song.sections, setSectionLooks]);

  return {
    saveLyrics, duplicateSlide, mergeSlideWithNext, splitSlide, reorderSlides,
    setSlideLook, applySlideLookToLabel, applyLookToAllSlides,
  };
}
