export const meta = {
  name: 'release-review',
  description: 'Pre-release audit across UI/UX, logic edge cases, and security, with adversarial verification before anything is reported',
  whenToUse: 'Before shipping a batch of changes — reviews the current uncommitted diff (or a described scope) across three dimensions in parallel, then tries to refute every finding before it counts as real.',
  phases: [
    { title: 'Review' },
    { title: 'Verify' },
    { title: 'Report' },
  ],
}

// Workflow's `args` sometimes arrives as a JSON-encoded string instead of the
// parsed object it's documented to be — normalize defensively rather than
// trusting the shape.
function normalizeArgs(rawArgs) {
  if (rawArgs && typeof rawArgs === 'object') return rawArgs
  if (typeof rawArgs === 'string') {
    try {
      const parsed = JSON.parse(rawArgs)
      if (parsed && typeof parsed === 'object') return parsed
    } catch { /* not JSON — treat the whole string as the scope below */ }
    return { scope: rawArgs }
  }
  return {}
}

const normalizedArgs = normalizeArgs(args)
const scope = normalizedArgs.scope
  || 'the current uncommitted working-tree changes in this repo — run `git status` and `git diff` to see exactly what changed'

const DIMENSIONS = [
  {
    key: 'ui-ux',
    agentType: 'react-specialist',
    prompt: `Review the lumen-worship app (Next.js + Electron worship presentation app — see CLAUDE.md/AGENTS.md for architecture and conventions) for UI/UX bugs before release. Scope: ${scope}

Check for: layout or scroll regressions, responsive/breakpoint issues (mobile/tablet/desktop — see useViewportBreakpoint.ts), styling inconsistent with the Tailwind v4 CSS-first conventions in CLAUDE.md (especially the @layer gotcha for global element resets), broken or missing loading/empty states, and any leftover dead UI or dangling references from recently removed features. Report only concrete, reproducible findings — steps to see it, not style opinions.`,
  },
  {
    key: 'logic-edge-cases',
    agentType: 'typescript-pro',
    prompt: `Review the lumen-worship app's state logic for edge-case bugs before release. Scope: ${scope}

components/lumen/useLumen.ts is the single source of truth for all app state and actions — every component reads from it. Pay particular attention to: state that can desync from what's actually rendered or actually presenting, side effects that fire from the wrong trigger (e.g. a toggle that should only change via its own control changing as a side effect of something unrelated), race conditions between debounced persistence and rapid user actions, stale closures in event handlers or effects, and missing cleanup in timers/listeners/refs. Report only concrete, reproducible findings — the exact state/input sequence that breaks, not theoretical concerns.`,
  },
  {
    key: 'security',
    agentType: 'penetration-tester',
    prompt: `Security-review the lumen-worship app before release. Scope: ${scope}

This is an Electron app: check IPC handlers (electron/main.js, preload.js) for missing sender/origin validation on anything the renderer can trigger, filesystem writes (electron/db.js, Bible translation import) for path traversal or unsanitized user input, and any other surface exposed from main process to renderer via contextBridge. Report concrete findings with a reproduction, or explicitly confirm an area is clean rather than staying silent on it.`,
  },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'file', 'description', 'severity'],
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          description: { type: 'string', description: 'The concrete failure scenario: what input/state triggers it and what actually goes wrong' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'reasoning'],
  properties: {
    refuted: { type: 'boolean', description: 'True if this finding does NOT hold up — false positive, already handled, or not reproducible' },
    reasoning: { type: 'string' },
  },
}

phase('Review')
const reviews = await parallel(
  DIMENSIONS.map((dimension) => async () => {
    const result = await agent(dimension.prompt, {
      phase: 'Review',
      agentType: dimension.agentType,
      schema: FINDINGS_SCHEMA,
      label: `review:${dimension.key}`,
    })
    return { dimension: dimension.key, findings: (result && result.findings) || [] }
  })
)

const allFindings = reviews
  .filter(Boolean)
  .flatMap((review) => review.findings.map((finding) => ({ ...finding, dimension: review.dimension })))

log(`${allFindings.length} candidate finding(s) across ${DIMENSIONS.length} dimensions.`)

if (allFindings.length === 0) {
  return { scope, totalCandidates: 0, confirmed: [], rejected: [], unverifiedMinor: [] }
}

// Verifying every minor nitpick would blow the agent budget on low-value
// findings — only blocker/major claims get an adversarial pass. Minor
// findings are reported as-is, clearly labeled unverified, rather than
// silently dropped.
const toVerify = allFindings.filter((finding) => finding.severity !== 'minor')
const unverifiedMinor = allFindings.filter((finding) => finding.severity === 'minor')

phase('Verify')
const verified = await parallel(
  toVerify.map((finding) => async () => {
    const verdict = await agent(
      `Try to refute this pre-release review finding for the lumen-worship codebase. Read the actual file and confirm whether this is a real, reproducible bug — default to refuted:true if you cannot reproduce it or the code doesn't actually support the claim.

Title: ${finding.title}
File: ${finding.file}
Claimed severity: ${finding.severity}
Description: ${finding.description}`,
      { phase: 'Verify', schema: VERDICT_SCHEMA, label: `verify:${finding.file}` }
    )
    return { ...finding, refuted: verdict ? verdict.refuted : true, reasoning: verdict ? verdict.reasoning : 'verifier failed' }
  })
)

const confirmed = verified.filter(Boolean).filter((finding) => !finding.refuted)
const rejected = verified.filter(Boolean).filter((finding) => finding.refuted)

phase('Report')
log(`${confirmed.length} confirmed, ${rejected.length} refuted, ${unverifiedMinor.length} minor finding(s) reported unverified.`)

return { scope, totalCandidates: allFindings.length, confirmed, rejected, unverifiedMinor }
