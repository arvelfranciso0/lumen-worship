"use client";

import { useState } from "react";
import { InteractiveButton, InteractiveInput } from "./Interactive";
import type { UseLumen } from "./useLumen";

// Named collections of verse references (see BibleCollection in data.ts) —
// deliberately translation-agnostic, so "add current verse" always adds a
// {book, chapter, verse} reference, never frozen wording.
export function BibleCollectionsPanel({ lumen }: { lumen: UseLumen }) {
  const {
    state, createBibleCollection, deleteBibleCollection, addVerseToCollection, removeVerseFromCollection,
    vnum, idx, askConfirm,
  } = lumen;
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentVerseRef = { book: state.book, chapter: state.chapter, verse: vnum(idx) };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <InteractiveInput
          value={newName}
          onChange={(changeEvent) => setNewName(changeEvent.target.value)}
          placeholder="New collection name"
          className="flex-1 h-7 px-2 rounded-1.75 border border-border bg-panel2 text-[11.5px] outline-none"
        />
        <InteractiveButton
          onClick={() => { if (newName.trim()) { createBibleCollection(newName.trim()); setNewName(""); } }}
          className="h-7 px-2.5 rounded-1.75 border-none bg-accent text-white text-[11px] font-semibold cursor-pointer"
        >
          Create
        </InteractiveButton>
      </div>

      {state.bibleCollections.length === 0 && (
        <div className="text-[12px] text-faint p-[8px_2px]">No collections yet.</div>
      )}

      {state.bibleCollections.map((collection) => {
        const expanded = expandedId === collection.id;
        return (
          <div key={collection.id} className="border border-border rounded-2.25 bg-panel2 overflow-hidden">
            <div
              onClick={() => setExpandedId(expanded ? null : collection.id)}
              className="flex items-center justify-between p-[9px_10px] cursor-pointer"
            >
              <div>
                <div className="text-[12.5px] font-semibold">{collection.name}</div>
                <div className="text-[10.5px] text-faint mt-0.5">
                  {collection.verseRefs.length === 1 ? "1 verse" : collection.verseRefs.length + " verses"}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={(clickEvent) => { clickEvent.stopPropagation(); addVerseToCollection(collection.id, currentVerseRef); }}
                  title="Add current verse"
                  className="h-5.5 px-2 rounded-1.25 border border-border bg-panel text-text text-[10px] cursor-pointer"
                >
                  + Add current
                </button>
                <button
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    askConfirm({ title: "Delete collection?", body: collection.name, danger: true, onConfirm: () => deleteBibleCollection(collection.id) });
                  }}
                  className="border-none bg-transparent text-faint text-[11px] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            {expanded && (
              <div className="p-[0_10px_10px] flex flex-col gap-1">
                {collection.verseRefs.length === 0 && (
                  <div className="text-[11px] text-faint">No verses yet — use &ldquo;+ Add current&rdquo;.</div>
                )}
                {collection.verseRefs.map((verseRef, verseRefIndex) => (
                  <div key={verseRefIndex} className="flex items-center justify-between text-[11.5px] text-muted">
                    <span>{verseRef.book} {verseRef.chapter}:{verseRef.verse}</span>
                    <button
                      onClick={() => removeVerseFromCollection(collection.id, verseRef)}
                      className="border-none bg-transparent text-faint text-[10px] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
