"use client";

import { InteractiveButton } from "./Interactive";
import type { UseLumen } from "./useLumen";

export function Header({ v }: { v: UseLumen }) {
  const { state, patch, theme, hidden, setSongs, activateLineup } = v;
  const themeLabel = theme === "dark" ? "☾ Dark" : "☀ Light";
  const outputDot = hidden ? "var(--warn)" : "var(--ok)";
  const setCountLabel = setSongs.length === 1 ? "1 song" : setSongs.length + " songs";

  return (
    <header style={{
      height: 56, flex: "none", display: "flex", alignItems: "center", gap: 20,
      padding: "0 16px 0 18px", borderBottom: "1px solid var(--border)", background: "var(--panel)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: 294, flex: "none" }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, background: "var(--accent)",
          boxShadow: "0 0 0 1px rgba(255,255,255,.08) inset",
        }} />
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Lumen</div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)",
          border: "1px solid var(--border)", padding: "2px 5px", borderRadius: 5,
        }}>v2.4</div>
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%", background: "var(--ok)",
          boxShadow: "0 0 0 3px rgba(52,211,153,.16)",
        }} />
        <span style={{ color: "var(--text)", fontWeight: 500 }}>Sunday Gathering</span>
        <span style={{ color: "var(--faint)" }}>·</span>
        <InteractiveButton
          onClick={() => patch((s) => ({ setPanelOpen: !s.setPanelOpen }))}
          base={{ background: "none", border: "none", padding: "2px 4px", margin: "-2px -4px", cursor: "pointer", fontSize: 13, color: "var(--muted)", borderRadius: 6 }}
          hover={{ color: "var(--text)", background: "var(--panel2)" }}
        >
          {state.setName} — {setCountLabel}
        </InteractiveButton>
        <span style={{ color: "var(--faint)" }}>·</span>
        <span style={{ fontFamily: "var(--font-mono)" }}>10:00 AM</span>

        {state.setPanelOpen && (
          <>
            <div onClick={() => patch({ setPanelOpen: false })} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100, width: 300,
                borderRadius: 12, border: "1px solid var(--border2)", background: "var(--panel)",
                boxShadow: "var(--shadow)", overflow: "hidden",
              }}
            >
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>
                {state.setName} · {setCountLabel}
              </div>
              {setSongs.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)" }}>No songs in this set yet</div>
                  <div style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.5 }}>
                    Open a song and click “Add to set” to add it here.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", padding: 6, maxHeight: 280, overflowY: "auto" }}>
                  {setSongs.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => { patch({ mode: "songs", songId: s.id, idx: 0, black: false, blank: false, setPanelOpen: false }); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 8px", borderRadius: 8,
                        border: "none", background: "transparent", color: "var(--text)", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)", width: 16 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)" }}>{s.key}</span>
                    </button>
                  ))}
                </div>
              )}
              {state.lineups.length > 0 && (
                <>
                  <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>
                    Saved lineups
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", padding: "0 6px 6px", maxHeight: 160, overflowY: "auto" }}>
                    {state.lineups.map((lu) => (
                      <button
                        key={lu.id}
                        onClick={() => activateLineup(lu.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 8px", borderRadius: 8,
                          border: "none", background: "transparent", color: "var(--text)", cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lu.name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)" }}>
                          {lu.songIds.length === 1 ? "1 song" : lu.songIds.length + " songs"}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
          border: "1px solid var(--border)", borderRadius: 9, background: "var(--panel2)",
          fontSize: 12, color: "var(--muted)",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: outputDot }} />
          Output · Display 2 <span style={{ fontFamily: "var(--font-mono)", color: "var(--faint)" }}>1920×1080</span>
        </div>

        <InteractiveButton
          onClick={() => patch({ theme: theme === "dark" ? "light" : "dark" })}
          base={{ height: 34, padding: "0 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel2)", fontSize: 13, color: "var(--muted)", cursor: "pointer" }}
          hover={{ background: "var(--raise)", color: "var(--text)" }}
        >
          {themeLabel}
        </InteractiveButton>

        <InteractiveButton
          onClick={() => patch({ settingsOpen: true })}
          base={{ height: 34, padding: "0 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel2)", fontSize: 13, color: "var(--muted)", cursor: "pointer" }}
          hover={{ background: "var(--raise)", color: "var(--text)" }}
        >
          Settings
        </InteractiveButton>

        <InteractiveButton
          onClick={() => patch({ presenting: true })}
          base={{
            height: 34, padding: "0 16px", borderRadius: 9, border: "none", background: "var(--accent)",
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "var(--shadow-sm)",
            display: "flex", alignItems: "center", gap: 8,
          }}
          hover={{ filter: "brightness(1.1)" }}
        >
          Present
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.7 }}>F5</span>
        </InteractiveButton>
      </div>
    </header>
  );
}
