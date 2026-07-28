"use client";

import { InteractiveButton } from "./Interactive";
import type { UseLumen } from "./useLumen";

export function MainPanel({ v }: { v: UseLumen }) {
  const { state, patch, bible, song, cur, nxt, prv, idx, slides, hidden, look, canvas, pill, bigLine, lyricFamily, vnum, ref, inSet, toggleSetSong } = v;

  const loadedLabel = bible ? "Scripture" : "Now loaded";
  const editLabel = bible ? "Edit passage" : "Edit lyrics";
  const setLabel = inSet ? "In set ✓" : "Add to set";
  const curTitle = bible ? ref : song.title;
  const curArtist = bible ? state.trans + " · King James, public domain" : song.artist;
  const curMetaA = bible ? "v" + vnum(idx) : "Key " + song.key;
  const curBpm = bible ? v.passage.length + " verses" : song.bpm;
  const slideCounter = idx + 1 + " / " + slides.length;
  const liveState = state.black ? "BLACK" : state.blank ? "BLANK" : "LYRICS";

  const bgStyle = { position: "absolute" as const, inset: 0, background: state.black ? "#000" : look.css };
  const curCanvasStyle = { ...canvas("10px"), opacity: hidden ? 0 : 1, transition: "opacity .18s ease" };
  const prevCanvasStyle = canvas("4px");
  const nextCanvasStyle = canvas("5px");
  const smallLineStyle = { fontFamily: lyricFamily, fontSize: "11px", lineHeight: 1.4, color: "var(--muted)", fontWeight: 500 };
  const nextLineStyle = { fontFamily: lyricFamily, fontSize: "13px", lineHeight: 1.4, fontWeight: 600, color: "#fff" };

  const hasCaption = !!cur.caption && !hidden;
  const captionStyle = { fontFamily: "var(--font-mono)", fontSize: 11 * state.scale + "px", letterSpacing: ".08em", marginTop: 10, color: "rgba(255,255,255,.62)" };

  return (
    <>
      <div style={{ flex: "none", display: "flex", alignItems: "flex-end", gap: 16, padding: "18px 22px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent)" }}>{loadedLabel}</div>
            <div style={{ height: 1, width: 22, background: "var(--border2)" }} />
            <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--font-mono)" }}>{slideCounter}</div>
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15 }}>{curTitle}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
            <span>{curArtist}</span>
            <span style={{ color: "var(--faint)" }}>·</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{curMetaA}</span>
            <span style={{ color: "var(--faint)" }}>·</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{curBpm}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
          <InteractiveButton
            onClick={bible ? undefined : () => patch({ lyricsEditorOpen: true })}
            disabled={bible}
            base={{ height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", fontSize: 12.5, color: "var(--muted)", cursor: bible ? "not-allowed" : "pointer", opacity: bible ? 0.5 : 1 }}
            hover={bible ? undefined : { background: "var(--raise)", color: "var(--text)" }}
          >
            {editLabel}
          </InteractiveButton>
          <InteractiveButton
            onClick={bible ? undefined : () => toggleSetSong(song.id)}
            disabled={bible}
            base={{
              height: 32, padding: "0 12px", borderRadius: 8, fontSize: 12.5, cursor: bible ? "not-allowed" : "pointer", opacity: bible ? 0.5 : 1,
              border: "1px solid " + (inSet ? "var(--accent)" : "var(--border)"),
              background: inSet ? "var(--accent-soft)" : "var(--panel)",
              color: inSet ? "var(--accent)" : "var(--muted)",
              fontWeight: inSet ? 600 : 400,
            }}
            hover={bible ? undefined : (inSet ? undefined : { background: "var(--raise)", color: "var(--text)" })}
          >
            {setLabel}
          </InteractiveButton>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", gap: 18, padding: "18px 22px", minHeight: 0, overflowY: "auto" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, minHeight: 320 }}>
          <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>Live output</span>
            <span style={pill(true)}>{cur.label}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>{liveState}</span>
          </div>
          <div style={{ position: "relative", flex: "none", width: "100%", aspectRatio: "16/9", minHeight: 240, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border2)", background: "#000", boxShadow: "var(--shadow)" }}>
            <div style={bgStyle} />
            <div style={curCanvasStyle}>
              {cur.lines.map((line, i) => (
                <div key={i} style={bigLine}>{line}</div>
              ))}
              {hasCaption && <div style={captionStyle}>{cur.caption}</div>}
            </div>
            <div style={{ position: "absolute", top: 12, left: 14, display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 20, background: "rgba(0,0,0,.45)", backdropFilter: "blur(8px)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#fff", letterSpacing: ".06em" }}>LIVE</span>
            </div>
          </div>
        </div>

        <div style={{ width: 352, flex: "none", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>Previous</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", background: "var(--panel2)", opacity: 0.6 }}>
              <div style={prevCanvasStyle}>
                {(prv ? prv.lines : ["— start of song —"]).map((line, i) => (
                  <div key={i} style={smallLineStyle}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--faint)", fontSize: 14 }}>↓</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent)" }}>Next up</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={pill(false)}>{nxt ? nxt.label : "End"}</span>
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", border: "1px solid var(--accent)", background: "#000", boxShadow: "0 0 0 3px var(--accent-soft)" }}>
              <div style={bgStyle} />
              <div style={nextCanvasStyle}>
                {(nxt ? nxt.lines : ["— end of song —"]).map((line, i) => (
                  <div key={i} style={nextLineStyle}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "auto", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)", padding: "12px 13px", display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>Shortcuts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12, color: "var(--muted)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>Next / Previous slide</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text)" }}>← →</span></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>Black screen</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text)" }}>B</span></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>Blank (background only)</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text)" }}>W</span></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>Present / exit</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text)" }}>F5 · Esc</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
