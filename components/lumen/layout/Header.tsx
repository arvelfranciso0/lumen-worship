"use client";

import { InteractiveButton } from "../ui/Interactive";
import type { UseLumen } from "../useLumen";
import type { Breakpoint } from "../hooks/useViewportBreakpoint";
import { useHeaderClock } from "./header/useHeaderClock";
import { HeaderBrand } from "./header/HeaderBrand";
import { HeaderSetSwitcher } from "./header/HeaderSetSwitcher";
import { HeaderSaveStatus } from "./header/HeaderSaveStatus";
import { HeaderUpdatePanel } from "./header/HeaderUpdatePanel";
import { HeaderOutputButton } from "./header/HeaderOutputButton";
import { HeaderPresentButton } from "./header/HeaderPresentButton";

export function Header({ lumen, breakpoint }: { lumen: UseLumen; breakpoint: Breakpoint }) {
  const isTablet = breakpoint === "tablet";
  const isDesktop = breakpoint === "desktop";
  const {
    state,
    patch,
    theme,
    hidden,
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
  const themeLabel = theme === "dark" ? "☾ Dark" : "☀ Light";
  const saveStatusLabel =
    state.saveStatus === "saving" ? "Saving…" : state.saveStatus === "saved" ? "Saved" : "";

  const { clock, dateLabel } = useHeaderClock();

  return (
    <header className="h-14 flex-none flex items-center gap-5 p-[0_16px_0_18px] border-b border-border bg-panel">
      {isTablet && (
        <InteractiveButton
          onClick={() => patch((previousState) => ({ sidebarDrawerOpen: !previousState.sidebarDrawerOpen }))}
          title="Library"
          className="w-10 h-10 flex-none rounded-2.25 border border-border bg-panel2 text-text cursor-pointer text-[16px]"
        >
          ☰
        </InteractiveButton>
      )}

      {/* Scoped here (not on <header>) so overflow-x doesn't force overflow-y auto and clip popovers in the control bar below. */}
      <div className="flex items-center gap-5 min-w-0 overflow-x-auto">
        <HeaderBrand isDesktop={isDesktop} />

        <HeaderSetSwitcher lumen={lumen} isDesktop={isDesktop} dateLabel={dateLabel} />
      </div>

      <div className="flex-1" />

      {isDesktop && (
        <span className="font-mono text-[13px] text-muted tracking-[.01em] whitespace-nowrap flex-none">{clock}</span>
      )}

      <div className="relative flex items-center gap-2 pl-3.5 border-l border-border">
        {isDesktop && (
          <>
            <InteractiveButton
              onClick={() => patch((previousState) => ({ globalSearchOpen: !previousState.globalSearchOpen }))}
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
            <HeaderSaveStatus label={saveStatusLabel} />

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
            <HeaderUpdatePanel updateStatus={updateStatus} installUpdate={installUpdate} />

            <HeaderOutputButton
              outputStatus={outputStatus}
              hidden={hidden}
              secondaryDisplayAvailable={secondaryDisplayAvailable}
              onOpenDisplaysModal={() => patch({ displaysModalOpen: true })}
            />
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

        <HeaderPresentButton
          isPresenting={isPresenting}
          presentCountdown={presentCountdown}
          startPresenting={startPresenting}
          stopPresenting={stopPresenting}
        />
      </div>
    </header>
  );
}
