"use client";

import type { UseLumen } from "./useLumen";

export function PresentationOverlay({ v }: { v: UseLumen }) {
  const { state, cur, hidden, look } = v;
  if (!state.presenting) return null;

  const stageLines = hidden ? [] : cur.lines;
  const hasStageCaption = !!cur.caption && !hidden;
  const fit = cur.lines.reduce((m, l) => Math.max(m, l.length), 0) > 110 ? 0.62
    : cur.lines.reduce((m, l) => Math.max(m, l.length), 0) > 70 ? 0.78 : 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: state.black ? "#000" : look.css }} />
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: "2.2vh", padding: "8vh 10vw", textAlign: "center", zIndex: 1,
      }}>
        {stageLines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: v.lyricFamily, fontSize: 4.4 * state.scale * fit + "vw", lineHeight: 1.24,
              fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 4px 60px rgba(0,0,0,.55)",
            }}
          >
            {line}
          </div>
        ))}
        {hasStageCaption && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.5vw", letterSpacing: ".12em", marginTop: "3vh", color: "rgba(255,255,255,.55)" }}>
            {cur.caption}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 18, right: 22, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,.16)" }}>Esc</div>
    </div>
  );
}
