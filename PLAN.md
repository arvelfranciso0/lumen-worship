# PLAN.md

## Task
"For every code/file with many lines, separate them into a different file — proper code structure,
like a senior developer. Example: `electron/main/index.js` shouldn't have the whole thing in one
file. Move all repeated/same-functionality functions into helpers/utils."

Two things: (1) split large files by internal concern, (2) de-duplicate repeated functions into
shared helper modules.

## Investigation (done directly, not delegated)
- **Concrete duplicate found**: `resolveWithinDir` (a path-traversal guard) is defined verbatim,
  independently, in both `electron/main/index.js:21` and `electron/db/index.js:43`. This is the
  clearest instance of "same functionality, different files" in the codebase.
- **Large-file survey** (line counts, excluding `.claude/workflows/*` tooling and test files):
  `useLumen.ts` 1530, `Sidebar.tsx` 734, `data.ts` 533, `Header.tsx` 441, `electron/main/index.js`
  398 (the user's own example), `PreviewPanel.tsx` 341, `MainPanel.tsx` 270, `TourOverlay.tsx` 258,
  `electron/db/index.js` 253, `SongEditorModal.tsx` 211, `lib/repository/indexeddb.ts` 208.
- `useLumen.ts` is explicitly documented in `CLAUDE.md` as a **deliberate** single-hook
  architecture ("the single source of truth for the entire app... if you need a new piece of
  state or action, it goes in this hook") — not a scaffold accident. Splitting it blindly would
  contradict a decision the project already made on purpose, so the user was asked directly.
  Answers received:
  - **Overall scope**: "Everything, including `useLumen.ts`."
  - **`useLumen.ts` specifically**: "Split its internals, keep one public hook" — extract
    cohesive pieces into sub-hooks/helper modules that `useLumen.ts` still composes and exposes
    through the exact same `UseLumen` return shape. External API is a hard constraint, not a
    suggestion — every consumer of `useLumen()` (nearly every component in the app) must need
    zero changes.
- `electron/main/index.js`'s internal shape (read in full): app lifecycle bootstrap, a static
  file server (`startStaticServer`/`ensureStaticServer`/`resolveAppUrl`/`MIME_TYPES`), the
  fullscreen "audience output" window + display management (`serializeDisplay`/`listDisplays`/
  `pickAutoDisplay`/`resolveOutputDisplay`/`outputStatusPayload`/`broadcastOutputStatus`/
  `openOutputWindow`/`closeOutputWindow`/`retargetOutputWindow`/`handleDisplayRemoved`/
  `handleDisplaysChanged`), IPC handler registration (`registerIpcHandlers`, ~75 lines), the
  auto-updater status bridge (`checkForUpdatesIfEnabled`/`setUpdateStatus`/
  `normalizeReleaseNotes`/the `autoUpdater.on(...)` listeners), and the `lumen-media` protocol
  handler — five distinct concerns bolted into one file.
- `electron/db/index.js`: schema + migration (`SCHEMA`, `migrateSchema`), row mappers
  (`rowToSong`/`rowToLineup`/`rowToBackground`/`rowToDownloadedBibleTranslation`), the duplicated
  `resolveWithinDir`/`sanitizeFileNameSegment` security helpers, then the `createDb` repository
  factory itself.
- `data.ts`: highlight-range helpers, book-name/abbreviation helpers, lyric font definitions, core
  domain types (`Section`/`Song`/`Lineup`/layout types), a **74-line `SONGS` sample-data array**
  and a **107-line `LOOKS` sample-data array**, Bible types/constants, UI filter constants — types
  and runtime sample data are mixed together in one file.
- `Sidebar.tsx`: one ~500-line `Sidebar` function plus a smaller `LineupDetail` helper — the bulk
  is a single monolithic function body (song list / Bible browser / lineup list all inline), not
  yet broken into sub-components at all.

## Sub-agent matching
Read all six files in `.claude/agents/`. Three are genuine matches for this task:
- **`electron-pro`** — ".claude/agents/electron-pro.md:3": "building Electron desktop
  applications that require native OS integration... performance optimization" — covers
  reorganizing `electron/main/index.js` and `electron/db/index.js`'s internals and the shared
  path-security helper.
- **`react-specialist`** — ".claude/agents/react-specialist.md:3": "optimizing existing React
  applications for performance, implementing advanced React 18+ features, or solving complex
  state management and architectural challenges within React codebases" — the explicit
  "complex state management... architectural challenges" phrase is a direct match for splitting
  `useLumen.ts`'s internals and the large UI components.
- **`nextjs-developer`** — ".claude/agents/nextjs-developer.md:3": "architect or implement
  complete Next.js applications" — covers the app's data-layer files (`data.ts`,
  `lib/repository/indexeddb.ts`), which are Next.js app architecture, not electron- or
  React-component-specific.

`typescript-pro`, `performance-engineer`, `penetration-tester` have no stated purpose matching
file-organization work — not used.

## Five independent tracks — all safe to run fully in parallel
No track's file set overlaps another's, and the one shared boundary (`useLumen.ts`'s public
return shape) is a hard constraint that keeps the others decoupled from it — Sidebar/Header/etc.
can assume `useLumen()`'s external shape is unchanged regardless of how Track B reorganizes its
insides; `data.ts`'s split (Track E) re-exports everything under its current names so its ~40
consumers need zero edits. Nothing here needs sequencing.

| Track | Agent | Scope |
|---|---|---|
| A | electron-pro | `electron/main/index.js` split by concern (static server, output-window/display manager, IPC handlers, updater bridge, media protocol handler); `electron/db/index.js` split (schema/migration, row mappers); extract the duplicated `resolveWithinDir` (+ `sanitizeFileNameSegment`) into one shared `electron/fsSecurity.js` required by both. |
| B | react-specialist | `useLumen.ts` (1530 lines) — extract cohesive internal pieces into sub-hooks/helper modules it composes. Same public `UseLumen` return shape, zero consumer changes. |
| C | react-specialist | `Sidebar.tsx` (734 lines) — extract natural sub-components (song list / Bible browser / lineup list, etc.) into sibling files. Same exported `Sidebar` name/props. |
| D | react-specialist | `Header.tsx`, `PreviewPanel.tsx`, `MainPanel.tsx`, `TourOverlay.tsx`, `SongEditorModal.tsx` — same treatment, one agent working through all five. |
| E | nextjs-developer | `data.ts` — split sample data (`SONGS`, `LOOKS`) and grouped helpers (highlight-range, book-name) out of the core types/constants file, re-exporting from `data.ts` so consumers don't change. `lib/repository/indexeddb.ts` — extract the generic IndexedDB primitives (`openDb`/`reqToPromise`/`getAll`/`getOne`/`put`/`del`) into a small helper module, leaving the `AppRepository` implementation itself in place. |

## What each track delivers
Every track: a before/after file list, confirmation that the public contract at its file's
boundary (function/component signatures, hook return shape, exported names) is byte-for-byte
unchanged, and its own sanity check (`node --check` for Track A's `.js` files; a description of
what it verified for the TS/TSX tracks — full `tsc`/lint/build verification is done centrally by
the orchestrator afterward, same as the last two `/orchestrate` passes in this session, to avoid
five agents racing on the same verification commands).

## Confirmation
The user already gave explicit, scoped confirmation via the two scoping questions above
("Everything, including useLumen.ts", "Split its internals, keep one public hook") — proceeding
straight to execution without an additional gate, consistent with the precedent set earlier this
session.

---
## Outcome (filled in after execution)

**All five tracks executed as planned, no scope deviation.** Combined effect: 6 large files
(1531+734+533+441+398+341+270+258+253+211+208 lines of the originally-surveyed files) turned into
one composition file each plus ~50 new single-concern files, with every public contract at each
boundary (hook return shape, component props, module exports) verified unchanged.

- **Track A (electron-pro)**: `electron/main/index.js` 398→~78 lines, split into
  `staticServer.js`/`outputWindow.js`/`updater.js`/`mediaProtocol.js`/`ipcHandlers.js`.
  `electron/db/index.js` 253→smaller, split into `schema.js`/`mappers.js`. `resolveWithinDir`
  de-duplicated into one shared `electron/fsSecurity.js` — caught and fixed a real behavioral
  difference between the two original copies (one returned `null` on violation, one threw) rather
  than silently picking one.
- **Track B (react-specialist)**: `useLumen.ts` 1531→387 lines, 19 new hook/helper files under
  `hooks/`, `lumenState.ts`, `styles/`, `media/`. `UseLumen`'s inferred return shape confirmed
  unchanged (all ~50 consumers still fully type-check). One process note: this agent ran
  `git stash`/`git stash pop` mid-task while three other agents held concurrent uncommitted
  changes in the same working tree — verified independently afterward (empty `git stash list`,
  every file every track reported present via `git status`) that nothing was lost.
- **Track C (react-specialist)**: `Sidebar.tsx` 734→92 lines, 6 new files under
  `layout/sidebar/`. `Sidebar`'s exported signature unchanged.
- **Track D (react-specialist)**: `Header.tsx` 441→145, `PreviewPanel.tsx` 341→138,
  `MainPanel.tsx` 270→19, `TourOverlay.tsx` 258→42, `SongEditorModal.tsx` 211→89 — ~25 new files
  total. Caught and avoided a Windows/git case-only filename collision
  (`mainPanelToolbar.ts` vs `MainPanelToolbar.tsx`) before it became a real bug.
- **Track E (nextjs-developer)**: `data.ts` 533→232 lines (`sampleSongs.ts`/`sampleLooks.ts`/
  `highlightUtils.ts`/`bookNames.ts` extracted, re-exported so ~40 consumers needed zero changes —
  verified via a programmatic diff of the module's export symbol table, not just a visual check).
  `lib/repository/indexeddb.ts` 208→149 lines, generic IDB primitives extracted to
  `idbHelpers.ts`.

**Verification (done independently by the orchestrator, not just taking the agents' word for
it):**
- Confirmed the `git stash`/`pop` from Track B left no stash behind and every file every track
  reported was actually present on disk (`git status` spot-checks per track).
- `npx tsc --noEmit` on the fully combined result: clean, zero errors.
- `npm run lint`: 46 problems (41 errors / 5 warnings), up from the 28-problem baseline (22/6) —
  fully explained, not a regression: the `no-require-imports` count rose only because
  `main/index.js`'s `require()` calls are now spread across 6 files (each needs its own), same
  pre-existing rule; the 5 non-require-import errors are the exact same 5 pre-existing
  React-hooks-rule issues from before this task (in `app/page.tsx`, `Sidebar.tsx`'s new home,
  `LineupModal.tsx`, `ResizeHandle.tsx`, and `useLumen.ts`'s new home), just now living in whatever
  file the affected code moved into — traced one (`ResizeHandle.tsx`, untouched by every track) to
  confirm it predates this task entirely. Warnings actually dropped 6→5.
- `npm run build` (full static export): succeeds, all pages generate.

All changes are uncommitted in the working tree, pending the user's review/commit decision.
