# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev              # Next.js dev server (Turbopack), http://localhost:3000
npm run build             # next build — static export to out/ (output: "export" in next.config.ts)
npm run start             # serves the static export: npx serve@latest out (next start does NOT work — export mode)
npm run lint               # eslint

npm run electron:dev       # runs next dev + electron concurrently against it (desktop shell, live reload)
npm run electron:build     # next build, then electron-builder -> release/*.exe (NSIS installer)

npm run bible:convert      # node scripts/convert-bible.mjs — converts public/bible/*.xml into public/bible/json/
```

There is no test suite/framework configured in this project.

## Architecture

This is a single-page worship lyrics/Bible presentation app that ships to **both** a browser and a
packaged Electron desktop app from the same Next.js static export (`output: "export"`). There is
effectively one route (`app/page.tsx`) that renders `<LumenApp />`; everything else is client
components under `components/lumen/`.

`components/lumen/` groups by feature: `bible/`, `tour/`, `presentation/`, `layout/`, `modals/`,
`electron-bridges/`, `search/`, `song/`, `hooks/`, `ui/`. `LumenApp.tsx`, `useLumen.ts`, `data.ts`,
and `cx.ts` stay at the top level — the app entry, its one state hook, shared domain types, and a
shared utility, none of which belong to a single feature.

### State: one hook, not context/Redux

`components/lumen/useLumen.ts` is the single source of truth for the entire app — all state
(`LumenState`), derived values (current slide, filtered song list, Bible passage, etc.), and actions
(`addSong`, `createLineup`, `reorderLineupSongs`, `adjustLayoutSize`, ...) live in this one hook.
`LumenApp.tsx` calls it once and passes the whole return value down as a `lumen` prop to every child
component (`{ lumen }: { lumen: UseLumen }`). There is no context provider and no separate state
library — if you need a new piece of state or action, it goes in this hook.

### Persistence: repository pattern, two backends

`lib/repository/` defines an `AppRepository` interface (`loadAll`, `upsertSong`, `upsertLineup`,
`setSongOverride`, `setPrefs`, ...) with two interchangeable implementations, picked at runtime by
`getRepository()` in `lib/repository/index.ts`:
- `indexeddb.ts` — browser backend, raw `indexedDB` API.
- `electron.ts` — thin pass-through to `window.electronAPI` (only present when running inside the
  Electron shell; injected by `electron/preload/index.js`, backed by `electron/db/index.js`).

Both backends store `prefs` as a generic key-value table (JSON-serialized value), so adding a new
persisted preference is just adding a field to `PersistedPrefs` in `lib/repository/types.ts` and
including it in the debounced `setPrefs()` call in `useLumen.ts` — no schema migration needed on
either backend.

### Electron shell

`electron/main/index.js` + `preload/index.js` + `preload/output.js` + `db/index.js`, grouped by
process role; `electron/bibleXml.js` stays at the `electron/` root since it's also imported
cross-boundary by `lib/repository/indexeddb.ts` and `components/lumen/useLumen.ts`. Two things
worth knowing before touching this:
- Persistence uses Node's built-in `node:sqlite` (`DatabaseSync`), not `better-sqlite3` — chosen
  deliberately to avoid native-module rebuild issues; it works out of the box in the bundled
  Electron/Node runtime.
- In production, `main/index.js` serves the static export (`out/`) via a small hand-rolled local
  HTTP server rather than `win.loadFile()` / raw `file://`, because Next's static export emits
  absolute asset paths (`/_next/...`) that break under `file://`. Don't "simplify" this back to
  `loadFile`.

### Tailwind v4 — CSS-first config, and a cascade-layer gotcha

There is no `tailwind.config.js` — theme tokens are defined in `app/globals.css` via `@theme inline`,
aliasing the app's own CSS custom properties (`--bg`, `--accent`, `--panel2`, etc.) into Tailwind
utilities (`bg-panel2`, `text-accent`, `shadow-app`, ...), which is also how `[data-theme="light"]`
theme switching keeps working (the utility re-reads the custom property at use time).

**Important gotcha**: any CSS written outside an explicit `@layer` block is "unlayered", and
unlayered CSS always wins over layered CSS (which is where Tailwind's own preflight/utilities live)
regardless of selector specificity or source order. Global element resets (e.g. the
`input, button { ... }` reset in `globals.css`) must be wrapped in `@layer base` — otherwise they
silently override every Tailwind utility (`color`, `font-size`, `font-weight`, etc.) applied to
those elements via `className`. This already caused one real bug (button text colors/sizes being
overridden) after inline `style` props were converted to Tailwind classes.

`components/lumen/cx.ts` is a 3-line hand-rolled class-joiner (no `clsx`/`tailwind-merge` dependency
— this codebase avoids small dependencies in favor of hand-rolled utilities, same as the custom XML
parser in `scripts/convert-bible.mjs` and the raw `indexedDB` wrapper). `Interactive.tsx`
(`InteractiveButton`/`InteractiveInput`) are now plain passthrough components — hover/active/focus
styling is native Tailwind `hover:`/`active:`/`focus:` variants, not JS-tracked state.

### Bible data

`public/bible/json/*.json` + `manifest.json` are pre-converted; the source `.xml` files are not
checked into the repo (only dropped into `public/bible/*.xml` when adding a new translation).
`scripts/convert-bible.mjs` converts all `.xml` files it finds in `public/bible/` and **merges** the
result into the existing `manifest.json` by translation `code`, so converting one new file doesn't
wipe previously-converted translations. `BOOKS` in that script is the only source of book names —
the XML format numbers books 1–66 but never names them.

### Layout panels & resizing

`Sidebar`, the Previous/Next preview column (in `MainPanel`), and the slides strip (`SlidesStrip`)
are independently resizable (drag handles via `ResizeHandle.tsx`) and independently
show/hideable from Settings (`state.layoutVisibility`, toggled via `toggleLayoutPanel`). Sizes live
in `state.layoutSizes` and persist through the same `prefs` mechanism described above.

## Conventions

- No single-letter variable/parameter names (`i`, `s`, `v`, etc.) — use descriptive names
  (`songIndex`, `previousState`, `lumen`). This was an explicit, deliberate change from the
  original scaffold; keep new code consistent with it.

### Comments

Keep comments short — one line, stating what the function or block does. Do not write multi-line
comments explaining history, rationale, edge cases, or bugs avoided; if that context matters, put
it in the commit message or PR description instead. If a function's name and signature already
make its purpose obvious, skip the comment entirely.

- Good: `// Evicts the oldest cache entry once the limit is exceeded.`
- Avoid: paragraph-length comments walking through why a piece of code exists or what it once
  looked like.
