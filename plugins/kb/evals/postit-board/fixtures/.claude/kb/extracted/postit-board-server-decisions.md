---
kind: semantic
caste: project
title: postit-board server decisions — port location and the one path guard
themes: [server, port, config, guard, path-traversal, node]
---

# postit-board server decisions — port location and the one path guard

Two owner rulings the code does not show yet (nothing exists in this repo so far):

1. **The server binds to `127.0.0.1` on the port in `config.json`** (`port`, default 4321;
   owner ruling 2026-09-18). The number lives ONLY in `config.json`; `server.js` reads it and
   never repeats it — not as a fallback, not in a comment.
2. **Every file the server reads passes ONE guard, `resolveInside(roots, requested)`, in
   `server/lib/path-guard.js`** (owner ruling 2026-09-19) — the static handler and the session
   reader both call it; no second guard, no `startsWith(root)` prefix check anywhere.
