"use client";

import type { UseLumen } from "./useLumen";

export function SlidesStrip({ v }: { v: UseLumen }) {
  const { slides, idx, patch, look } = v;

  return (
    <div style={{ flex: "none", borderTop: "1px solid var(--border)", background: "var(--panel2)", padding: "12px 22px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>Slides</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>{idx + 1} / {slides.length}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Click a slide to go live</span>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
        {slides.map((s, i) => (
          <div
            key={i}
            onClick={() => patch({ idx: i, black: false, blank: false })}
            style={{
              width: 132, flex: "none", borderRadius: 10, overflow: "hidden", cursor: "pointer",
              border: "1px solid " + (i === idx ? "var(--accent)" : "var(--border)"),
              background: "var(--panel)", boxShadow: i === idx ? "0 0 0 3px var(--accent-soft)" : "none",
            }}
          >
            <div style={{
              height: 74, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 2, padding: "6px 8px", background: look.css,
            }}>
              {s.lines.map((l, j) => (
                <div key={j} style={{ fontSize: 6.5, lineHeight: 1.5, fontWeight: 500, textAlign: "center", color: "#fff", opacity: 0.92 }}>
                  {l}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 7px 6px" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: i === idx ? "var(--accent)" : "var(--muted)" }}>
                {s.label}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--faint)" }}>{i + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
