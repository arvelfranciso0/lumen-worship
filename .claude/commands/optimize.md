---
description: Audit performance across subsystems, prioritize bottlenecks by impact vs. effort, fix the top-ranked ones, then verify — via the optimize workflow
argument-hint: [optimization goal, e.g. "reduce lag on low-end laptops"]
---

Run the `optimize` workflow:

```
Workflow({ name: "optimize", args: { description: "$ARGUMENTS" } })
```

Once it completes, report back: what was found, what was fixed vs. deferred (and why), and the lint/build verification result.
