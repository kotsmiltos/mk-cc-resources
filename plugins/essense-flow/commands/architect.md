---
description: Decide → decompose → package. Produce ARCH.md plus closed task specs and a sprint manifest.
---

Invoke the `essense-flow:architect` skill in the current working directory.

Read SPEC.md and REQ.md. Close every design decision. Decompose to leaves. Package each leaf as a closed task spec. Produce the sprint manifest with dependency-ordered waves.

Architect is the last phase that can ask the user a design question. Use `AskUserQuestion` for any decision that can't close from inputs — never push the question to build.
