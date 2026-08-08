---
description: Break any task into sub-tasks, match each to the best-fit sub-agent from .claude/agents/, write PLAN.md, then execute and report back
argument-hint: [task description]
---

Task: $ARGUMENTS

Act as orchestrator for this task using the project's existing sub-agents (`.claude/agents/*.md`) — do not use the `Workflow` tool for this, delegate directly via the `Agent` tool.

1. **Survey the roster.** Read every file in `.claude/agents/` and note each agent's stated purpose. Also check whichever part of the codebase the task touches — don't assume state, verify with Read/Grep/Bash first.

2. **Decompose the task** ("$ARGUMENTS") into concrete sub-tasks. Only create a sub-task for a given agent if that agent's stated purpose is a genuine match — do not force-fit an agent with no clear responsibility here. It's fine for the final plan to use only one agent, or none at all (e.g. a pure investigation), or to conclude no code change is needed.

3. **Write `PLAN.md`** at the repo root (overwrite it if present — it's the live plan for the current task, not a running history) containing:
   - The task as you understood it
   - Which sub-agents will be used and why, each mapped explicitly to that agent's defined purpose (quote or reference the relevant line from its `.claude/agents/<name>.md`)
   - The order/dependencies between their tasks — what can run in parallel vs. what must wait on a prior result
   - What each sub-agent is expected to deliver (concrete, checkable output: code changes, a findings list, a verdict)

   Skip this step only if the task is trivial enough that a single agent (or none) is obviously sufficient — don't manufacture a multi-agent plan for a one-line fix.

4. **Confirm before executing** if any sub-agent's task involves modifying code, unless the user's request already made clear they want it run end-to-end without a pause.

5. **Execute the plan**: spawn each sub-agent via the `Agent` tool in the order/parallelism defined in `PLAN.md`, giving each enough standalone context to act (they do not see this conversation). Run independent agents in parallel (single message, multiple tool calls); run dependent ones sequentially, feeding prior results forward.

6. **Report back**: once all agents finish, summarize what each one actually did (not just what was planned) — call out any deviation, and update `PLAN.md`'s deliverables section to reflect real outcomes rather than leaving it as a stale prediction.
