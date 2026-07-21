---
description: Show where the ship is right now — reprint this project's steward briefing (state, last changes, next tasks, decisions waiting).
---

If `.steward/briefing.md` exists and the model hasn't changed this session, show it verbatim.
Otherwise dispatch the `steward` agent (job: brief) to regenerate it from the model first, then
show it. If the project has no `.steward/`, say so and point at /steward:seed.
