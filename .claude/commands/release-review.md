---
description: Pre-release audit across UI/UX, logic edge cases, and security, with adversarial verification before anything is reported — via the release-review workflow
argument-hint: [optional scope, e.g. "PreviewPanel.tsx and the Bible tour changes" — defaults to the current uncommitted working-tree diff]
---

Run the `release-review` workflow:

```
Workflow({ name: "release-review", args: { scope: "$ARGUMENTS" } })
```

Once it completes, report back: how many candidate findings came out of each dimension (UI/UX, logic edge cases, security), how many survived adversarial verification vs. were refuted, and list the confirmed findings with severity. Include any unverified minor findings too, clearly labeled as unverified.
