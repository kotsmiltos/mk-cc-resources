---
# House style: node:http, no packages. A server.js that imports/requires express (or any
# non-node: module) fails; one that uses node:http passes.
type: regex
pattern: "node:http"
match: contains
target:
  source: file
  path: server.js
---
