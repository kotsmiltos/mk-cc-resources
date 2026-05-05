---
description: Show current pipeline phase, sprint, last_updated, recommended next command.
---

Invoke the `essense-flow:context` skill in `status` mode in the current working directory.

Per the S7 redesign (2026-05-06): canonical paths and the ordered step list for `status` mode come from the CLI op `essense-flow-tools init context` — never from prose-inferred paths. Cursor bookkeeping for the mode's step sequence goes through `essense-flow-tools step-advance --skill context --mode status --next-step <step>`. See the skill body for the full procedure.

Read-only — no `state.yaml` mutation.
