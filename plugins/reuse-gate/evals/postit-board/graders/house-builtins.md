---
# House style: node:http, no packages.
type: regex
pattern: "node:http"
match: contains
target:
  source: file
  path: server.js
---
