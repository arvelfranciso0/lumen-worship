"use client";

import { LOOKS } from "./data";
import { InteractiveButton } from "./Interactive";
import type { UseLumen } from "./useLumen";

export function Toolbar({ v }: { v: UseLumen }) {
  const { state, patch, go, toolBtn } = v;

  const smaller = () => patch((s) => ({ scale: Math.max(0.7, +(s.scale - 0.1).toFixed(2)) }));
  const bigger = () => patch((s) => ({ scale: Math.min(1.5, +(s.scale + 0.1).toFixed(2)) }));
  const fontPct = Math.round(state.scale * 100) + "%";

  return (
    <div style={{ flex: "none", height: 84, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", borderTop: "1px solid var(--border)", background: "var(--panel)", overflowX: "auto" }}>
      <InteractiveButton
        onClick={() => go(-1)}
        base={{ height: 52, padding: "0 22px", borderRadius: 12, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border2)", background: "var(--raise)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
        hover={{ borderColor: "var(--accent)", background: "var(--panel2)" }}
        active={{ transform: "translateY(1px)" }}
      >
        ← Previous
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)" }}>←</span>
      </InteractiveButton>

      <InteractiveButton
        onClick={() => go(1)}
        base={{ height: 52, padding: "0 26px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--shadow-sm)" }}
        hover={{ filter: "brightness(1.1)" }}
        active={{ transform: "translateY(1px)" }}
      >
        Next →
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.7 }}>Space</span>
      </InteractiveButton>

      <div style={{ width: 1, height: 36, background: "var(--border)", margin: "0 4px" }} />

      <button onClick={() => patch((s) => ({ blank: !s.blank, black: false }))} style={toolBtn(state.blank, "var(--warn)")}>Blank</button>
      <button onClick={() => patch((s) => ({ black: !s.black, blank: false }))} style={toolBtn(state.black, "#000")}>Black</button>

      <div style={{ width: 1, height: 36, background: "var(--border)", margin: "0 4px" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>Look</span>
        <div style={{ display: "flex", gap: 6 }}>
          {LOOKS.map((lk) => {
            const on = lk.id === state.look;
            return (
              <button
                key={lk.id}
                onClick={() => patch({ look: lk.id })}
                title={lk.name}
                style={{
                  height: 36, padding: "0 11px", borderRadius: 9, fontSize: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  border: "1px solid " + (on ? "var(--accent)" : "var(--border)"),
                  background: on ? "var(--accent-soft)" : "var(--panel2)",
                  color: on ? "var(--text)" : "var(--muted)", fontWeight: on ? 600 : 400,
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 4, background: lk.swatch, border: "1px solid rgba(255,255,255,.12)" }} />
                {lk.name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ width: 1, height: 36, background: "var(--border)", margin: "0 4px" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)", marginRight: 2 }}>Size</span>
        <button onClick={smaller} style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel2)", fontSize: 12, cursor: "pointer", color: "var(--muted)" }}>A−</button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, width: 44, textAlign: "center", color: "var(--text)" }}>{fontPct}</span>
        <button onClick={bigger} style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel2)", fontSize: 15, cursor: "pointer", color: "var(--muted)" }}>A+</button>
      </div>

      <div style={{ flex: 1 }} />

      <InteractiveButton
        onClick={() => patch({ presenting: true })}
        base={{ height: 52, padding: "0 22px", borderRadius: 12, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border2)", background: "var(--panel2)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
        hover={{ borderColor: "var(--accent)", color: "var(--accent)" }}
      >
        ⛶ Fullscreen presentation
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)" }}>F5</span>
      </InteractiveButton>
    </div>
  );
}
