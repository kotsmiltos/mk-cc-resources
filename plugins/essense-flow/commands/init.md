---
description: Initialize essense-flow pipeline — write .pipeline/state.yaml from defaults.
---

Invoke the `essense-flow:context` skill in `init` mode in the current working directory.

Refuses if `.pipeline/state.yaml` already exists — caller should run `/heal` to reconcile prior state instead.

On success: state at `idle`. Recommended next: `/elicit "<your project pitch>"`.
