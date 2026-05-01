---
description: Top-down spec compliance audit. Every spec decision verified against implementation.
---

Invoke the `essense-flow:verify` skill in the current working directory.

Walk SPEC.md and ARCH.md top-down. For every design decision, dispatch a verification agent that reads code at the locator hint and produces a verdict: `implemented | partial | missing | drift`. Aggregate into VERIFICATION-REPORT.md.

`confirmed_gaps == 0` → complete. Otherwise route to triaging (default) or directly to elicit/architecture when the gap class is uniform.
