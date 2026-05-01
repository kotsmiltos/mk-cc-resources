---
description: Pipeline self-heal — infer phase from on-disk artifacts, propose walk-forward.
---

Invoke the `essense-flow:heal` skill in the current working directory.

Walks the project directory, reads artifact bodies (not just listings), infers the pipeline phase, proposes a walk-forward via legal transitions one step at a time. Applies only on user confirm via `AskUserQuestion`.

Handles every entry case: fresh project, mid-flight pause, prior-tool artifacts, code-without-spec.
