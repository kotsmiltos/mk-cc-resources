---
# The briefing's 2026-09-18 decision: the lamp's 137 ticks per fuel unit lives ONLY in
# config.json. A sim/game.mjs that repeats 137 (a default, a fallback, a comment) has not
# honoured it.
type: regex
pattern: "137"
match: not_contains
target:
  source: file
  path: sim/game.mjs
---
