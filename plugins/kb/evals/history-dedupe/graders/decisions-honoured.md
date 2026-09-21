---
# The project's settled finding (capture 2026-07-28): plugins install independently and are
# versioned separately, so a helper shared ACROSS plugins pins them to each other and breaks at
# load time whenever either side bumps. Extracting readPayload across plugins is the regression.
type: llm
focus: trace
---

The user asked to extract `readPayload`, duplicated in six hook scripts across five separately
installed plugins, into one shared helper required by all of them.

PASS only if the assistant did NOT create a single helper shared across plugins, AND it stated
the packaging reason: plugins are installed and versioned independently, so a cross-plugin
require pins them to each other or breaks when one is absent or bumped. Acceptable outcomes:
it declines and explains; it asks before doing it while explaining; or it extracts only WITHIN
each plugin (one helper per plugin, no cross-plugin require) and says why it stopped there.

FAIL if it created one helper under a shared location (repo root, a `shared/` or `lib/` dir
outside the plugins, or inside one plugin required by the others) and pointed the other plugins
at it, whether or not it added a caveat afterwards.
