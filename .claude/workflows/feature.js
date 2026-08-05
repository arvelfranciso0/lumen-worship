export const meta = {
  name: 'feature',
  description: 'Scope a new feature across subsystems, fan out only to the specialists it actually touches, then run integration/security/performance review as warranted',
  whenToUse: 'A feature that plausibly crosses subsystems (UI + Electron, UI + persistence, etc). For a single localized bug, use the "fix" workflow instead.',
  phases: [
    { title: 'Scope' },
    { title: 'Implement' },
    { title: 'Review' },
  ],
}

const description = args?.description
if (!description) {
  throw new Error('feature workflow requires args.description (what the feature should do)')
}

const SCOPE_SCHEMA = {
  type: 'object',
  required: [
    'summary',
    'touchesUI',
    'touchesElectron',
    'touchesPersistence',
    'touchesBibleData',
    'performanceSensitive',
    'securitySensitive',
    'tasks',
  ],
  properties: {
    summary: { type: 'string', description: 'One paragraph restating the feature and the approach' },
    touchesUI: { type: 'boolean' },
    touchesElectron: { type: 'boolean', description: 'Touches electron/main.js, preload.js, db.js, or IPC' },
    touchesPersistence: { type: 'boolean', description: 'Touches lib/repository (indexeddb or electron backend)' },
    touchesBibleData: { type: 'boolean', description: 'Touches Bible JSON data, search, or conversion scripts' },
    performanceSensitive: { type: 'boolean', description: 'Involves large data, animation, or hot render paths' },
    securitySensitive: { type: 'boolean', description: 'Involves file system access, IPC surface, or external data' },
    tasks: {
      type: 'object',
      description: 'Concrete, file-specific task per touched subsystem; null if not touched',
      properties: {
        ui: { type: ['string', 'null'] },
        electron: { type: ['string', 'null'] },
        persistence: { type: ['string', 'null'] },
        bible: { type: ['string', 'null'] },
      },
    },
  },
}

phase('Scope')
const scope = await agent(
  `You are scoping a new feature request for the lumen-worship codebase (Next.js + Electron worship presentation app — see CLAUDE.md and AGENTS.md for architecture: one useLumen.ts hook holds all state, lib/repository/ has indexeddb + electron backends, electron/ has main/preload/db).

Feature request: ${description}

Determine which subsystems this touches and whether it's performance- or security-sensitive. For each touched subsystem, write a concrete, scoped task for the specialist who will implement it — name the actual files/areas involved and the expected behavior, not a vague restatement. Leave a subsystem's task null if it isn't touched by this feature.`,
  { phase: 'Scope', schema: SCOPE_SCHEMA, label: 'scope' }
)

log(scope.summary)

const specialists = []
if (scope.touchesElectron && scope.tasks.electron) {
  specialists.push({ agentType: 'electron-pro', task: scope.tasks.electron, label: 'electron-pro' })
}
if (scope.touchesUI && scope.tasks.ui) {
  specialists.push({ agentType: 'react-specialist', task: scope.tasks.ui, label: 'react-specialist' })
}
if (scope.touchesPersistence && scope.tasks.persistence) {
  specialists.push({ agentType: 'typescript-pro', task: scope.tasks.persistence, label: 'persistence' })
}
if (scope.touchesBibleData && scope.tasks.bible) {
  specialists.push({ agentType: 'general-purpose', task: scope.tasks.bible, label: 'bible-data' })
}
if (specialists.length === 0) {
  specialists.push({ agentType: 'general-purpose', task: description, label: 'general' })
}

phase('Implement')
const implementations = await parallel(
  specialists.map((spec) => async () => {
    const result = await agent(
      `Implement this part of a larger feature in the lumen-worship codebase.

Overall feature: ${description}
Your scope: ${spec.task}

Follow existing conventions from CLAUDE.md/AGENTS.md (no single-letter variable names, Tailwind v4 CSS-first config with @layer gotchas, repository pattern for persistence, single useLumen.ts hook for state — no new context/Redux). Make the actual code changes, don't just describe them. Report what you changed, in which files, and why.`,
      { phase: 'Implement', agentType: spec.agentType, label: spec.label }
    )
    return { ...spec, result }
  })
)

const doneImplementations = implementations.filter(Boolean)
const implementationSummary = doneImplementations
  .map((item) => `### ${item.label}\nTask: ${item.task}\n\n${item.result}`)
  .join('\n\n')

phase('Review')
const reviewThunks = [
  () =>
    agent(
      `Review these implementation changes together for TypeScript and integration correctness. Check whether the pieces agree on shared types/interfaces and whether the seams between subsystems are consistent.

${implementationSummary}`,
      { phase: 'Review', agentType: 'typescript-pro', label: 'integration-review' }
    ).then((result) => ({ kind: 'integration', result })),
]

if (scope.securitySensitive || scope.touchesPersistence || scope.touchesElectron) {
  reviewThunks.push(() =>
    agent(
      `Security-review these changes — they touch persistence, IPC, or Electron. Look for injection, unsafe IPC surface exposed to the renderer, path traversal, or broken access checks.

${implementationSummary}`,
      { phase: 'Review', agentType: 'penetration-tester', label: 'security-review' }
    ).then((result) => ({ kind: 'security', result }))
  )
}

if (scope.performanceSensitive) {
  reviewThunks.push(() =>
    agent(
      `Review these changes for performance issues — unnecessary re-renders given the single useLumen.ts state hook, blocking work on the Electron main process, or inefficient data loading/queries.

${implementationSummary}`,
      { phase: 'Review', agentType: 'performance-engineer', label: 'performance-review' }
    ).then((result) => ({ kind: 'performance', result }))
  )
}

const reviews = (await parallel(reviewThunks)).filter(Boolean)

return {
  scope,
  implementations: doneImplementations.map(({ label, task, result }) => ({ label, task, result })),
  reviews,
}
