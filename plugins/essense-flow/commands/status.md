---
description: Show current pipeline phase, sprint, last_updated, recommended next command.
---

Invoke the `essense-flow:context` skill in `status` mode in the current working directory.

Read `.pipeline/state.yaml`. If degraded, surface the warning explicitly. Render: phase, sprint, wave, last_updated, canonical artifact paths the next phase will read, recommended next command.

Read-only — no state mutation.
