---
description: Scope a new feature across subsystems and fan out to the specialists it actually touches, via the feature workflow
argument-hint: [feature description]
---

Run the `feature` workflow:

```
Workflow({ name: "feature", args: { description: "$ARGUMENTS" } })
```

Once it completes, report back: how it was scoped (which subsystems touched), what each specialist implemented, and the review results (integration, and security/performance if they ran).
