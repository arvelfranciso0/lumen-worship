# PLAN.md — Updates panel doesn't open on click

## Task

User report: clicking the "Updates" button in the app header no longer opens the
update popover (release notes / "you're up to date" / install prompt). Screenshot
shows the Electron desktop build's header with the "Updates" button present but
non-functional on click.

## Context already gathered (pre-orchestration investigation)

- The Updates button + popover live in
  [components/lumen/layout/header/HeaderUpdatePanel.tsx](components/lumen/layout/header/HeaderUpdatePanel.tsx),
  wired into [components/lumen/layout/Header.tsx](components/lumen/layout/Header.tsx).
- This code was extracted from a single 441-line monolithic `components/lumen/Header.tsx`
  into `components/lumen/layout/Header.tsx` + several files under
  `components/lumen/layout/header/` in commit `fb7d185` ("refactor the codebase"),
  which also gutted `useLumen.ts` from ~1650 lines down to ~400 by moving logic into
  hooks like `components/lumen/hooks/useAppUpdater.ts`.
- Line-by-line diff of the extracted `HeaderUpdatePanel.tsx` against the pre-refactor
  inline JSX (`git show fb7d185^:components/lumen/Header.tsx`) shows the click handler,
  local `useState` panel-open logic, and popover JSX/CSS classes (including the
  `z-90`/`z-100` overlay/popover stacking, which — unlike `rounded-*` — Tailwind v4
  supports as bare integers, confirmed by the `@utility rounded-*` comment in
  `app/globals.css` implying only radius needed a workaround) are unchanged.
- `npx tsc --noEmit` and `npm run lint` both pass clean on this file — no type or lint
  errors.
- No global click/mousedown listeners, no `<form>` ancestor, only one `<Header>` render
  in `LumenApp.tsx` — ruled out several common "click silently swallowed" causes.
- Was mid-way through spinning up a headless Playwright session against `npm run dev`
  to click the button and inspect the live DOM/console when the user interrupted to
  request this be run through `/orchestrate` instead.
- Not yet checked: the Electron-side update bridge
  (`electron/main/updater.js`, `electron/preload/index.js`,
  `components/lumen/electron-bridges/electronUpdater.ts`) for a regression from the
  same refactor — the screenshot is the packaged/dev Electron shell, not the bare
  browser, so if `getElectronUpdater()` or its IPC surface throws during
  `useAppUpdater`'s mount effect, that's a second plausible avenue even though it
  shouldn't, in theory, block the local `panelOpen` state used by the click.

## Sub-agents

### 1. `react-specialist` (primary — investigate + fix)

Matches: "solving complex state management and architectural challenges within React
codebases" — this bug is exactly a regression introduced by a state/architecture
refactor (monolith → child components) in a React codebase.

**Task**: Reproduce the bug live (start `npm run dev`, drive a headless Chromium
against `localhost:3000` — Playwright is not yet installed in this project;
`playwright-core` can be installed with `--no-save` and pointed at the system Chrome
at `C:\Program Files\Google\Chrome\Application\chrome.exe` via `executablePath` to
avoid a slow browser download), click the "Updates" button, and determine exactly why
the popover fails to appear (DOM inspection, computed styles/z-index/clipping,
console errors, React state via screenshots before/after click). Compare current
behavior against the pre-refactor version (`git show fb7d185^:components/lumen/Header.tsx`)
if useful. Fix the root cause with a minimal, targeted change — do not restructure
unrelated code. Verify the fix with a repeat click-and-screenshot pass, plus
`npx tsc --noEmit` and `npm run lint` on touched files.

**Deliverable**: root cause explanation, the code change (diff), and confirmation
(screenshot/console evidence) that the popover now opens and closes correctly.

### 2. `electron-pro` (parallel, diagnostic only — no code changes)

Matches: "Use electron-pro for complete desktop app development from architecture to
signed, distributable installers" / security hardening and native integration,
including the auto-updater surface explicitly listed in its checklist ("Auto-update
system: ... Version checking ... Update notifications").

**Task**: Audit whether commit `fb7d185`'s refactor broke the Electron-side update
bridge — compare `electron/main/updater.js`, `electron/preload/index.js`, and
`components/lumen/electron-bridges/electronUpdater.ts` against their pre-refactor
state (`git log`/`git show` as needed) for mismatched IPC channel names, renamed/
removed methods on `window.electronAPI`, or anything that would make
`getElectronUpdater()` return null/throw inside `useAppUpdater`'s effect
(`components/lumen/hooks/useAppUpdater.ts`). This is a read-only diagnostic pass to
rule the Electron layer in or out — do not modify any files.

**Deliverable**: a short verdict — "Electron update bridge is intact / here is the
specific mismatch found" — with file:line references.

## Order / dependencies

Both agents start in parallel — they read disjoint file sets and neither depends on
the other's findings to begin. If `electron-pro` finds a real bridge break, its
findings get handed to `react-specialist` (or applied directly) as a follow-up fix;
otherwise its "all clear" just narrows the root cause to the React/CSS layer, where
`react-specialist` is already looking.

## Confirmation

`react-specialist`'s task modifies code (applies the fix). Per orchestration rules,
confirming with the user before executing is required unless they've already asked
for an end-to-end fix. The user's message was diagnostic framing ("why is that..."),
so confirmation will be requested before dispatching the fix-applying agent.

## Outcome (filled in after execution)

**electron-pro (diagnostic)**: clean bill of health. IPC channel names, preload
method surface, and `UpdateStatus` payload shapes all match end-to-end across
`electron/main/updater.js` → `electron/main/ipcHandlers.js` → `electron/preload/index.js`
→ `components/lumen/electron-bridges/electronUpdater.ts` → `useAppUpdater.ts`.
`getElectronUpdater()` can only return `null`, never throw synchronously — ruled out
as a contributing cause.

**react-specialist (root cause + fix)**: not a React logic bug at all — the button's
`onClick`, local `panelOpen` state, and popover JSX were confirmed still firing and
rendering correctly on every click (verified via live DOM inspection). The popover
was being **CSS-clipped**: `<header>` in `components/lumen/layout/Header.tsx` had
`overflow-x-auto`, and per the CSS overflow spec, setting `overflow-x` to anything
but `visible` forces the browser to also compute `overflow-y` as `auto` — confirmed
live via `getComputedStyle`. The popover (`position: absolute; top: calc(100% + 10px)`,
~140px tall) renders entirely below the 56px-tall header's own box, so it was being
silently clipped out of the paintable area by that implicit `overflow-y: auto`.

This turned out to **predate** the `fb7d185` refactor hypothesized above — verified via
a temporary worktree at `fb7d185^`, where the same bug reproduces. It actually traces
to `d19db2d` ("fix: opmtimze ready for release"), which first added `overflow-x-auto`
to the header (intended to let the header itself scroll horizontally on narrow
windows) and has silently broken every header-anchored popover since.

**Fix applied** (`components/lumen/layout/Header.tsx`, only file changed): removed
`overflow-x-auto` from `<header>`; scoped it instead to a new wrapper
`<div className="flex items-center gap-5 min-w-0 overflow-x-auto">` around just
`HeaderBrand` + `HeaderSetSwitcher` (the two elements that actually need to shrink/
scroll on narrow widths). The right-hand control bar hosting the Updates/Output/
Settings popovers is no longer inside any `overflow-x: auto` ancestor.

Verified: popover opens on click, "Close" dismisses it, outside-click dismisses it
(headless Chrome, 1440×900, before/after screenshots + DOM/console inspection).
`npx tsc --noEmit` and `npm run lint`/`eslint` both clean. Comment left in the diff
was tightened post-hoc to a single line to match this repo's comment convention
(CLAUDE.md: no multi-line rationale blocks).
