"use client";

import { useEffect, useRef, useState } from "react";
import { extractMetadataHeader, parseLyricsBlock, sectionsToText } from "../song/songImport";
import type { UseLumen } from "../useLumen";

// Owns the create/edit song form's fields, file import, and submit handling.
export function useSongEditorForm(lumen: UseLumen) {
  const { state, patch, song, saveLyrics, setSongMetaOverride, addSong } = lumen;
  const isEdit = state.songEditorMode === "edit";

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [cat, setCat] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [ccli, setCcli] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle(""); setArtist(""); setKey(""); setBpm(""); setCat(""); setTagsText(""); setCcli("");
    setLyricsText(""); setError("");
  };

  useEffect(() => {
    if (!state.songEditorOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect -- syncs form fields to the opened song/mode. */
    if (isEdit) {
      setTitle(song.title); setArtist(song.artist); setKey(song.key); setBpm(song.bpm); setCat(song.cat);
      setTagsText(song.tags.join(", ")); setCcli(song.ccli || ""); setLyricsText(sectionsToText(song.sections));
    } else {
      reset();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state.songEditorOpen, isEdit, song]);

  const close = () => { patch({ songEditorOpen: false }); reset(); };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = extractMetadataHeader(String(reader.result || ""));
      setTitle(parsed.title); setArtist(parsed.artist); setKey(parsed.key); setBpm(parsed.bpm);
      setCat(parsed.cat); setTagsText(parsed.tags.join(", ")); setCcli(parsed.ccli); setLyricsText(parsed.body);
      setError("");
    };
    reader.readAsText(file);
  };

  const submit = () => {
    const tags = tagsText.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (isEdit) {
      saveLyrics(parseLyricsBlock(lyricsText));
      setSongMetaOverride(song.id, {
        title: title.trim() || song.title, artist: artist.trim(), key: key.trim(), bpm: bpm.trim(),
        cat: cat.trim() || song.cat, tags, ccli: ccli.trim(),
      });
      close();
      return;
    }
    if (!title.trim()) { setError("Add a title before uploading."); return; }
    addSong({
      title: title.trim(), artist: artist.trim(), key: key.trim(), bpm: bpm.trim(),
      cat: cat.trim() || "Contemporary", tags, ccli: ccli.trim(), sections: parseLyricsBlock(lyricsText),
    });
    reset();
  };

  return {
    isEdit, song,
    title, setTitle, artist, setArtist, key, setKey, bpm, setBpm, cat, setCat,
    tagsText, setTagsText, ccli, setCcli, lyricsText, setLyricsText, error, setError,
    fileRef, close, onFile, submit,
  };
}
