---
description: Diagnose and fix a bug via the fix workflow (right specialist picks it up, verifies with lint/build, runs a security check if the fix touches sensitive areas)
argument-hint: [bug description, and optionally which files/area it's in]
---

Run the `fix` workflow:

```
Workflow({ name: "fix", args: { description: "$ARGUMENTS" } })
```

Once it completes, report back: what was actually wrong, what changed, the lint/build verification result, and the security-check result if one ran.
