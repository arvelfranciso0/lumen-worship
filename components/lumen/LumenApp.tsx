"use client";

import { CSSProperties } from "react";
import { Header } from "./Header";
import { LineupModal } from "./LineupModal";
import { LyricsEditorModal } from "./LyricsEditorModal";
import { MainPanel } from "./MainPanel";
import { PresentationOverlay } from "./PresentationOverlay";
import { ResizeHandle } from "./ResizeHandle";
import { Sidebar } from "./Sidebar";
import { SettingsModal } from "./SettingsModal";
import { SlidesStrip } from "./SlidesStrip";
import { SongUploadModal } from "./SongUploadModal";
import { Toolbar } from "./Toolbar";
import { useLumen, type LumenProps } from "./useLumen";

export function LumenApp(props: LumenProps) {
  const lumen = useLumen(props);

  const accentVars: CSSProperties = {
    ["--accent" as string]: lumen.accent,
    ["--accent-soft" as string]: lumen.accent + "26",
  };

  return (
    <div data-theme={lumen.theme} style={accentVars} className="h-screen min-w-[1280px] flex flex-col bg-bg text-text overflow-hidden">
      <Header lumen={lumen} />
      <div className="flex-1 flex min-h-0">
        {lumen.state.layoutVisibility.sidebar && (
          <>
            <Sidebar lumen={lumen} />
            <ResizeHandle
              axis="horizontal"
              onResizeDelta={(deltaPixels) => lumen.adjustLayoutSize("sidebarWidth", deltaPixels)}
            />
          </>
        )}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <MainPanel lumen={lumen} />
          {lumen.state.layoutVisibility.slidesStrip && <SlidesStrip lumen={lumen} />}
          <Toolbar lumen={lumen} />
        </main>
      </div>
      <SettingsModal lumen={lumen} />
      <LyricsEditorModal lumen={lumen} />
      <LineupModal lumen={lumen} />
      <SongUploadModal lumen={lumen} />
      <PresentationOverlay lumen={lumen} />
    </div>
  );
}
