"use client";

import { useCallback } from "react";
import { getRepository } from "@/lib/repository";
import type { Lineup } from "../data";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";

// Create/update/delete/activate a lineup and manage its member songs.
export function useLineupActions(patch: PatchFn<LumenState>) {
  const createLineup = useCallback((name: string, songIds: string[]) => {
    const lineupId = "lineup-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const lineup: Lineup = { id: lineupId, name, songIds };
    getRepository().upsertLineup(lineup);
    patch((previousState) => ({
      lineups: [lineup, ...previousState.lineups],
      setIds: songIds, setName: name, activeLineupId: lineupId,
      lineupModalOpen: false, editingLineupId: null,
    }));
  }, [patch]);

  const updateLineup = useCallback((lineupId: string, name: string, songIds: string[]) => {
    getRepository().upsertLineup({ id: lineupId, name, songIds });
    patch((previousState) => ({
      lineups: previousState.lineups.map((lineup) => (lineup.id === lineupId ? { ...lineup, name, songIds } : lineup)),
      ...(previousState.activeLineupId === lineupId ? { setIds: songIds, setName: name } : {}),
      lineupModalOpen: false, editingLineupId: null,
    }));
  }, [patch]);

  const deleteLineup = useCallback((lineupId: string) => {
    getRepository().deleteLineup(lineupId);
    patch((previousState) => {
      // Drops this lineup's slot in lineupSongLooks along with it.
      const { [lineupId]: _removedLineupLooks, ...remainingLineupSongLooks } = previousState.lineupSongLooks;
      return {
        lineups: previousState.lineups.filter((lineup) => lineup.id !== lineupId),
        lineupSongLooks: remainingLineupSongLooks,
        // Clears the header's set name/count when the active lineup is deleted.
        ...(previousState.activeLineupId === lineupId ? { setName: "Untitled set", activeLineupId: null } : {}),
      };
    });
  }, [patch]);

  const activateLineup = useCallback((lineupId: string) => {
    patch((previousState) => {
      const targetLineup = previousState.lineups.find((entry) => entry.id === lineupId);
      return targetLineup
        ? { setIds: targetLineup.songIds, setName: targetLineup.name, activeLineupId: lineupId, setPanelOpen: false }
        : {};
    });
  }, [patch]);

  // Shared helper for lineup-membership mutations: transforms a lineup's songIds and persists it.
  const mutateLineupSongIds = useCallback((lineupId: string, updater: (songIds: string[]) => string[]) => {
    patch((previousState) => {
      const targetLineup = previousState.lineups.find((lineup) => lineup.id === lineupId);
      if (!targetLineup) return {};
      const updatedLineup = { ...targetLineup, songIds: updater(targetLineup.songIds) };
      getRepository().upsertLineup(updatedLineup);
      return {
        lineups: previousState.lineups.map((lineup) => (lineup.id === lineupId ? updatedLineup : lineup)),
        ...(previousState.activeLineupId === lineupId ? { setIds: updatedLineup.songIds } : {}),
      };
    });
  }, [patch]);

  const reorderLineupSongs = useCallback((lineupId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    mutateLineupSongIds(lineupId, (songIds) => {
      const reordered = songIds.slice();
      const [movedSongId] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, movedSongId);
      return reordered;
    });
  }, [mutateLineupSongIds]);

  const addSongToLineup = useCallback((lineupId: string, songId: string, atIndex?: number) => {
    mutateLineupSongIds(lineupId, (songIds) => {
      if (songIds.includes(songId)) return songIds;
      const next = songIds.slice();
      next.splice(atIndex ?? next.length, 0, songId);
      return next;
    });
  }, [mutateLineupSongIds]);

  const removeSongFromLineup = useCallback((lineupId: string, songId: string) => {
    mutateLineupSongIds(lineupId, (songIds) => songIds.filter((existingId) => existingId !== songId));
  }, [mutateLineupSongIds]);

  const renameLineup = useCallback((lineupId: string, name: string) => {
    patch((previousState) => {
      const targetLineup = previousState.lineups.find((lineup) => lineup.id === lineupId);
      if (!targetLineup) return {};
      const updatedLineup = { ...targetLineup, name };
      getRepository().upsertLineup(updatedLineup);
      return {
        lineups: previousState.lineups.map((lineup) => (lineup.id === lineupId ? updatedLineup : lineup)),
        ...(previousState.activeLineupId === lineupId ? { setName: name } : {}),
      };
    });
  }, [patch]);

  return {
    createLineup, updateLineup, deleteLineup, activateLineup, reorderLineupSongs,
    addSongToLineup, removeSongFromLineup, renameLineup,
  };
}
