---
description: Show essense-flow commands and the recommended order.
---

Display the essense-flow command list:

**Pipeline phases** (run in order, or use `/next` to see what's recommended):

- `/elicit "<pitch>"` — turn pitch into build-ready SPEC.md
- `/research` — multi-perspective synthesis to REQ.md
- `/triage` — categorize and route open items
- `/architect` — close design + decompose + package task specs
- `/build` — execute the current sprint
- `/review` — adversarial QA with path-evidence
- `/verify` — top-down spec compliance audit

**Utility:**

- `/init` — write initial `.pipeline/state.yaml`
- `/status` — show current phase + recommended next
- `/next` — recommended next slash command for current phase
- `/heal` — recover from any prior state (mid-flight, prior tool's artifacts, code-without-spec)

**Principles** (read-only): see `references/principles.md` in the plugin install. Four rules — Graceful-Degradation, Front-Loaded-Design, Fail-Soft, Diligent-Conduct — plus INST-13 (no resource caps).

**Design intent:** adaptive depth, advisory tooling, closed contracts, evidence-bound verification, kind conduct.
