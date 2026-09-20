# postit-board — briefing

## Where we are
- Empty repo. No board yet: no server, no page, no config.

## Decisions in force (owner)
- 2026-09-18: the server binds to `127.0.0.1` on the port in `config.json` (`port`, default
  4321). The number lives ONLY in `config.json`; `server.js` reads it and never repeats it — not
  as a fallback, not in a comment.
- 2026-09-19: every file the server reads passes ONE guard, `resolveInside(roots, requested)`,
  in `server/lib/path-guard.js` — the static handler and the session reader both call it; no
  second guard, no `startsWith(root)` prefix check anywhere.

## Next
1. The board: server + page + pull from sessions + export (check: files read back after writing,
   every `fs` read goes through the guard).
