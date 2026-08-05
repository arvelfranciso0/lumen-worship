"use client";

import { useRef } from "react";
import { InteractiveButton } from "./Interactive";
import { useBackdropClose } from "./useBackdropClose";
import type { UseLumen } from "./useLumen";

// Relocated out of SettingsModal, opened from the Bible sidebar tab instead
// — this app bundles no Bible data at all, every translation comes from a
// manual download-then-import here (see BIBLE_DOWNLOADS_URL in data.ts).
export function BibleTranslationsPanel({ lumen }: { lumen: UseLumen }) {
  const {
    state, patch, importBibleTranslation, removeBibleTranslation, openBibleDownloadsPage, bibleImportError,
  } = lumen;
  const bibleFileInputRef = useRef<HTMLInputElement>(null);
  const close = () => patch({ bibleTranslationsPanelOpen: false });
  const backdropProps = useBackdropClose(close);

  if (!state.bibleTranslationsPanelOpen) return null;

  const onBibleFile = (file: File | undefined) => {
    if (file) importBibleTranslation(file);
  };

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-120 bg-[rgba(6,6,8,.6)] backdrop-blur-[6px] flex items-center justify-center"
    >
      <div
        onClick={(clickEvent) => clickEvent.stopPropagation()}
        className="w-105 max-h-[86vh] flex flex-col rounded-[18px] border border-border2 bg-panel shadow-app overflow-hidden animate-[fadeUp_.18s_ease_both]"
      >
        <div className="flex items-center justify-between p-[18px_20px_14px] border-b border-border">
          <div className="text-[16px] font-semibold tracking-[-0.02em]">Bible Translations</div>
          <InteractiveButton
            onClick={close}
            className="w-8 h-8 rounded-2.25 border border-border bg-panel2 text-muted cursor-pointer hover:text-text hover:bg-raise"
          >
            ✕
          </InteractiveButton>
        </div>
        <div className="p-[18px_20px] flex flex-col gap-3 overflow-y-auto flex-1">
          <div className="flex items-center gap-2.5">
            <InteractiveButton
              data-tour="bible-panel-downloads"
              onClick={openBibleDownloadsPage}
              className="text-[12px] text-muted border-none cursor-pointer px-1 py-0.5 hover:text-text"
            >
              Get more translations
            </InteractiveButton>
            <InteractiveButton
              data-tour="bible-panel-import"
              onClick={() => bibleFileInputRef.current?.click()}
              className="text-[12px] text-accent border-none cursor-pointer px-1 py-0.5 hover:text-text"
            >
              + Import translation
            </InteractiveButton>
            <input
              ref={bibleFileInputRef}
              type="file"
              accept="application/json,.json,application/xml,text/xml,.xml"
              onChange={(changeEvent) => { onBibleFile(changeEvent.target.files?.[0]); changeEvent.target.value = ""; }}
              className="hidden"
            />
          </div>
          {bibleImportError && (
            <div className="p-[10px_12px] border border-danger rounded-xl bg-panel2 text-[12px] text-danger">
              {bibleImportError}
            </div>
          )}
          {state.downloadedTranslations.length === 0 ? (
            <div className="p-[12px_14px] border border-border rounded-xl bg-panel2 text-[12.5px] text-muted leading-normal">
              No translations imported yet. Download one from the translations page, then import the file here.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {state.downloadedTranslations.map((translation) => (
                <div
                  key={translation.code}
                  className="flex items-center justify-between p-[10px_12px] border border-border rounded-xl bg-panel2"
                >
                  <div>
                    <div className="text-[13px] font-medium">{translation.name}</div>
                    <div className="text-[12px] text-muted mt-0.5">{(translation.sizeBytes / (1024 * 1024)).toFixed(1)} MB</div>
                  </div>
                  <button
                    onClick={() => removeBibleTranslation(translation.code)}
                    className="w-7 h-7 rounded-full border border-border bg-panel text-muted text-[12px] cursor-pointer flex items-center justify-center hover:text-text"
                    title="Remove translation"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
