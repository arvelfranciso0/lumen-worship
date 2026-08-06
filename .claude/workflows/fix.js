export const meta = {
  name: 'fix',
  description: 'Diagnose and fix a bug, verify with lint/build, and run a security check when the fix touches sensitive areas',
  whenToUse: 'A single, localized bug report. Not for multi-subsystem feature work — use the "feature" workflow for that.',
  phases: [
    { title: 'Fix' },
    { title: 'Verify' },
    { title: 'Security Check' },
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
    } catch { /* not JSON — treat the whole string as the description below */ }
    return { description: rawArgs }
  }
  return {}
}

const normalizedArgs = normalizeArgs(args)
const description = normalizedArgs.description
const filesHint = normalizedArgs.files || ''

if (!description) {
  throw new Error('fix workflow requires args.description (what is broken and how to reproduce it)')
}

const haystack = `${description} ${filesHint}`

const agentType = /electron|ipc|main\.js|preload|db\.js|sqlite/i.test(haystack)
  ? 'electron-pro'
  : /component|\.tsx|render|ui\b/i.test(haystack)
  ? 'react-specialist'
  : /generic|type\b|typescript/i.test(haystack)
  ? 'typescript-pro'
  : 'general-purpose'

const sensitive = /ipc|electron|main\.js|preload|db\.js|sqlite|indexeddb|auth|token|password|path|file system/i.test(haystack)

phase('Fix')
const fixResult = await agent(
  `Diagnose and fix this bug in the lumen-worship codebase (Next.js + Electron worship presentation app — see CLAUDE.md and AGENTS.md for architecture and conventions).

Bug description: ${description}
${filesHint ? `Relevant files/area: ${filesHint}` : ''}

Find the root cause (don't just patch the symptom), apply a minimal fix consistent with existing conventions, and make the actual code change. Report what was wrong, what you changed, and why.`,
  { phase: 'Fix', agentType, label: `fix (${agentType})` }
)

phase('Verify')
const verifyResult = await agent(
  `Run "npm run lint" and "npm run build" in the lumen-worship repo (working directory is the project root) to verify this fix didn't break anything:

${fixResult}

Report pass/fail for each command and paste any errors verbatim.`,
  { phase: 'Verify', agentType: 'general-purpose', label: 'verify' }
)

let securityResult = null
if (sensitive) {
  phase('Security Check')
  securityResult = await agent(
    `Security-review this bug fix. It touches Electron IPC, the filesystem, persistence, or auth-adjacent code, so check carefully:

${fixResult}

Look for injection, unsafe IPC surface exposed to the renderer, path traversal, or broken access checks. Report concrete findings, or confirm it's clean.`,
    { phase: 'Security Check', agentType: 'penetration-tester', label: 'security-check' }
  )
}

return { fix: fixResult, verification: verifyResult, security: securityResult }
