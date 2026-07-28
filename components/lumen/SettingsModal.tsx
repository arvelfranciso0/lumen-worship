"use client";

import { LOOKS } from "./data";
import { InteractiveButton } from "./Interactive";
import type { UseLumen } from "./useLumen";

export function SettingsModal({ v }: { v: UseLumen }) {
  const { state, patch } = v;
  if (!state.settingsOpen) return null;

  const close = () => patch({ settingsOpen: false });
  const sizePct = Math.round(((state.scale - 0.7) / 0.8) * 100);

  return (
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(6,6,8,.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 620, borderRadius: 18, border: "1px solid var(--border2)", background: "var(--panel)", boxShadow: "var(--shadow)", overflow: "hidden", animation: "fadeUp .18s ease both" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>Presentation settings</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>Applies to the audience display only.</div>
          </div>
          <InteractiveButton
            onClick={close}
            base={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel2)", color: "var(--muted)", cursor: "pointer" }}
            hover={{ color: "var(--text)", background: "var(--raise)" }}
          >
            ✕
          </InteractiveButton>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 9 }}>Background</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {LOOKS.map((lk) => {
                const on = lk.id === state.look;
                return (
                  <button
                    key={lk.id}
                    onClick={() => patch({ look: lk.id })}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: 8, borderRadius: 12,
                      cursor: "pointer", border: "1px solid " + (on ? "var(--accent)" : "var(--border)"),
                      background: on ? "var(--accent-soft)" : "var(--panel2)", color: "var(--text)",
                    }}
                  >
                    <span style={{ width: "100%", height: 56, borderRadius: 8, background: lk.css, border: "1px solid var(--border)" }} />
                    <span style={{ fontSize: 11.5 }}>{lk.name}</span>
                    <span style={{ fontSize: 10, color: "var(--faint)" }}>{lk.kind}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 9 }}>Typeface</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => patch({ font: "sans" })}
                  style={{ flex: 1, height: 36, borderRadius: 9, cursor: "pointer", fontSize: 13, border: "1px solid " + (state.font === "sans" ? "var(--accent)" : "var(--border)"), background: state.font === "sans" ? "var(--accent-soft)" : "var(--panel2)", color: "var(--text)" }}
                >
                  Sans
                </button>
                <button
                  onClick={() => patch({ font: "serif" })}
                  style={{ flex: 1, height: 36, borderRadius: 9, cursor: "pointer", fontSize: 15, fontFamily: "var(--font-serif)", border: "1px solid " + (state.font === "serif" ? "var(--accent)" : "var(--border)"), background: state.font === "serif" ? "var(--accent-soft)" : "var(--panel2)", color: "var(--text)" }}
                >
                  Serif
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 9 }}>Lyric size</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => patch((s) => ({ scale: Math.max(0.7, +(s.scale - 0.1).toFixed(2)) }))}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel2)", cursor: "pointer", color: "var(--muted)", fontSize: 12 }}
                >
                  A−
                </button>
                <div style={{ flex: 1, height: 6, borderRadius: 6, background: "var(--raise)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: sizePct + "%", background: "var(--accent)" }} />
                </div>
                <button
                  onClick={() => patch((s) => ({ scale: Math.min(1.5, +(s.scale + 0.1).toFixed(2)) }))}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel2)", cursor: "pointer", color: "var(--muted)", fontSize: 15 }}
                >
                  A+
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel2)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Show chord symbols on operator view</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Never sent to the audience display.</div>
            </div>
            <button
              onClick={() => patch((s) => ({ chords: !s.chords }))}
              style={{ width: 44, height: 26, borderRadius: 20, border: "none", cursor: "pointer", padding: 3, display: "flex", justifyContent: state.chords ? "flex-end" : "flex-start", background: state.chords ? "var(--accent)" : "var(--border2)" }}
            >
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, padding: "14px 20px", borderTop: "1px solid var(--border)", background: "var(--panel2)" }}>
          <InteractiveButton
            onClick={close}
            base={{ height: 36, padding: "0 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel)", fontSize: 13, color: "var(--muted)", cursor: "pointer" }}
            hover={{ color: "var(--text)" }}
          >
            Cancel
          </InteractiveButton>
          <button onClick={close} style={{ height: 36, padding: "0 16px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
