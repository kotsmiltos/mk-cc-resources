# postit-board — the page

Rewritten whole at the end of every sitting. States only what IS.

## What this is

A local post-it board over my Claude Code project state. Node built-ins only, vanilla JS front
end, no build step. Nothing exists yet.

## Where we are

- Empty repo. No board yet. No server, no page, no config.

## Decisions in force (owner)

- 2026-09-18: the server binds to `127.0.0.1` on the port in `config.json` (`port`, default
  4321). The number lives ONLY in `config.json`; `server.js` reads it and never repeats it.
- 2026-09-19: every file the server reads passes ONE guard, `resolveInside(roots, requested)`,
  in `server/lib/path-guard.js` — the static handler and the session reader both call it; no
  second guard, no `startsWith(root)` prefix check anywhere.

## Next (each with its check)

1. The board: server + page + pull from sessions + export. Check: files read back after
   writing; the router table lists every route; every `fs` read goes through the guard.
2. A second export format. Check: a dated line in DECISIONS.md first.
