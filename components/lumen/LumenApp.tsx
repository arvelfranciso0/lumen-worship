"use client";

import dynamic from "next/dynamic";
import { CSSProperties } from "react";
import { Header } from "./Header";
import { MainPanel } from "./MainPanel";
import { MobileTabBar } from "./MobileTabBar";
import { PreviewPanel } from "./PreviewPanel";
import { ResizeHandle } from "./ResizeHandle";
import { Sidebar } from "./Sidebar";
import { useLumen, type LumenProps } from "./useLumen";
import { useViewportBreakpoint } from "./useViewportBreakpoint";

// Lazily loads each modal/overlay so its code splits into its own chunk.
const SettingsModal = dynamic(() => import("./SettingsModal").then((mod) => mod.SettingsModal), { ssr: false });
const SongEditorModal = dynamic(() => import("./SongEditorModal").then((mod) => mod.SongEditorModal), { ssr: false });
const LineupModal = dynamic(() => import("./LineupModal").then((mod) => mod.LineupModal), { ssr: false });
const PresentationOverlay = dynamic(() => import("./PresentationOverlay").then((mod) => mod.PresentationOverlay), { ssr: false });
const TourOverlay = dynamic(() => import("./TourOverlay").then((mod) => mod.TourOverlay), { ssr: false });
const ConfirmDialog = dynamic(() => import("./ConfirmDialog").then((mod) => mod.ConfirmDialog), { ssr: false });
const HotkeysModal = dynamic(() => import("./HotkeysModal").then((mod) => mod.HotkeysModal), { ssr: false });
const DisplaysModal = dynamic(() => import("./DisplaysModal").then((mod) => mod.DisplaysModal), { ssr: false });
const BibleTranslationsPanel = dynamic(() => import("./BibleTranslationsPanel").then((mod) => mod.BibleTranslationsPanel), { ssr: false });
const GlobalSearchModal = dynamic(() => import("./GlobalSearchModal").then((mod) => mod.GlobalSearchModal), { ssr: false });

export function LumenApp(props: LumenProps) {
  const lumen = useLumen(props);
  const breakpoint = useViewportBreakpoint();
  const isDesktop = breakpoint === "desktop";
  const isMobile = breakpoint === "mobile";
  const isTablet = breakpoint === "tablet";

  const accentVars: CSSProperties = {
    ["--accent" as string]: lumen.accent,
    ["--accent-soft" as string]: lumen.accent + "26",
  };

  // Hiding a panel collapses it to a one-click vertical strip rather than removing it.
  const sidebarShown = lumen.state.layoutVisibility.sidebar;
  const previewShown = lumen.state.layoutVisibility.preview;

  // Sidebar display mode by breakpoint: inline sibling, overlay drawer, or full body.
  const showInlineSidebar = isDesktop && sidebarShown;
  const showDrawerSidebar = isTablet && lumen.state.sidebarDrawerOpen;
  const showMobileSidebar = isMobile && lumen.state.mobileView === "library";
  const showMain = !isMobile || lumen.state.mobileView === "slides";
  const showPreview = !isMobile ? previewShown : lumen.state.mobileView === "live";

  return (
    <div data-theme={lumen.theme} style={accentVars} className="h-screen min-w-80 flex flex-col bg-bg text-text overflow-hidden">
      <Header lumen={lumen} breakpoint={breakpoint} />
      <div className="flex-1 flex min-h-0 relative">
        {showDrawerSidebar && (
          <div
            onClick={() => lumen.patch({ sidebarDrawerOpen: false })}
            className="fixed inset-x-0 top-14 bottom-0 z-55 bg-[rgba(6,6,8,.55)]"
          />
        )}

        {showInlineSidebar && <Sidebar lumen={lumen} breakpoint={breakpoint} />}

        {showDrawerSidebar && (
          <div className="fixed top-14 left-0 bottom-0 z-60 shadow-app flex">
            <Sidebar lumen={lumen} breakpoint={breakpoint} />
          </div>
        )}

        {showMobileSidebar && <Sidebar lumen={lumen} breakpoint={breakpoint} />}

        {isDesktop && (sidebarShown ? (
          <ResizeHandle
            axis="horizontal"
            onResizeDelta={(deltaPixels) => lumen.adjustLayoutSize("sidebarWidth", deltaPixels)}
          />
        ) : (
          <button
            onClick={() => lumen.toggleLayoutPanel("sidebar")}
            title="Show Library panel"
            className="w-5 flex-none bg-panel2 border-r border-border text-faint cursor-pointer [writing-mode:vertical-rl] text-[10px] font-semibold tracking-[.06em] uppercase py-2.5 hover:text-text hover:bg-raise"
          >
            Library
          </button>
        ))}

        {showMain && (
          <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-panel">
            <MainPanel lumen={lumen} />
          </main>
        )}

        {isDesktop && (previewShown ? (
          <ResizeHandle
            axis="horizontal"
            onResizeDelta={(deltaPixels) => lumen.adjustLayoutSize("previewWidth", -deltaPixels)}
          />
        ) : (
          <button
            onClick={() => lumen.toggleLayoutPanel("preview")}
            title="Show Preview panel"
            className="w-5 flex-none self-stretch bg-panel2 border-l border-border text-faint cursor-pointer [writing-mode:vertical-rl] text-[10px] font-semibold tracking-[.06em] uppercase py-2.5 hover:text-text hover:bg-raise"
          >
            Preview
          </button>
        ))}

        {showPreview && <PreviewPanel lumen={lumen} breakpoint={breakpoint} />}
      </div>
      {isMobile && <MobileTabBar lumen={lumen} />}
      {lumen.state.settingsOpen && <SettingsModal lumen={lumen} />}
      {lumen.state.songEditorOpen && <SongEditorModal lumen={lumen} />}
      {lumen.state.lineupModalOpen && <LineupModal lumen={lumen} />}
      {lumen.state.presenting && <PresentationOverlay lumen={lumen} />}
      {/* Stays mounted so it can decide on its own when to auto-start. */}
      <TourOverlay lumen={lumen} />
      {lumen.state.confirmDialog && <ConfirmDialog lumen={lumen} />}
      {lumen.state.hotkeysOpen && <HotkeysModal lumen={lumen} />}
      {lumen.state.displaysModalOpen && <DisplaysModal lumen={lumen} />}
      {lumen.state.bibleTranslationsPanelOpen && <BibleTranslationsPanel lumen={lumen} />}
      {lumen.state.globalSearchOpen && <GlobalSearchModal lumen={lumen} />}
    </div>
  );
}
