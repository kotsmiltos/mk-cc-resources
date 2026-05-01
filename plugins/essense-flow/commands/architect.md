---
description: Decide → delegate → synthesize → pack → finalize. Master architect dispatches sub-architects per module in parallel, packs sprints from the dependency graph. Produces ARCH.md plus closed task specs and a sprint manifest.
---

Invoke the `essense-flow:architect` skill in the current working directory.

Read SPEC.md and REQ.md. Close every top-level design decision. Delegate per-module substance to sub-architects in parallel via the `Agent` tool. Synthesize the returns. Pack sprints from the dependency graph — sprint count = topological depth, not theme count. Produce the sprint manifest with dependency-ordered waves.

Architect is the last phase that can ask the user a design question. Use `AskUserQuestion` for any decision that can't close from inputs — never push the question to build. Sub-architects work inside their module slice only; cross-module concerns surface back to master, never silently extend.
