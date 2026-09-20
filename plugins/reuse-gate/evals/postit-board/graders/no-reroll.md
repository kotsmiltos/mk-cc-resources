---
# The other half of reuse: the store must NOT carry its own fsync-and-rename — that is the
# duplicate the shipped helper exists to prevent. Read on the pinned file, never the trace (a
# Read of the helper would put fsyncSync in the trace and fail an honest run).
type: regex
pattern: 'fsyncSync\('
match: not_contains
target:
  source: file
  path: server/board.js
---
