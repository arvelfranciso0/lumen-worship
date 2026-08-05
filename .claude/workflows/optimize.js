export const meta = {
  name: 'optimize',
  description: 'Audit performance across subsystems, prioritize bottlenecks by impact vs. effort, fix the top-ranked ones, then verify',
  whenToUse: 'Broad performance/optimization requests (e.g. "reduce lag on low-end laptops") that are not a single bug or a new feature.',
  phases: [
    { title: 'Find' },
    { title: 'Prioritize' },
    { title: 'Fix' },
    { title: 'Verify' },
  ],
}

const description = args?.description || 'Reduce lag and improve responsiveness on low-end laptops.'
const requestedAreas = args?.areas

const FINDERS = [
  {
    area: 'rendering',
    agentType: 'react-specialist',
    focus:
      'Look at components/lumen/useLumen.ts and how its entire return value fans out as the single `lumen` prop to every component. Identify missing memoization, components that re-render more than necessary, or expensive derived values recomputed on every render.',
  },
  {
    area: 'electron',
    agentType: 'electron-pro',
    focus:
      'Look at electron/main.js, preload.js, and db.js. Identify blocking work on the main process (the hand-rolled local HTTP server, synchronous IPC or node:sqlite calls) that would cause UI lag, especially on low-end hardware.',
  },
  {
    area: 'persistence',
    agentType: 'typescript-pro',
    focus:
      'Look at lib/repository/ (indexeddb.ts and the electron backend). Identify inefficient queries, excessive or un-debounced writes, or redundant reads.',
  },
  {
    area: 'bible-data',
    agentType: 'general-purpose',
    focus:
      'Look at public/bible/json data and components/lumen/bibleSearch.ts. Identify eager loading of large translations, repeated parsing, or search logic that scales poorly with translation size.',
  },
  {
    area: 'bundle',
    agentType: 'performance-engineer',
    focus:
      'Look at the Next.js static export (next.config.ts, app/, components/lumen/). Identify bundle size issues, missing code-splitting/lazy loading, or heavy dependencies that matter most on low-memory hardware.',
  },
]

const finders = requestedAreas
  ? FINDERS.filter((finder) => requestedAreas.includes(finder.area))
  : FINDERS

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['description', 'file', 'impact', 'effort'],
        properties: {
          description: { type: 'string' },
          file: { type: 'string' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          effort: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
  },
}

phase('Find')
const findResults = await parallel(
  finders.map((finder) => async () => {
    const result = await agent(
      `You are auditing the lumen-worship codebase (Next.js + Electron worship presentation app) for performance issues. Goal: ${description}

${finder.focus}

Report concrete findings only — do not fix anything yet. For each finding, give the file, a description of the bottleneck, its impact on low-end hardware (high/medium/low), and the effort to fix (low/medium/high). If there is nothing notable in this area, return an empty findings list rather than inventing minor nitpicks.`,
      { phase: 'Find', agentType: finder.agentType, schema: FINDINGS_SCHEMA, label: finder.area }
    )
    return { area: finder.area, agentType: finder.agentType, findings: result.findings }
  })
)

const allFindings = findResults
  .filter(Boolean)
  .flatMap((entry) => entry.findings.map((finding) => ({ ...finding, area: entry.area })))

log(`Found ${allFindings.length} candidate issue(s) across ${finders.length} area(s).`)

if (allFindings.length === 0) {
  return { findings: [], prioritized: [], fixed: [], verification: null }
}

const PRIORITY_SCHEMA = {
  type: 'object',
  required: ['prioritized'],
  properties: {
    prioritized: {
      type: 'array',
      items: {
        type: 'object',
        required: ['area', 'description', 'file', 'impact', 'effort', 'fixNow'],
        properties: {
          area: { type: 'string' },
          description: { type: 'string' },
          file: { type: 'string' },
          impact: { type: 'string' },
          effort: { type: 'string' },
          fixNow: { type: 'boolean', description: 'True if this should be fixed in this pass' },
          reason: { type: 'string', description: 'Why this was ranked where it was' },
        },
      },
    },
  },
}

phase('Prioritize')
const priority = await agent(
  `Here are performance findings across the lumen-worship codebase, gathered independently per subsystem:

${JSON.stringify(allFindings, null, 2)}

Goal: ${description}

Rank ALL of these by real-world impact on a low-end laptop versus effort to fix. Mark fixNow: true for the set worth fixing in this pass (favor high-impact/low-effort first; don't mark something fixNow if it's high-effort and only medium/low impact — defer those instead). Give a one-line reason per item. Do not drop any finding from the list — every input finding must appear in the output, just marked fixNow true or false.`,
  { phase: 'Prioritize', agentType: 'performance-engineer', schema: PRIORITY_SCHEMA, label: 'prioritize' }
)

const toFix = priority.prioritized.filter((item) => item.fixNow)
const deferred = priority.prioritized.filter((item) => !item.fixNow)
log(`Prioritized: ${toFix.length} to fix now, ${deferred.length} deferred.`)

const areaToAgentType = Object.fromEntries(finders.map((finder) => [finder.area, finder.agentType]))
const byArea = new Map()
for (const item of toFix) {
  if (!byArea.has(item.area)) byArea.set(item.area, [])
  byArea.get(item.area).push(item)
}

phase('Fix')
const fixResults = await parallel(
  Array.from(byArea.entries()).map(([area, items]) => async () => {
    const result = await agent(
      `Fix these prioritized performance issues in the lumen-worship codebase. Follow existing conventions (CLAUDE.md/AGENTS.md — no single-letter variable names, Tailwind v4 CSS-first config, repository pattern, single useLumen.ts state hook). Make the actual code changes, one at a time, and keep each fix minimal and targeted — don't refactor beyond what's needed to resolve the issue.

${items.map((item, index) => `${index + 1}. [${item.file}] ${item.description} (impact: ${item.impact}, effort: ${item.effort})`).join('\n')}

Report what you changed per item.`,
      { phase: 'Fix', agentType: areaToAgentType[area] || 'general-purpose', label: `fix:${area}` }
    )
    return { area, items, result }
  })
)

phase('Verify')
const verification = await agent(
  `Run "npm run lint" and "npm run build" in the lumen-worship repo (working directory is the project root) to verify the following performance fixes didn't break anything:

${fixResults.filter(Boolean).map((entry) => `### ${entry.area}\n${entry.result}`).join('\n\n')}

Report pass/fail for each command and paste any errors verbatim.`,
  { phase: 'Verify', agentType: 'general-purpose', label: 'verify' }
)

return {
  findings: allFindings,
  prioritized: priority.prioritized,
  fixed: fixResults.filter(Boolean),
  deferred,
  verification,
}
