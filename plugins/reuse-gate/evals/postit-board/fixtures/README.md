# postit-board

A local post-it board over my Claude Code project state. Node built-ins only, vanilla JS front
end, no build step.

Two helpers already exist and are the only way to do their job here:

- `server/lib/atomic-json.js` — `writeJsonAtomic(file, value)` (temp → fsync → rename → read
  back) and `readJsonIfExists(file)`.
- `server/lib/path-guard.js` — `resolveInside(roots, requested)`, the one path-traversal guard.

Nothing else exists yet.
