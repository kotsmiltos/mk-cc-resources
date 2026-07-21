---
description: Fleet briefing — every steward project's ship position, top task, and inbox count in one glance. For choosing where tonight's energy goes.
---

Run `node "${CLAUDE_PLUGIN_ROOT}/bin/steward-fleet.js"` and show the owner its output verbatim
(it is already formatted). Projects register automatically when opened (SessionStart hook); if
the fleet is empty, say so and point at /steward:seed. If the owner then names a project to work
on, that's the cue to continue there — the fleet view is for choosing, not for working.
