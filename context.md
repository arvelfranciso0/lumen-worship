# Session Context — Lumen Worship App

This file summarizes a long working session on Lumen (live lyrics/Bible presentation app for
worship gatherings, shipping to both browser and Electron desktop from one Next.js codebase).
It's meant as a handoff/context doc — the *why* behind recent changes, not a full changelog.
See `CLAUDE.md` for architecture and commands.

## Where things stand

- Version `1.0.0` (bumped in `package.json`, not yet tagged/released on GitHub as of this
  writing — see "Pending" below).
- `public/bible/` has been **removed from this project entirely**. Bible translation data now
  lives in a **separate project** the user is building specifically as a public landing/download
  page. This app never reads Bible JSON from its own `public/` folder at runtime or build time.
- Everything is committed except `package.json`/`package-lock.json` (a 1.0.0 version bump plus
  an `electron-updater` dependency and a GitHub `publish` config the user added independently —
  **not yet wired into `electron/main.js`**, so auto-update isn't functional yet, just scaffolded).

## Major features/changes this session

### 1. Text styling & highlighting
- Replaced a global "highlight whole screen" toggle with **selection-based highlighting**:
  select text directly on the Live output box (works for both songs and Bible verses), pick a
  color, Apply/Remove. Multi-line selections work (`MainPanel.tsx`'s `liveSelection` state,
  `useLumen.ts`'s `applyLiveHighlight`/`removeLiveHighlight`).
- Outline remains a *global* toggle (applies to all text), unlike per-selection highlight.
- Text color picker is debounced (native color inputs fire continuously while dragging).
- Custom font system: theme fonts (Instrument Sans/Serif, Inter, Poppins, Playfair, Merriweather)
  + system fonts (Arial, Georgia, etc.), picked inline in the MainPanel toolbar.

### 2. Second-monitor "audience output" (Electron)
Full dual-window implementation: a second, frameless `BrowserWindow` shows only the live
slide, fullscreen, on a detected secondary display — auto-opened, no manual dragging.
Several real bugs were found and fixed along the way, all still relevant if this area changes:
- **Black background after app restart**: `lumen-media://` custom-protocol URLs must put the
  filename in the URL *path*, not host — a `standard: true` scheme reshapes host-position
  strings and the protocol handler's `request.url` stops matching (`electron/db.js`,
  `electron/main.js`).
- **Tainted-canvas `SecurityError` on poster generation**: fixed by adding `corsEnabled: true`
  to the `lumen-media` scheme's privileges in `protocol.registerSchemesAsPrivileged` — without
  it, Chromium refuses the cross-origin video load outright when `crossOrigin="anonymous"` is
  set, *before* the response's `Access-Control-Allow-Origin` header is even considered. (Also:
  `crossOrigin` is only set for non-`blob:` URLs — forcing it on `blob:` URLs, used by the
  browser/IndexedDB backend, broke video loading there entirely.)
- **Output window closing itself moments after opening**: `display-metrics-changed` fires when
  a window goes fullscreen (Windows hides the taskbar → "work area changed"), and the original
  handler treated that identically to a real disconnect. Fixed by only letting `display-removed`
  close the window; `display-metrics-changed`/`display-added` only re-bound it, and only if the
  target bounds actually differ (avoids a self-triggering feedback loop).
- **Output window never showing at all**: `app/page.tsx` used to default to rendering the full
  `LumenApp` before the `?output=1` query check could run — so the *output* window briefly
  mounted a second full `useLumen()` instance, whose default state (`outputEnabled: false`)
  immediately closed the very window it was running in. Fixed by defaulting to a blank
  "pending" render until the route check resolves, never defaulting to `LumenApp`.

### 3. Bible translations: three architecture iterations (last one is current)
1. **Bundled everything** (original state): all 32 translations shipped inside the Electron
   installer's `out/bible/json/*.json` — this alone was ~152MB of the ~195MB installer.
2. **Tried**: exclude most JSON from the Electron package via `electron-builder`'s `files`
   glob, add a manual download-then-import flow (repository-backed `bibleTranslations` store,
   Settings → Bible Translations UI), plus a `/downloads` landing-page route in this same
   project. **User discarded this** — didn't want the landing page coupled into this project's
   build/routing at all.
3. **Tried**: swap the landing page onto `/` and move the real app to `/app`. **Also discarded**
   — same underlying objection, just more entangled with routing this time.
4. **Current, final approach**: the landing/download page is a **completely separate project**
   (`public/bible/*` was physically moved there by the user). This app is now **100%
   database-backed for Bible content** — no bundled data, no static-file fallback of any kind:
   - `components/lumen/data.ts`: `DownloadedBibleTranslation` type (code/language/name/license/
     link/downloadedAt/sizeBytes), `NOT_DOWNLOADED_PASSAGE` (a *blank* placeholder line — never
     real message text, so it can never leak onto the live/preview output), `BIBLE_DOWNLOADS_URL`
     (currently a `REPLACE-ME` placeholder — **update once the landing page is deployed**).
   - `lib/repository/*` + `electron/db.js`: `addBibleTranslation`/`deleteBibleTranslation`/
     `getBibleTranslationData`, mirroring the existing custom-background pattern exactly —
     metadata eagerly hydrated on `loadAll()`, full verse JSON fetched lazily and only on demand
     (translations can be several MB each).
   - `electron/preload.js` + `main.js`: matching IPC, plus a small `electronShell.openExternal`
     bridge so "Get more translations" opens the landing page in the user's real browser instead
     of navigating the app window.
   - `useLumen.ts`: translation lookup checks the repository *only*; nothing ever falls back to
     fetching `/bible/json/...`. `importBibleTranslation` validates a dropped-in `.json` file
     (must have `meta.code`/`meta.name`/`books`) and clears any stale `bibleLoadFailed` flag.
   - `Sidebar.tsx`: the whole book/chapter/verse browser only renders once at least one
     translation is imported. With none imported, it shows one clear empty state (book icon +
     "No Bible translations imported" + an "Import translation" button that opens Settings) —
     **no fake verse row, no phantom "1 verse" count, no selected-but-blank slide**. Language
     chips are generated dynamically from what's actually been imported (no hardcoded list).
   - Net effect: the Electron installer's `app.asar` dropped from **314MB → ~2MB** while this
     architecture was still project-local; it's now not a factor at all since the data left the
     repo.
   - **Import flow is deliberately manual** (download file → Settings → Import), *not* an
     in-app network fetch — confirmed explicitly with the user, avoids needing any CORS/network
     code in the app itself and keeps it fully offline-capable once imported.

### 4. Installer size (separate from the Bible work) — fix currently REVERTED

Earlier this session, `next`/`react`/`react-dom` were moved from `dependencies` to
`devDependencies`, an unused `axios` dependency was removed, and `"!node_modules/**/*"` was
added to electron-builder's `files` config — electron-builder scans `dependencies` and was
bundling the entire resolved `node_modules` tree (including build-only tools like `@next/swc`
and `sharp`) into the shipped app even though the packaged app only ever runs
`electron/main.js` (plain Node + the `electron` module, zero npm deps at runtime). This dropped
the installer from ~195MB → ~134MB on its own, independent of the Bible-data removal.

**As of this writing, that fix is reverted** — the user's "discard all changes" pass brought it
back along with the Bible work it was reasoned about. `package.json`'s current `dependencies`
block again lists `axios`, `next`, `react`, and `react-dom` (confirmed just now), and the `files`
array no longer excludes `node_modules`. If installer size matters for the 1.0.0 release, this
needs redoing — it's a pure win with no functional downside (those three packages are only ever
used by the `next build` step, never by the packaged Electron app at runtime).

### 5. Song editing rewrite
Replaced the old "one `<textarea>` per section, with label `<input>`s and add/remove-section
buttons" editor (both `LyricsEditorModal.tsx` for editing and `SongUploadModal.tsx` for adding)
with a **single free-typing textarea** in both. New parser in `components/lumen/songImport.ts`:
- `parseLyricsBlock(text)`: a bare line matching a recognized section word (`Verse`, `Chorus`,
  `Pre-Chorus`, `Bridge`, `Intro`, `Outro`, `Tag`, `Interlude`, `Refrain`, `Ending`, plus Spanish
  `Verso`/`Coro`/`Puente` for the one Spanish sample song), optionally followed by a number,
  starts a new section — everything until the next label line belongs to it. If **no** label
  ever appears, a blank line alone starts a new slide, auto-numbered "Verse 1", "Verse 2", ...
  Falls back to `[{ label: "Verse 1", lines: [""] }]` if nothing parses (never returns `[]` —
  an empty `Section[]` risks the same undefined-`cur`/crash class of bug hit elsewhere this
  session with empty Bible passages).
- `sectionsToText(sections)`: the reverse, used to pre-fill the edit modal's textarea from an
  existing song — round-trip safe (consecutive same-labeled slides are rejoined under one label
  line, separated by blank lines).
- `extractMetadataHeader(raw)`: pulls leading `Title:`/`Artist:`/`Key:`/`BPM:`/`Tags:` lines for
  the file-upload convenience feature; the remaining body text is *not* pre-parsed into
  sections — it's dropped straight into the textarea and parsed uniformly at save time, same as
  manually-typed text.
- Old bracket syntax (`[Verse 1]`) is **gone** — bare lines only, confirmed with the user
  (a deliberate breaking change from the old file-upload format).
- Editing an existing song's lyrics through this re-parse-from-scratch flow **clears any
  existing per-line highlights** for that song (confirmed with the user) — there's no reliable
  way to map old `lineHighlights[i]` (index-aligned to `lines[i]`) onto freshly reflowed lines.

### 6. Delete song
Added a delete ("✕") button next to the favorite star in `Sidebar.tsx`'s song list — **only for
user-created songs** (`song.id.startsWith("custom-")`); the built-in `SONGS` sample data has no
delete button since it isn't persisted anywhere. `useLumen.ts`'s new `deleteSong` falls back to
`SONGS[0].id` if the deleted song was the active one.

### 7. "Newest first" ordering
Downloaded Bible translations, added songs, new lineups, and new backgrounds now all sort
newest-first, both in-session and after a reload:
- New items are **prepended**, not appended, in `addSong`/`createLineup`/`addBackground`/
  `importBibleTranslation`.
- `allSongs` and `allLooks` now put custom content *before* the built-in samples/gradients
  (`[...state.customSongs, ...SONGS]`, `[...state.customBackgrounds, ...LOOKS]`), not after.
- The repository's `loadAll()` returns rows in insertion order (oldest first, from plain
  `getAll()`/`SELECT *` with no explicit ordering) — so the four arrays are `.reverse()`d right
  after `loadAll()` resolves in `useLumen.ts`, otherwise a page reload would show oldest-first
  while the live session shows newest-first.

### 8. Misc
- Header's hardcoded "Sunday Gathering" label replaced with the actual current date (computed
  the same hydration-safe way as the adjacent clock — starts blank, fills in post-mount) —
  it was a static placeholder that was simply wrong most days of the week.
- Drafted 1.0.0 GitHub release notes (see chat history) — the `BIBLE_DOWNLOADS_URL` placeholder
  and the release notes' "download translations from ___" line both still need the real landing
  page URL once it's deployed.

## Pending / things to watch

- **`BIBLE_DOWNLOADS_URL`** in `components/lumen/data.ts` is still the literal placeholder
  `"https://REPLACE-ME.netlify.app/#download"` — must be updated once the separate landing-page
  project is deployed, or "Get more translations" goes nowhere real.
- **`electron-updater`** is a listed dependency and `package.json` has a `publish`/`repository`
  config, but nothing in `electron/main.js` actually calls it yet — auto-update is scaffolded,
  not implemented.
- **Installer-size dependency fix** (§4 above) is currently reverted — `next`/`react`/
  `react-dom`/`axios` are back under `dependencies`. Redo it before shipping 1.0.0 if installer
  size matters.
- The separate Bible landing-page project needs `scripts/convert-bible.mjs` and the source
  `public/bible/*.xml` files moved over too (only the generated JSON + manifest were confirmed
  moved) — that conversion script's job (prepping translations for download) belongs there now,
  not here.
- No auto-tests exist in this repo (confirmed in `CLAUDE.md`) — all verification this session
  was manual `tsc --noEmit` + `next build` + ad-hoc Playwright scripts run against a local dev
  server, not a persisted test suite.
