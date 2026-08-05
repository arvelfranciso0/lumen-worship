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

// Each of these is a modal/overlay that is closed far more often than it is
// open (some — Settings, the Song editor, Lineups, Hotkeys, Displays, Bible
// translations, global search — are never even mounted until the operator
// explicitly opens them; see the `xOpen &&` guards below). Loading them via
// next/dynamic instead of a static import keeps their code out of the bundle
// that's parsed/compiled on every launch, splitting it into its own chunk
// fetched only the first time it's actually rendered.
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

  // Hiding a panel from Settings doesn't make it disappear on desktop — it
  // collapses to a one-click vertical strip on the edge it used to occupy, so
  // getting it back never means opening Settings again.
  const sidebarShown = lumen.state.layoutVisibility.sidebar;
  const previewShown = lumen.state.layoutVisibility.preview;

  // Desktop: sidebar is an inline flex sibling. Tablet: it becomes a fixed
  // overlay drawer, toggled from Header's hamburger. Mobile: it fills the
  // whole body, switched to via MobileTabBar (no backdrop needed — it's the
  // only pane showing).
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
      {/* Not gated on a single boolean like the others — it decides on its own,
          from useLumen's prefsLoaded/tourSeen state, whether to auto-start the
          very first time a mode is visited, so it must stay mounted to make
          that call. Still dynamically imported above for its own chunk. */}
      <TourOverlay lumen={lumen} />
      {lumen.state.confirmDialog && <ConfirmDialog lumen={lumen} />}
      {lumen.state.hotkeysOpen && <HotkeysModal lumen={lumen} />}
      {lumen.state.displaysModalOpen && <DisplaysModal lumen={lumen} />}
      {lumen.state.bibleTranslationsPanelOpen && <BibleTranslationsPanel lumen={lumen} />}
      {lumen.state.globalSearchOpen && <GlobalSearchModal lumen={lumen} />}
    </div>
  );
}
