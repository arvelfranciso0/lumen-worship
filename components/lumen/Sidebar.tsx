"use client";

import { BOOKS, CHAPTER_COUNTS, CHIPS, SONGS, SORTS, TRANSLATIONS } from "./data";
import { InteractiveButton, InteractiveInput } from "./Interactive";
import type { UseLumen } from "./useLumen";

const RECENT = SONGS.slice(0, 3);

export function Sidebar({ v }: { v: UseLumen }) {
  const { state, patch, bible, list, chipBase, tabStyle, ref, passage, vnum, idx } = v;

  const chips = bible ? TRANSLATIONS : CHIPS;
  const resultCount = bible ? passage.length + " verses" : list.length + " songs";
  const showRecent = state.chip === "All" && !state.query;

  return (
    <aside style={{
      width: 328, flex: "none", borderRight: "1px solid var(--border)", background: "var(--panel)",
      display: "flex", flexDirection: "column", minHeight: 0,
    }}>
      <div style={{ padding: "14px 14px 10px", display: "flex", flexDirection: "column", gap: 10, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", padding: 3, gap: 3, borderRadius: 10, background: "var(--panel2)", border: "1px solid var(--border)" }}>
          <button onClick={() => patch({ mode: "songs", idx: 0, black: false, blank: false })} style={tabStyle(state.mode === "songs")}>Songs</button>
          <button onClick={() => patch({ mode: "bible", idx: 0, black: false, blank: false })} style={tabStyle(state.mode === "bible")}>Bible</button>
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 11, fontSize: 13, color: "var(--faint)" }}>⌕</span>
          <InteractiveInput
            value={state.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder={bible ? "Go to reference — e.g. John 3:16" : "Search songs, lyrics, tags"}
            base={{ width: "100%", height: 36, padding: "0 44px 0 28px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel2)", fontSize: 13, outline: "none" }}
            focusStyle={{ borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)" }}
          />
          <span style={{
            position: "absolute", right: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)",
            border: "1px solid var(--border)", borderRadius: 5, padding: "2px 5px",
          }}>⌘K</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => patch(bible ? { trans: c } : { chip: c })}
              style={chipBase(bible ? state.trans === c : state.chip === c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "var(--faint)", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>
            {resultCount}
          </div>
          {!bible && (
            <InteractiveButton
              onClick={() => patch((s) => ({ sort: SORTS[(SORTS.indexOf(s.sort) + 1) % SORTS.length] }))}
              base={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", gap: 5 }}
              hover={{ color: "var(--text)" }}
            >
              Sort: {state.sort} <span style={{ color: "var(--faint)" }}>⇅</span>
            </InteractiveButton>
          )}
          {bible && (
            <InteractiveButton
              onClick={() => patch({ idx: 0, black: false, blank: false })}
              base={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
              hover={{ color: "var(--text)" }}
            >
              Queue whole chapter
            </InteractiveButton>
          )}
        </div>
      </div>

      {bible && (
        <>
          <div style={{ flex: "none", display: "flex", borderBottom: "1px solid var(--border)", height: 172 }}>
            <div style={{ width: 118, flex: "none", borderRight: "1px solid var(--border)", overflowY: "auto", padding: 6 }}>
              {BOOKS.map((b) => (
                <button
                  key={b}
                  onClick={() => patch({ book: b, chapter: 1, idx: 0 })}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: 7,
                    border: "none", cursor: "pointer", fontSize: 12,
                    background: b === state.book ? "var(--accent-soft)" : "transparent",
                    color: b === state.book ? "var(--text)" : "var(--muted)",
                    fontWeight: b === state.book ? 600 : 400,
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)", padding: "2px 2px 7px" }}>
                Chapter
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
                {Array.from({ length: CHAPTER_COUNTS[state.book] || 1 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => patch({ chapter: n, idx: 0 })}
                    style={{
                      height: 26, borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: "var(--font-mono)",
                      border: "1px solid " + (n === state.chapter ? "var(--accent)" : "var(--border)"),
                      background: n === state.chapter ? "var(--accent-soft)" : "var(--panel2)",
                      color: n === state.chapter ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 20px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 6px 9px" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{ref}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)" }}>{state.trans}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {passage.map((t, i) => (
                <div
                  key={i}
                  onClick={() => patch({ idx: i, black: false, blank: false })}
                  style={{
                    display: "flex", gap: 9, padding: "8px 9px", borderRadius: 9, cursor: "pointer",
                    border: "1px solid " + (i === idx ? "var(--accent)" : "transparent"),
                    background: i === idx ? "var(--accent-soft)" : "var(--panel2)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, paddingTop: 3, color: i === idx ? "var(--accent)" : "var(--faint)" }}>
                    {vnum(i)}
                  </span>
                  <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!bible && (
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 20px" }}>
          {showRecent && (
            <>
              <div style={{ padding: "8px 6px 6px", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>
                Recently used
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 10 }}>
                {RECENT.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => patch({ songId: s.id, idx: 0 })}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 8px", borderRadius: 8,
                      border: "1px solid transparent", background: s.id === state.songId ? "var(--raise)" : "transparent",
                      color: "var(--text)", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)", width: 34, textAlign: "left" }}>{s.when}</span>
                    <span style={{ flex: 1, textAlign: "left", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)" }}>{s.key}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ padding: "8px 6px 6px", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>
            Library
          </div>
          {list.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", padding: "40px 18px", color: "var(--muted)" }}>
              <span style={{ fontSize: 22, color: "var(--faint)" }}>⌕</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>No songs found</div>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>Try a different search term or filter.</div>
              <InteractiveButton
                onClick={() => patch({ query: "", chip: "All" })}
                base={{ marginTop: 4, height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel2)", fontSize: 12, color: "var(--muted)", cursor: "pointer" }}
                hover={{ color: "var(--text)", background: "var(--raise)" }}
              >
                Clear filters
              </InteractiveButton>
            </div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map((s) => {
              const on = s.id === state.songId;
              const fav = !!state.favs[s.id];
              return (
                <div
                  key={s.id}
                  onClick={() => patch({ songId: s.id, idx: 0, black: false, blank: false })}
                  style={{
                    padding: "11px 12px 10px", borderRadius: 12, cursor: "pointer",
                    border: "1px solid " + (on ? "var(--accent)" : "var(--border)"),
                    background: on ? "var(--accent-soft)" : "var(--panel2)",
                    boxShadow: on ? "0 0 0 3px var(--accent-soft)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.artist}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); patch((p) => ({ favs: { ...p.favs, [s.id]: !p.favs[s.id] } })); }}
                      style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2, color: fav ? "var(--warn)" : "var(--faint)" }}
                    >
                      ★
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text)", background: "var(--raise)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 5 }}>
                      {s.key}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--faint)" }}>{s.bpm}</span>
                    <div style={{ flex: 1 }} />
                    {s.tags.slice(0, 2).map((tag) => (
                      <span key={tag} style={{ fontSize: 10.5, color: "var(--muted)", background: "var(--panel2)", border: "1px solid var(--border)", padding: "2px 7px", borderRadius: 20 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </aside>
  );
}
