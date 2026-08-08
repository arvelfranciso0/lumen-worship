"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cx } from "./cx";
import { InteractiveButton } from "./Interactive";
import type { UseLumen } from "./useLumen";
import type { Breakpoint } from "./useViewportBreakpoint";

// Lazy-loads react-markdown only when the release-notes popover opens.
const ReleaseNotesMarkdown = dynamic(
  () =>
    Promise.all([import("react-markdown"), import("remark-gfm")]).then(
      ([reactMarkdownModule, remarkGfmModule]) => {
        function ReleaseNotesMarkdownComponent({ children }: { children: string }) {
          const ReactMarkdown = reactMarkdownModule.default;
          return <ReactMarkdown remarkPlugins={[remarkGfmModule.default]}>{children}</ReactMarkdown>;
        }
        return ReleaseNotesMarkdownComponent;
      }
    ),
  { ssr: false }
);

const SHAKE_DURATION_MS = 650;

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function Header({ lumen, breakpoint }: { lumen: UseLumen; breakpoint: Breakpoint }) {
  const isTablet = breakpoint === "tablet";
  const isDesktop = breakpoint === "desktop";
  const {
    state,
    patch,
    theme,
    hidden,
    setSongs,
    outputStatus,
    secondaryDisplayAvailable,
    updateStatus,
    installUpdate,
    startPresenting,
    stopPresenting,
    presentCountdown,
    isPresenting,
    undo,
    redo,
    canUndo,
    canRedo,
  } = lumen;
  const isPresentCounting = presentCountdown !== null;
  const themeLabel = theme === "dark" ? "☾ Dark" : "☀ Light";
  const setCountLabel =
    setSongs.length === 1 ? "1 song" : setSongs.length + " songs";
  const hasActiveLineup = !!state.activeLineupId;
  const saveStatusLabel =
    state.saveStatus === "saving" ? "Saving…" : state.saveStatus === "saved" ? "Saved" : "";

  const outputDotClass = outputStatus.active
    ? "bg-ok"
    : hidden
      ? "bg-warn"
      : "bg-border2";
  // Label for detected output state, independent of whether presenting is active.
  const outputLabel =
    outputStatus.active && outputStatus.display
      ? "Output · " + outputStatus.display.label
      : secondaryDisplayAvailable
        ? "Output · Ready"
        : "Output · No display";

  // True when there's a pending update to flag; only "downloaded" is installable.
  const updatePending =
    updateStatus.status === "available" ||
    updateStatus.status === "downloading" ||
    updateStatus.status === "downloaded";
  const updateReady = updateStatus.status === "downloaded";
  const updateLabel =
    updateStatus.status === "downloaded"
      ? "Update " + updateStatus.version + " ready to install"
      : updateStatus.status === "downloading"
        ? "Downloading update… " + Math.round(updateStatus.percent) + "%"
        : updateStatus.status === "available"
          ? "Update " + updateStatus.version + " available"
          : updateStatus.status === "checking"
            ? "Checking for updates…"
            : updateStatus.status === "error"
              ? "Update check failed"
              : "No updates available";
  const updateReleaseNotes =
    updateStatus.status === "available" || updateStatus.status === "downloaded"
      ? updateStatus.releaseNotes
      : null;
  // Headline title for the update card, one per update status.
  const updateCardTitle =
    updateStatus.status === "downloaded"
      ? "Lumen " + updateStatus.version + " ready to install"
      : updateStatus.status === "available"
        ? "Lumen " + updateStatus.version + " available"
        : updateStatus.status === "downloading"
          ? "Downloading update… " + Math.round(updateStatus.percent) + "%"
          : updateStatus.status === "checking"
            ? "Checking for updates…"
            : updateStatus.status === "error"
              ? "Update check failed"
              : "You're up to date";

  const [updatePanelOpen, setUpdatePanelOpen] = useState(false);

  // Shakes the bell icon once when an update newly becomes pending.
  const [isShaking, setIsShaking] = useState(false);
  const previousUpdatePendingRef = useRef(updatePending);
  useEffect(() => {
    const justBecamePending =
      updatePending && !previousUpdatePendingRef.current;
    previousUpdatePendingRef.current = updatePending;
    if (!justBecamePending) return;
    setIsShaking(true);
    const timeout = setTimeout(() => setIsShaking(false), SHAKE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [updatePending]);

  // Clock/date start empty, fill in after mount, then tick every 15s.
  const [clock, setClock] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(formatClock(now));
      setDateLabel(formatDateLabel(now));
    };
    tick();
    const interval = setInterval(tick, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 flex-none flex items-center gap-5 p-[0_16px_0_18px] border-b border-border bg-panel overflow-x-auto">
      {isTablet && (
        <InteractiveButton
          onClick={() => patch((s) => ({ sidebarDrawerOpen: !s.sidebarDrawerOpen }))}
          title="Library"
          className="w-10 h-10 flex-none rounded-2.25 border border-border bg-panel2 text-text cursor-pointer text-[16px]"
        >
          ☰
        </InteractiveButton>
      )}
      <div className={cx("flex items-center gap-2.5 flex-none", isDesktop ? "w-73.5" : "w-auto")}>
        <div className="w-6.5 h-6.5 rounded-2">
          <Image src={"/lumen.png"} width={200} height={200} alt="Lume" />
        </div>
        {/* Name + version badge hidden below desktop width. */}
        {isDesktop && (
          <>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">
              Lumen Worship
            </div>
            <div className="font-mono text-[10px] text-faint border border-border p-[2px_5px] rounded-[5px]">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </div>
          </>
        )}
      </div>

      <div className={cx("relative items-center gap-2 text-[13px] text-muted", isDesktop ? "flex" : "hidden")}>
        <span className="w-1.75 h-1.75 rounded-full bg-ok shadow-[0_0_0_3px_rgba(52,211,153,.16)]" />
        <span className="text-text font-medium">{dateLabel}</span>
        {hasActiveLineup && (
          <>
            <span className="text-faint">·</span>
            <InteractiveButton
              onClick={() => patch((s) => ({ setPanelOpen: !s.setPanelOpen }))}
              className="border-none px-1 py-0.5 -my-0.5 -mx-1 cursor-pointer text-[13px] text-muted rounded-1.5 hover:text-text hover:bg-panel2"
            >
              {state.setName} — {setCountLabel}
            </InteractiveButton>
          </>
        )}
        {hasActiveLineup && state.setPanelOpen && (
          <>
            <div
              onClick={() => patch({ setPanelOpen: false })}
              className="fixed inset-0 z-90"
            />
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-[calc(100%+8px)] left-0 z-100 w-75 rounded-xl border border-border2 bg-panel shadow-app overflow-hidden"
            >
              <div className="p-[10px_14px] border-b border-border text-[11px] font-semibold tracking-[.06em] uppercase text-faint">
                {state.setName} · {setCountLabel}
              </div>
              {setSongs.length === 0 ? (
                <div className="p-[24px_16px] text-center text-muted">
                  <div className="text-[12.5px] font-medium text-text">
                    No songs in this set yet
                  </div>
                  <div className="text-[11.5px] mt-1 leading-normal">
                    Add songs to this lineup from the Lineups tab.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col p-1.5 max-h-70 overflow-y-auto">
                  {setSongs.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        patch({
                          mode: "songs",
                          songId: s.id,
                          idx: 0,
                          setPanelOpen: false,
                        });
                      }}
                      className="flex items-center gap-2.25 w-full p-2 rounded-2 border-none bg-transparent text-text cursor-pointer text-left"
                    >
                      <span className="font-mono text-[10px] text-faint w-4">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-[13px] truncate">
                        {s.title}
                      </span>
                      <span className="font-mono text-[10px] text-faint">
                        {s.key}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {isDesktop && (
        <span className="font-mono text-[13px] text-muted tracking-[.01em] whitespace-nowrap flex-none">{clock}</span>
      )}

      <div className="relative flex items-center gap-2 pl-3.5 border-l border-border">
        {isDesktop && (
          <>
            <InteractiveButton
              onClick={() => patch((s) => ({ globalSearchOpen: !s.globalSearchOpen }))}
              title="Search everything (⌘K)"
              className="h-8.5 w-8.5 flex-none flex items-center justify-center rounded-2.25 border border-border bg-panel2 text-muted text-[14px] cursor-pointer hover:bg-raise hover:text-text"
            >
              ⌕
            </InteractiveButton>

            <InteractiveButton
              onClick={undo}
              disabled={!canUndo}
              title="Undo (⌘Z)"
              className="h-8.5 w-8.5 flex-none flex items-center justify-center rounded-2.25 border border-border bg-panel2 text-muted text-[13px] cursor-pointer hover:bg-raise hover:text-text disabled:opacity-40 disabled:cursor-default disabled:hover:bg-panel2 disabled:hover:text-muted"
            >
              ↶
            </InteractiveButton>
            <InteractiveButton
              onClick={redo}
              disabled={!canRedo}
              title="Redo (⌘⇧Z)"
              className="h-8.5 w-8.5 flex-none flex items-center justify-center rounded-2.25 border border-border bg-panel2 text-muted text-[13px] cursor-pointer hover:bg-raise hover:text-text disabled:opacity-40 disabled:cursor-default disabled:hover:bg-panel2 disabled:hover:text-muted"
            >
              ↷
            </InteractiveButton>
            {/* Save status label: always mounted (faded when empty) to avoid layout shift. */}
            <span
              aria-hidden={saveStatusLabel === "" ? true : undefined}
              className={cx(
                "font-mono text-[10.5px] text-faint w-11.5 flex-none transition-opacity duration-200",
                saveStatusLabel ? "opacity-100" : "opacity-0"
              )}
            >
              {saveStatusLabel || "Saved"}
            </span>

            {state.performanceMode && (
              <span className="h-8.5 flex items-center px-2.5 rounded-2.25 bg-accent-soft text-accent text-[11px] font-semibold">
                Performance
              </span>
            )}

            <InteractiveButton
              onClick={() => patch({ hotkeysOpen: true })}
              title="Keyboard shortcuts"
              className="h-8.5 w-8.5 flex-none flex items-center justify-center rounded-2.25 border border-border bg-panel2 text-muted text-[13px] cursor-pointer hover:bg-raise hover:text-text"
            >
              ?
            </InteractiveButton>
          </>
        )}

        {/* Updates and output-status controls hidden below desktop width. */}
        {isDesktop && (
          <>
            <InteractiveButton
              onClick={() => setUpdatePanelOpen((open) => !open)}
              title={updateLabel}
              className={cx(
                "relative h-8.5 px-3 flex-none flex items-center rounded-2.25 border border-border bg-panel2 text-[13px] text-muted cursor-pointer hover:bg-raise hover:text-text",
                isShaking && "animate-[bellShake_0.65s_ease-in-out]",
              )}
            >
              Updates
              {updatePending && (
                <span
                  className={cx(
                    "absolute -top-1 -right-1 w-2.25 h-2.25 rounded-full ring-2 ring-panel",
                    updateReady ? "bg-ok" : "bg-danger",
                  )}
                />
              )}
            </InteractiveButton>

            {updatePanelOpen && (
              <>
                <div
                  onClick={() => setUpdatePanelOpen(false)}
                  className="fixed inset-0 z-90"
                />
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-[calc(100%+10px)] left-0 z-100 w-75 rounded-2xl border border-border2 bg-panel shadow-app p-4.5"
                >
                  <div className="text-[15px] font-semibold text-text tracking-[-0.01em] leading-[1.35]">
                    {updateCardTitle}
                  </div>
                  <div className="mt-2 max-h-52 overflow-y-auto">
                    {updateReleaseNotes ? (
                      // Renders the release notes markdown.
                      <div className="text-[13px] text-muted leading-[1.55] [&_h1]:text-text [&_h2]:text-text [&_h3]:text-text [&_h1]:text-[13.5px] [&_h2]:text-[13px] [&_h3]:text-[13px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:mb-1.5 [&_h2]:mb-1.5 [&_h3]:mb-1.5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4.5 [&_ul]:mb-2 [&_li]:mb-1 [&_a]:text-accent [&_a]:underline [&_strong]:text-text [&_code]:font-mono [&_code]:text-[12px] [&_code]:bg-panel2 [&_code]:px-1 [&_code]:py-px [&_code]:rounded-1">
                        <ReleaseNotesMarkdown>
                          {updateReleaseNotes}
                        </ReleaseNotesMarkdown>
                      </div>
                    ) : (
                      <div className="text-[13px] text-muted leading-[1.55]">
                        {updateStatus.status === "checking"
                          ? "Checking GitHub for a newer version…"
                          : updateStatus.status === "downloading"
                            ? "Downloading the update in the background. You can keep working — it installs when you're ready."
                            : updateStatus.status === "error"
                              ? "Couldn't check for updates. Lumen will try again on next launch."
                              : "You're on the latest version — v" +
                                process.env.NEXT_PUBLIC_APP_VERSION +
                                "."}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 mt-4">
                    {updateReady && (
                      <button
                        onClick={() => {
                          installUpdate();
                          setUpdatePanelOpen(false);
                        }}
                        className="h-9.5 px-4 rounded-2.5 border-none bg-accent text-white text-[13px] font-semibold cursor-pointer shadow-app-sm hover:brightness-110"
                      >
                        Install &amp; restart
                      </button>
                    )}
                    <button
                      onClick={() => setUpdatePanelOpen(false)}
                      className="h-9.5 px-4 rounded-2.5 border border-border2 bg-transparent text-muted text-[13px] font-medium cursor-pointer hover:bg-panel2 hover:text-text"
                    >
                      {updateReady ? "Later" : "Close"}
                    </button>
                  </div>
                </div>
              </>
            )}

            <InteractiveButton
              onClick={() => patch({ displaysModalOpen: true })}
              title="Configure second-monitor output"
              className="flex items-center gap-2 p-[6px_10px] border border-border rounded-2.25 bg-panel2 text-[12px] text-muted cursor-pointer hover:bg-raise hover:text-text"
            >
              <span className={cx("w-1.5 h-1.5 rounded-full", outputDotClass)} />
              {outputLabel}
            </InteractiveButton>
          </>
        )}

        <InteractiveButton
          onClick={() => patch({ theme: theme === "dark" ? "light" : "dark" })}
          className="h-8.5 px-3 rounded-2.25 border border-border bg-panel2 text-[13px] text-muted cursor-pointer hover:bg-raise hover:text-text"
        >
          {themeLabel}
        </InteractiveButton>

        <InteractiveButton
          onClick={() => patch({ settingsOpen: true })}
          className="h-8.5 px-3 rounded-2.25 border border-border bg-panel2 text-[13px] text-muted cursor-pointer hover:bg-raise hover:text-text"
        >
          Settings
        </InteractiveButton>

        <InteractiveButton
          data-tour="present"
          // Cancels the countdown if presenting/counting, otherwise starts presenting.
          onClick={isPresenting || isPresentCounting ? stopPresenting : startPresenting}
          className={cx(
            "h-8.5 px-4 rounded-2.25 text-[13px] cursor-pointer flex items-center gap-2",
            isPresenting || isPresentCounting
              ? "border border-border2 bg-raise text-muted font-medium"
              : "border-none bg-accent text-white font-semibold shadow-app-sm hover:brightness-110"
          )}
        >
          {isPresentCounting ? (
            <span className="inline-flex items-center gap-2">
              <span>Starting in</span>
              <span
                key={presentCountdown}
                className="font-mono text-[15px] font-bold inline-block animate-[lumenPresentTick_.7s_ease]"
              >
                {presentCountdown}
              </span>
            </span>
          ) : (
            <>
              {isPresenting ? "Stop Presenting" : "Present"}
              {!isPresenting && <span className="font-mono text-[10px] opacity-70">F5</span>}
            </>
          )}
        </InteractiveButton>
      </div>
    </header>
  );
}
