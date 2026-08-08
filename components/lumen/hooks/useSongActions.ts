"use client";

import { useCallback } from "react";
import { getRepository } from "@/lib/repository";
import { SONGS, type Song } from "../data";
import type { LumenState } from "../lumenState";
import type { PatchFn } from "./useUndoRedoHistory";
import type { ParsedSong } from "../song/songImport";

// Add/favorite/delete a song and manage per-song metadata overrides.
export function useSongActions(patch: PatchFn<LumenState>, allSongs: Song[], songOverrides: LumenState["songOverrides"]) {
  const addSong = useCallback((parsed: ParsedSong) => {
    const newSongId = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newSong: Song = { ...parsed, id: newSongId, fav: false, when: "Just added" };
    getRepository().upsertSong(newSong);
    patch((previousState) => ({
      customSongs: [newSong, ...previousState.customSongs],
      songId: newSongId, idx: 0, mode: "songs", uploadOpen: false,
    }));
  }, [patch]);

  const toggleFavorite = useCallback((songId: string) => {
    patch((previousState) => ({ favs: { ...previousState.favs, [songId]: !previousState.favs[songId] } }));
  }, [patch]);

  // Only ever called on a custom song.
  const deleteSong = useCallback((songId: string) => {
    getRepository().deleteSong(songId);
    patch((previousState) => ({
      customSongs: previousState.customSongs.filter((customSong) => customSong.id !== songId),
      // Falls back to the first built-in song if the deleted one was active.
      ...(previousState.songId === songId ? { songId: SONGS[0].id, idx: 0 } : {}),
    }));
  }, [patch]);

  // Shallow-patch overlay on top of any song, custom or built-in.
  const setSongMetaOverride = useCallback((songId: string, metaPatch: Partial<Song>) => {
    getRepository().setSongMetaOverride(songId, metaPatch);
    patch((previousState) => ({
      songMetaOverrides: {
        ...previousState.songMetaOverrides,
        [songId]: { ...previousState.songMetaOverrides[songId], ...metaPatch },
      },
    }));
  }, [patch]);

  // Duplicates a song as a new custom "(Reprise)" song.
  const duplicateSongAsReprise = useCallback((songId: string) => {
    const baseSong = allSongs.find((candidate) => candidate.id === songId);
    if (!baseSong) return;
    const sections = songOverrides[songId] ?? baseSong.sections;
    const newSongId = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newSong: Song = { ...baseSong, id: newSongId, title: baseSong.title + " (Reprise)", fav: false, when: "Just added", sections };
    getRepository().upsertSong(newSong);
    patch((previousState) => ({ customSongs: [newSong, ...previousState.customSongs] }));
  }, [allSongs, songOverrides, patch]);

  return { addSong, toggleFavorite, deleteSong, setSongMetaOverride, duplicateSongAsReprise };
}
