"use client";

import { CSSProperties } from "react";
import { Header } from "./Header";
import { LineupModal } from "./LineupModal";
import { LyricsEditorModal } from "./LyricsEditorModal";
import { MainPanel } from "./MainPanel";
import { PresentationOverlay } from "./PresentationOverlay";
import { Sidebar } from "./Sidebar";
import { SettingsModal } from "./SettingsModal";
import { SlidesStrip } from "./SlidesStrip";
import { SongUploadModal } from "./SongUploadModal";
import { Toolbar } from "./Toolbar";
import { useLumen, type LumenProps } from "./useLumen";

export function LumenApp(props: LumenProps) {
  const v = useLumen(props);

  const accentVars: CSSProperties = {
    ["--accent" as string]: v.accent,
    ["--accent-soft" as string]: v.accent + "26",
  };

  return (
    <div data-theme={v.theme} style={accentVars} className="h-screen min-w-[1280px] flex flex-col bg-bg text-text overflow-hidden">
      <Header v={v} />
      <div className="flex-1 flex min-h-0">
        <Sidebar v={v} />
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <MainPanel v={v} />
          <SlidesStrip v={v} />
          <Toolbar v={v} />
        </main>
      </div>
      <SettingsModal v={v} />
      <LyricsEditorModal v={v} />
      <LineupModal v={v} />
      <SongUploadModal v={v} />
      <PresentationOverlay v={v} />
    </div>
  );
}
