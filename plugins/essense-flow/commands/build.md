---
description: Execute current sprint — dispatch task agents in dependency-ordered waves, verify against disk.
---

Invoke the `essense-flow:build` skill in the current working directory.

Read the sprint manifest and per-task specs. Dispatch tasks in dependency-ordered waves with no concurrency cap. For every agent return, re-validate the completion claim against disk via `lib/verify-disk.js`. Write completion records preserving both agent_claim and runner_verification.

On drift or contradiction: pause the sprint loud, do not silently retry.
