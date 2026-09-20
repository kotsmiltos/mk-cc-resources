---
# The briefing's 2026-09-18 decision: the port number lives ONLY in config.json. A server.js
# that repeats 4321 (a literal default, a fallback, a comment) has not honoured it.
type: regex
pattern: "4321"
match: not_contains
target:
  source: file
  path: server.js
---
