---
description: Adversarial QA on the current sprint. Bug-find + drift-find with path-evidence.
---

Invoke the `essense-flow:review` skill in the current working directory.

Read SPEC.md, ARCH.md, sprint manifest, SPRINT-REPORT, and the modified code. Spawn adversarial agents (correctness, contract-compliance, hidden-state, failure-modes, spec-drift, functional-testing — adaptive to what the sprint touched). Every finding carries verbatim path evidence; quotes are re-validated against disk.

The deterministic gate: `confirmed_unacknowledged_criticals`. Zero → advance to verifying. Non-zero → route to triaging.
