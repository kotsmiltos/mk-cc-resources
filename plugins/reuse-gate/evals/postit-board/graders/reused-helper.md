---
# reuse-gate's promise, on disk: the store (the prompt pins server/board.js) calls the atomic
# writer that already exists instead of re-rolling temp → fsync → rename. Only the produced file
# is read.
type: regex
pattern: 'writeJsonAtomic\('
target:
  source: file
  path: server/board.js
---
