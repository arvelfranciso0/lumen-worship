"use client";

import { diffWords } from "./diffWords";
import { useBibleTranslation } from "./useBibleTranslation";
import type { UseLumen } from "./useLumen";

// Real word-diff between two DOWNLOADED translations (never hardcoded —
// version pickers are populated only from state.downloadedTranslations).
// Needs at least 2 real translations imported to be useful at all; shows a
// prompt otherwise rather than faking comparison text.
export function BibleComparePanel({ lumen }: { lumen: UseLumen }) {
  const { state, patch, currentBook, shortTransLabel, compareTranslationBCode } = lumen;

  const translationOptions = state.downloadedTranslations;
  // The validated code from useLumen, not state.compareMode's raw request — the
  // panel must show exactly the comparison the Live output is showing.
  const translationBCode = compareTranslationBCode;
  const translationBData = useBibleTranslation(translationBCode);

  if (translationOptions.length < 2) {
    return (
      <div className="text-[12px] text-muted p-[10px_6px] leading-normal">
        Compare needs at least 2 downloaded translations. Import another one from Settings &gt; Bible Translations.
      </div>
    );
  }

  const currentChapter = currentBook?.chapters.find((chapter) => chapter.number === state.chapter);
  const verseA = currentChapter?.verses[lumen.idx];
  const bookB = translationBData?.books.find((book) => book.name === state.book);
  const chapterB = bookB?.chapters.find((chapter) => chapter.number === state.chapter);
  const verseB = chapterB?.verses[lumen.idx];

  const diff = verseA && verseB ? diffWords(verseA.text, verseB.text) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10.5px] font-semibold tracking-[.06em] uppercase text-faint">Compare 2 translations</div>
      <div className="flex gap-2">
        <select
          value={state.trans}
          onChange={(changeEvent) => patch({ trans: changeEvent.target.value })}
          className="flex-1 h-7 rounded-1.75 border border-border bg-panel2 text-text text-[11.5px] px-2"
        >
          {translationOptions.map((entry) => (
            <option key={entry.code} value={entry.code}>{shortTransLabel(entry.code)}</option>
          ))}
        </select>
        <select
          value={translationBCode ?? ""}
          onChange={(changeEvent) => patch({ compareMode: { verseIndex: lumen.idx, translationB: changeEvent.target.value } })}
          className="flex-1 h-7 rounded-1.75 border border-border bg-panel2 text-text text-[11.5px] px-2"
        >
          <option value="" disabled>Compare with…</option>
          {translationOptions.filter((entry) => entry.code !== state.trans).map((entry) => (
            <option key={entry.code} value={entry.code}>{shortTransLabel(entry.code)}</option>
          ))}
        </select>
        {state.compareMode && (
          <button
            onClick={() => patch({ compareMode: null })}
            title="Stop comparing"
            className="h-7 px-2 rounded-1.75 border border-border bg-panel2 text-muted text-[11px] cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {translationBCode && (
        translationBData === undefined ? (
          <div className="text-[11.5px] text-faint">Loading…</div>
        ) : translationBData === null ? (
          <div className="text-[11.5px] text-danger">Couldn&apos;t load that translation.</div>
        ) : diff ? (
          <div className="grid grid-cols-1 gap-2">
            <div className="border border-border rounded-2.25 p-2.25 bg-panel2">
              <div className="text-[10px] font-bold tracking-[.06em] text-accent mb-1.5">{shortTransLabel(state.trans)}</div>
              <div className="text-[11.5px] leading-[1.6]">
                {diff.wordsA.map((word, wordIndex) => (
                  <span key={wordIndex} className={word.type === "del" ? "bg-danger/25 rounded-0.75" : undefined}>
                    {word.text}
                  </span>
                ))}
              </div>
            </div>
            <div className="border border-border rounded-2.25 p-2.25 bg-panel2">
              <div className="text-[10px] font-bold tracking-[.06em] text-accent mb-1.5">{shortTransLabel(translationBCode)}</div>
              <div className="text-[11.5px] leading-[1.6]">
                {diff.wordsB.map((word, wordIndex) => (
                  <span key={wordIndex} className={word.type === "add" ? "bg-ok/25 rounded-0.75" : undefined}>
                    {word.text}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-[10.5px] font-semibold tracking-[.06em] uppercase text-faint">Live output shows both</div>
          </div>
        ) : (
          <div className="text-[11.5px] text-faint">This verse isn&apos;t in one of the two translations.</div>
        )
      )}
    </div>
  );
}
