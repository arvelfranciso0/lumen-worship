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

  const rootStyle: CSSProperties = {
    height: "100vh", minWidth: 1280, display: "flex", flexDirection: "column",
    background: "var(--bg)", color: "var(--text)", overflow: "hidden",
    ["--accent" as string]: v.accent,
    ["--accent-soft" as string]: v.accent + "26",
  };

  return (
    <div data-theme={v.theme} style={rootStyle}>
      <Header v={v} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar v={v} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
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
