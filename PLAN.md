# PLAN.md

## Task
"Remove all the long comment and make it simple that explain what the function and write a rules
on CLAUDE.md for a comment convention." — i.e.:
1. Add a comment-style convention to `CLAUDE.md`.
2. Rewrite the codebase's existing long, multi-line "why/history/rationale" comment blocks down to
   short, one-line "what it does" comments, per that new convention.

## Step 1 — done directly (not delegated)
Added a `### Comments` subsection under `## Conventions` in `CLAUDE.md`:
> Keep comments short — one line, stating what the function or block does. Do not write
> multi-line comments explaining history, rationale, edge cases, or bugs avoided... If a
> function's name and signature already make its purpose obvious, skip the comment entirely.

This is the exact spec every editing pass below must follow.

## Step 2 — sub-agent matching
Read all six files in `.claude/agents/`. None has comment style / documentation conventions as its
stated purpose:
- `electron-pro` — Electron desktop apps (native integration, distribution, security, perf).
- `nextjs-developer` — Next.js App Router / full-stack / SEO / perf.
- `react-specialist` — React performance, state management, advanced patterns.
- `typescript-pro` — advanced type-system patterns, generics, type-level programming.
- `performance-engineer` — bottleneck/load-testing/caching performance work.
- `penetration-tester` — offensive security testing.

None is a genuine match for "shorten comments across the codebase" — this is generic mechanical
editing, not domain expertise in any of the above. Per the orchestration rule ("don't force-fit an
agent with no clear responsibility"), no roster sub-agent is used for this task.

**Scope is large enough that it still needs an execution plan**: 62 of 64 source files contain a
3+ line comment block (verified via grep across `*.ts`/`*.tsx`/`*.js`). Doing this file-by-file
inline in the orchestrator would be slow and context-heavy for a purely mechanical task, so it will
be fanned out to **general-purpose agents** (the generic catch-all type, not a specialized roster
agent — its stated purpose, "executing multi-step tasks" over "searching for code", is a genuine
fit for this specific job). This is a deliberate deviation from using only the named roster, made
because none of the six fit and the task is too large for one inline pass.

## Scope / exclusions
- **In scope**: all files under `components/lumen/`, `lib/repository/`, `electron/`, `app/`
  containing long comment blocks.
- **Excluded**: `.claude/workflows/*.js` and `.claude/agents/*.md` (Claude Code tooling
  config, not shipped app code), `next-env.d.ts` (auto-generated, never hand-edited).
- **Test files** (`*.test.ts`/`*.test.js`): included, since the task says "all."

## Batches (parallel, independent — no cross-file dependency for a comment-style pass)
| Batch | Files |
|---|---|
| A — Electron shell | `electron/db.js`, `electron/main.js`, `electron/preload.js`, `electron/preload-output.js`, `electron/bibleXml.js`, `electron/bibleXml.test.js` |
| B — Repository layer | `lib/repository/types.ts`, `lib/repository/indexeddb.ts` |
| C — Core hooks/utils (pt 1) | `components/lumen/useLumen.ts`, `useBibleTranslation.ts`, `data.ts`, `stage.ts`, `navigation.ts`, `transpose.ts`, `songImport.ts` |
| D — Core hooks/utils (pt 2) | `components/lumen/globalSearch.ts`, `bibleSearch.ts`, `tourPlacement.ts`, `tourSteps.ts`, `useSlideTransition.ts`, `useDebouncedColor.ts`, `useBackdropClose.ts`, `useViewportBreakpoint.ts`, `electronCompat.ts`, `electronDisplay.ts`, `electronShell.ts`, `electronUpdater.ts` |
| E — UI components (pt 1) | `Header.tsx`, `MainPanel.tsx`, `Sidebar.tsx`, `ResizeHandle.tsx`, `HotkeysModal.tsx`, `SongEditorModal.tsx`, `DisplaysModal.tsx`, `ConfirmDialog.tsx`, `BibleTranslationsPanel.tsx`, `PreviewPanel.tsx`, `TourOverlay.tsx` |
| F — UI components (pt 2) | `BibleComparePanel.tsx`, `SlidesPanel.tsx`, `BackgroundsPanel.tsx`, `LumenApp.tsx`, `TransitionRow.tsx`, `PresentationOverlay.tsx`, `OutputWindowApp.tsx`, `SlideStage.tsx`, `SlideCaption.tsx`, `LookBackground.tsx`, `HighlightedLine.tsx`, `MobileTabBar.tsx` |
| G — Tests + entry point | `bibleSearch.test.ts`, `bookMatching.test.ts`, `compareTranslation.test.ts`, `bookNames.test.ts`, `navigation.test.ts`, `tourPlacement.test.ts`, `tourSteps.test.ts`, `slideTransition.test.ts`, `app/page.tsx` |

All 7 batches are independent (pure comment rewrite, no shared state) — run in parallel.

## What each agent delivers
Each batch agent: rewrites every multi-line "why" comment in its file list down to a single short
line describing what the code does (or deletes the comment if the code is already self-evident),
leaves all logic/behavior untouched, and reports which files it touched and how many comment
blocks it shortened/removed.

## Confirmation
This modifies ~50+ files across the whole codebase. Per orchestration rules, execution pauses here
for user confirmation before the 7 batch agents are spawned.

---
## Outcome (filled in after execution)

**Executed as planned, no deviation.** All 7 batches (A–G) completed and were run as
`general-purpose` agents in the background, in parallel, as planned. 59 files changed total
(58 source files + `CLAUDE.md`), net **2001 comment lines removed, 456 lines of short
one-line replacements added** (`git diff --stat`).

Per-batch results (shortened / deleted, self-reported and spot-checked):
- **A — Electron shell** (6 files): 70 blocks shortened, 0 deleted — even well-named helpers had
  non-obvious behavior worth a short line; rationale/history text (WAL-mode reasoning, sandbox
  crash history, security threat-model walkthroughs) deleted outright.
- **B — Repository layer** (2 files): 13 blocks shortened, 0 deleted.
- **C — Core hooks/utils pt1** (7 files, incl. `useLumen.ts` — the app's single biggest file):
  ~95+ blocks shortened/deleted in `useLumen.ts` alone; ~140 more across the other 6 files.
- **D — Core hooks/utils pt2** (12 files): 45 blocks shortened, 0 deleted.
- **E — UI components pt1** (11 files): ~71 shortened, 5 deleted entirely as redundant with
  self-evident code.
- **F — UI components pt2** (12 files): ~30 shortened, several JSX comments deleted entirely.
- **G — Tests + `app/page.tsx`** (9 files): several test-file header/regression comments deleted
  outright (redundant with `it`/`describe` titles); 2 rationale blocks in `app/page.tsx` shortened.

**Verification (done independently, not just taking agents' word for it):**
- `git status`/`git diff --stat` confirms exactly the 58 planned files changed, nothing extra.
- `npx tsc --noEmit` — clean, zero errors.
- `npm run lint` — 22 errors / 6 warnings, identical to the pre-existing baseline established
  before this pass (all pre-existing `@typescript-eslint/no-require-imports` in Electron CJS
  files + one pre-existing unused-var warning) — no new lint issues introduced.
- Manually diffed `useLumen.ts` (the largest, highest-risk change at 629 changed lines): every
  added line is a comment line; no logic was altered.
- Each batch agent additionally self-verified via its own `git diff` filtered to non-comment
  lines, `tsc --noEmit`, and/or `eslint` runs — all reported clean.

**Deviation from plan**: none. The one adjustment made mid-flight was in Batch A's agent
recognizing that a few non-comment lines flagged by its own grep check in `db.js`
(`parseBibleXml`/`bytesToStore`/`previousRow`) were pre-existing uncommitted changes from an
earlier, unrelated task in this session (the Electron Bible-translation caching fix) — correctly
left untouched rather than misattributed to this pass.

All changes are uncommitted in the working tree, pending the user's review/commit decision.
