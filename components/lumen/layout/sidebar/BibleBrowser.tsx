"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BibleComparePanel } from "../../bible/BibleComparePanel";
import { cx } from "../../cx";
import { InteractiveButton } from "../../ui/Interactive";
import type { UseLumen } from "../../useLumen";

const BIBLE_SUB_TABS: { id: "browse" | "compare"; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "compare", label: "Compare" },
];

type BibleBrowserProps = {
  lumen: UseLumen;
  hasBibleTranslations: boolean;
  visibleBibleBooks: UseLumen["bibleBooks"];
};

// Book/chapter picker, translation switcher, and verse passage/compare view.
export function BibleBrowser({ lumen, hasBibleTranslations, visibleBibleBooks }: BibleBrowserProps) {
  const { state, patch, ref, passage, vlabel, idx, currentBook, currentTransMeta, shortTransLabel } = lumen;

  // Languages derived from imported Bible translations.
  const bibleLanguages = useMemo(
    () => Array.from(new Set(state.downloadedTranslations.map((entry) => entry.language))),
    [state.downloadedTranslations]
  );
  const [transLang, setTransLang] = useState<string | null>(null);
  useEffect(() => {
    if (bibleLanguages.length && (!transLang || !bibleLanguages.includes(transLang))) {
      setTransLang(bibleLanguages[0]);
    }
  }, [bibleLanguages, transLang]);
  // Switches to the first translation of the selected language.
  const selectLanguage = (language: string) => {
    setTransLang(language);
    const current = state.downloadedTranslations.find((entry) => entry.code === state.trans);
    if (current?.language === language) return;
    const firstOfLanguage = state.downloadedTranslations.find((entry) => entry.language === language);
    if (firstOfLanguage) patch({ trans: firstOfLanguage.code, idx: 0 });
  };

  // Scrolls the active verse into view.
  const activeVerseRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeVerseRef.current?.scrollIntoView({ block: "nearest" });
  }, [idx, state.book, state.chapter, state.bibleSubTab, state.mode]);

  if (!hasBibleTranslations) {
    return (
      <div className="flex-1 flex items-center justify-center p-[24px_18px]">
        <div className="flex flex-col items-center gap-2 text-center text-muted">
          <span className="text-[22px] text-faint">📖</span>
          <div className="text-[13px] font-semibold text-text">No Bible translations imported</div>
          <div className="text-[12px] leading-normal max-w-55">
            Import a translation to start browsing and presenting Scripture.
          </div>
          <InteractiveButton
            data-tour="bible-import"
            onClick={() => patch({ bibleTranslationsPanelOpen: true })}
            className="mt-1 h-7.5 px-3 rounded-2 border border-border bg-panel2 text-[12px] text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            Import translation
          </InteractiveButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <div data-tour="bible-nav" className="flex-none flex border-b border-border h-43">
        <div className="w-29.5 flex-none border-r border-border overflow-y-auto p-1.5">
          {visibleBibleBooks.length === 0 ? (
            <div className="text-[11px] text-faint p-[6px_8px] leading-normal">No books match “{state.query.trim()}”</div>
          ) : (
            visibleBibleBooks.map((book) => (
              <button
                key={book.number}
                onClick={() => patch({ book: book.name, chapter: 1, idx: 0 })}
                className={cx(
                  "block w-full text-left p-[6px_8px] rounded-[7px] border-none cursor-pointer text-[12px]",
                  book.name === state.book ? "bg-accent-soft text-text font-semibold" : "bg-transparent text-muted font-normal"
                )}
              >
                {book.name}
              </button>
            ))
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-[10px] font-semibold tracking-[.06em] uppercase text-faint p-[2px_2px_7px]">
            Chapter
          </div>
          <div className="grid grid-cols-5 gap-1.25">
            {Array.from({ length: currentBook?.chapters.length || 1 }, (_, chapterOffset) => chapterOffset + 1).map((chapterNumber) => (
              <button
                key={chapterNumber}
                onClick={() => patch({ chapter: chapterNumber, idx: 0 })}
                className={cx(
                  "h-6.5 rounded-[7px] cursor-pointer text-[11px] font-mono border",
                  chapterNumber === state.chapter ? "border-accent bg-accent-soft text-text" : "border-border bg-panel2 text-muted"
                )}
              >
                {chapterNumber}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Language, then version-within-language, filter rows. */}
      <div className="flex-none flex flex-col gap-2 p-[10px_14px] border-b border-border">
        <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint">Language</div>
        <div className="flex flex-wrap gap-1.5">
          {bibleLanguages.map((language) => (
            <button
              key={language}
              onClick={() => selectLanguage(language)}
              className={cx(
                "h-6.5 px-2.5 rounded-full border text-[11.5px] cursor-pointer",
                transLang === language ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel2 text-muted hover:text-text"
              )}
            >
              {language}
            </button>
          ))}
        </div>
        <div className="text-[11px] font-semibold tracking-[.06em] uppercase text-faint mt-1">Version</div>
        <div data-tour="bible-version" className="flex flex-wrap gap-1.5">
          {state.downloadedTranslations
            .filter((entry) => entry.language === transLang)
            .map((entry) => (
              <button
                key={entry.code}
                onClick={() => patch({ trans: entry.code })}
                title={entry.name}
                className={cx(
                  "h-6 px-2.25 rounded-1.5 border font-mono text-[10.5px] cursor-pointer",
                  state.trans === entry.code ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel2 text-muted hover:text-text"
                )}
              >
                {shortTransLabel(entry.code)}
              </button>
            ))}
        </div>
        <InteractiveButton
          data-tour="bible-import"
          onClick={() => patch({ bibleTranslationsPanelOpen: true })}
          className="flex items-center justify-center gap-1.5 h-7.5 mt-0.5 rounded-2 border border-border bg-panel2 text-muted text-[11.5px] cursor-pointer hover:text-text hover:bg-raise"
        >
          Get more translations →
        </InteractiveButton>
      </div>

      <div className="flex-none flex items-center gap-1 px-2 pt-2 border-b border-border overflow-x-auto">
        {BIBLE_SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            data-tour={tab.id === "compare" ? "bible-compare-toggle" : undefined}
            onClick={() => patch({ bibleSubTab: tab.id })}
            className={cx(
              "flex-none h-6 px-2.5 rounded-full border text-[11px] cursor-pointer mb-2",
              state.bibleSubTab === tab.id ? "border-accent bg-accent-soft text-text font-semibold" : "border-border bg-panel2 text-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-[10px_10px_20px]">
        {state.bibleSubTab === "browse" && (
          <>
            <div className="p-[4px_6px_9px]">
              <div className="flex items-baseline gap-2">
                <div className="text-[13.5px] font-semibold tracking-[-0.01em]">{ref}</div>
                <div className="font-mono text-[10px] text-faint">
                  {currentTransMeta?.name || state.trans}
                </div>
              </div>
              {currentTransMeta && (
                <div className="text-[10px] text-faint mt-0.75 leading-[1.4]">
                  {currentTransMeta.license}
                </div>
              )}
            </div>
            <div data-tour="bible-verse" className="flex flex-col gap-1">
              {passage.map((verseText, verseIndex) => (
                <div
                  key={verseIndex}
                  ref={verseIndex === idx ? activeVerseRef : undefined}
                  onClick={() => patch({ idx: verseIndex })}
                  className={cx(
                    "flex gap-2.25 p-[8px_9px] rounded-2.25 cursor-pointer border",
                    verseIndex === idx ? "border-accent bg-accent-soft" : "border-transparent bg-panel2"
                  )}
                >
                  <span className={cx("font-mono text-[10px] pt-0.75", verseIndex === idx ? "text-accent" : "text-faint")}>
                    {vlabel(verseIndex)}
                  </span>
                  <span className="flex-1 text-[12.5px] leading-normal">{verseText}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {state.bibleSubTab === "compare" && <BibleComparePanel lumen={lumen} />}
      </div>
    </>
  );
}
