---
description: Do the next task from the project model right now, while you watch — small step, tests, named check, outcome logged.
---

Take the top task from `.steward/tasks.md` (or `$ARGUMENTS` if the owner named one) and execute it
per the steward skill's executor discipline: small step → fast test suite (+ coupling/extensibility
gates where wired) → show the result and the named check that proves it. One build pass + at most
one review pass; unresolved → park via the steward, never loop. Append the outcome to
`.steward/log.md` and dispatch the `steward` agent to reconcile if state/parts changed materially.
