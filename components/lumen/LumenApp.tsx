"use client";

import { CSSProperties } from "react";
import { BibleTranslationsPanel } from "./BibleTranslationsPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { DisplaysModal } from "./DisplaysModal";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { Header } from "./Header";
import { HotkeysModal } from "./HotkeysModal";
import { LineupModal } from "./LineupModal";
import { MainPanel } from "./MainPanel";
import { MobileTabBar } from "./MobileTabBar";
import { PresentationOverlay } from "./PresentationOverlay";
import { PreviewPanel } from "./PreviewPanel";
import { ResizeHandle } from "./ResizeHandle";
import { Sidebar } from "./Sidebar";
import { SettingsModal } from "./SettingsModal";
import { SongEditorModal } from "./SongEditorModal";
import { TourOverlay } from "./TourOverlay";
import { useLumen, type LumenProps } from "./useLumen";
import { useViewportBreakpoint } from "./useViewportBreakpoint";

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
      <SettingsModal lumen={lumen} />
      <SongEditorModal lumen={lumen} />
      <LineupModal lumen={lumen} />
      <PresentationOverlay lumen={lumen} />
      <TourOverlay lumen={lumen} />
      <ConfirmDialog lumen={lumen} />
      <HotkeysModal lumen={lumen} />
      <DisplaysModal lumen={lumen} />
      <BibleTranslationsPanel lumen={lumen} />
      <GlobalSearchModal lumen={lumen} />
    </div>
  );
}
