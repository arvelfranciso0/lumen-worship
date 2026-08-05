# Lumen

Lumen is a live worship lyrics and Bible presentation app: an operator screen for picking
songs/passages and driving what the audience sees, with a dedicated fullscreen output for the
audience — either the same window (single monitor) or a real second-monitor window (projector/TV
setup). It ships from a single Next.js codebase to two targets:

- **Browser** — a static export, persisted with IndexedDB.
- **Desktop (Windows)** — an Electron app around the same UI, persisted with SQLite, with extra
  capabilities the browser can't offer (a real second-monitor output window, auto-update).

There is effectively one route/page (`app/page.tsx` → `LumenApp`); everything else is client
components under `components/lumen/`.

## Features

- Song lyrics and Bible passages, presented slide-by-slide with keyboard control
  (`← →` navigate, `B` black screen, `W` blank/background-only, `F5` present, `Esc` exit).
- **Present / Fullscreen**: if a second display is connected, the audience view opens there
  automatically and the operator's own window stays usable; otherwise the operator window itself
  goes fullscreen.
- Per-selection text highlighting, custom fonts, bold/italic/outline/color styling — applied live
  by selecting text directly on the output preview.
- Custom backgrounds (images/video) and built-in gradient "Looks."
- Bible translations are imported as downloaded `.json` files (Settings → Bible Translations) —
  none are bundled with the app.
- Song lineups/sets, favorites, free-typing lyrics editor with automatic section parsing.
- Resizable, show/hideable layout panels (sidebar, preview column, slides strip).
- Desktop build only: auto-update (checks GitHub Releases, notifies via a bell in the header,
  installs on restart).

## Deferred features

Things deliberately not built yet, recorded so the reasoning isn't rediscovered from scratch.

- **Multi-simultaneous displays** — the app drives one optional second-monitor output window.
  Per-display content modes (mirror/stage/audience), role profiles and true N-display support
  are deferred. See the comment block at the top of `components/lumen/DisplaysModal.tsx`.
- **Chords** — to be reintroduced as part of the above: chord symbols would appear only on a
  **Stage** display, for the musicians, while the **Audience** display shows the same slide
  without them. This makes chords a property of a display's role rather than a global toggle.
  An earlier global `state.chords` boolean was removed because it was exactly that global
  toggle, and because nothing ever rendered chords — no song/section field carried chord data,
  so it only lit its own indicator. Reintroducing it means designing chord storage (per-section
  chord lines, or ChordPro-style inline markup parsed from the lyrics) alongside the per-display
  routing. Same comment block in `DisplaysModal.tsx` has the details.

## Architecture

- **State** — `components/lumen/useLumen.ts` is the single source of truth for the entire app:
  all state, derived values, and actions live in this one hook. `LumenApp.tsx` calls it once and
  passes the result down as a `lumen` prop to every child component. No context provider, no
  separate state library.
- **Persistence** — `lib/repository/` defines an `AppRepository` interface with two backends,
  picked at runtime by `getRepository()`:
  - `indexeddb.ts` — browser backend, raw `indexedDB`.
  - `electron.ts` — pass-through to `window.electronAPI` (injected by `electron/preload.js`,
    backed by `electron/db.js`, using Node's built-in `node:sqlite`).
- **Electron shell** (`electron/main.js` + `preload.js` + `db.js`) — in production, serves the
  static export (`out/`) via a small local HTTP server rather than `file://`, since Next's static
  export emits absolute asset paths. Also owns the second-monitor "audience output" window and
  the `electron-updater` auto-update flow.
- **Styling** — Tailwind v4, CSS-first config (no `tailwind.config.js`); theme tokens live in
  `app/globals.css` via `@theme inline`, aliasing the app's own CSS custom properties so
  light/dark theme switching keeps working.
- **Bible data** — nothing is bundled. Translations are converted from XML with
  `scripts/convert-bible.mjs` on a *separate* landing-page project, downloaded by the user as a
  `.json` file, and imported via Settings — fully offline once imported.

See `CLAUDE.md` for the full breakdown (state/persistence details, Tailwind gotchas, layout
panels, conventions) — it's the canonical reference for working in this codebase.

## Project structure

```
app/page.tsx              single route, renders LumenApp
components/lumen/          all UI + the useLumen state hook
  useLumen.ts               the app's one state hook (state, derived values, actions)
  LumenApp.tsx               top-level layout, wires everything to `lumen`
  MainPanel.tsx               live output preview, text styling, previous/next
  Sidebar.tsx / Toolbar.tsx / SlidesStrip.tsx / Header.tsx   the rest of the operator UI
  PresentationOverlay.tsx    single-window fullscreen presentation fallback
  OutputWindowApp.tsx        renders in the second-monitor output window (Electron)
  electronDisplay.ts / electronShell.ts / electronUpdater.ts   typed window.electronAPI-style bridges
lib/repository/            AppRepository interface + IndexedDB/Electron backends
electron/                  main.js (window/IPC/updater), preload.js (bridges), db.js (SQLite)
scripts/convert-bible.mjs  XML → JSON Bible conversion (run outside this repo now)
```

## Getting started

```bash
npm install
npm run dev          # Next.js dev server (Turbopack), http://localhost:3000
```

There is no test suite configured — verify changes by running the app (`npm run dev` for the
browser build, `npm run electron:dev` for the desktop shell) and checking `npm run lint` /
`npx tsc --noEmit`.

## Commands

```bash
npm run dev              # Next.js dev server
npm run build             # next build — static export to out/ (output: "export")
npm run start             # serve the static export: npx serve@latest out (next start doesn't work — export mode)
npm run lint               # eslint

npm run electron:dev       # next dev + electron concurrently, live reload
npm run electron:build     # next build, then electron-builder -> release/*.exe (NSIS installer)

npm run bible:convert      # node scripts/convert-bible.mjs — converts public/bible/*.xml into public/bible/json/
```

## Releasing the desktop app

Releases publish to a **separate** GitHub repo from the source (`build.publish.owner`/`repo` in
`package.json`) so large installer binaries never land in this repo's history. `repository` in
`package.json` points at the source repo; it's unrelated to where builds get published.

```bash
$env:GH_TOKEN = "ghp_..."          # classic PAT with the `repo` scope
make release
```

This builds, packages, and uploads the installer `.exe`, its `.blockmap`, and `latest.yml` to a
new GitHub Release in one step — `electron-updater` needs all three to detect and install updates
on end-user machines. Bump `version` in `package.json` first; that value becomes the release tag.
The `release/` folder is safe to leave between builds (gitignored, gets overwritten per version).
