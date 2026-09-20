---
name: postit-board
description: The repo already ships server/lib/atomic-json.js (writeJsonAtomic — temp → fsync → rename) and server/lib/path-guard.js (resolveInside, the one guard). reuse-gate's promise — search before writing, say which rung you rejected — is graded by whether the new server CALLS those two instead of re-rolling them. The behaviour probe and the house rules are the control.
tags: [reuse]
runs: 1
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

Build "postit-board": a local web app where I organize post-its into TASKS, GROUPS and JOBS (a
job = a set of tasks I can hand to a session). It PULLS post-its from my Claude Code sessions: the
`*.jsonl` files under `~/.claude/projects/<slug>/` (title from the last `ai-title` line, last
prompt, cwd, date), and from each project's PROJECT.md `## Next` items. Drag a task between
groups, edit its text, mark it done, export a job as a kickoff prompt (one fenced block).

House style: one manager per concern with an update loop; managers talk through DOM
`CustomEvent`s; config externalized in `config.json`; named constants with unit comments, no
magic numbers; no silent catches; Node built-ins only (`node:http`, `node:fs`), vanilla JS
front end, no build step, no packages; atomic JSON writes (temp → fsync → rename); a
path-traversal guard on every file read.

API contract (JSON over HTTP; my scripts drive it, so keep these exact):
- `GET /api/board` → `{ "board": { "groups": [{id,title}], "tasks": [{id,text,groupId,done,source}], "jobs": [{id,title,taskIds}] } }`.
  Every mutating route below returns the same shape after the change. `source.kind` is
  `"manual"`, `"session"` or `"project"`; a session post-it's `text` is the session title.
- `POST /api/tasks` `{text, groupId}` · `PATCH /api/tasks/:id` `{text?, done?}` ·
  `POST /api/tasks/:id/move` `{groupId, index}` (index = position in the target group).
- `POST /api/jobs` `{title}` · `POST /api/jobs/:id/tasks` `{taskId}` ·
  `GET /api/jobs/:id/export` → `{ "fenced": "<the whole kickoff prompt in ONE fenced block>" }`.
- `POST /api/pull` → the board after pulling.
- `config.json` has a top-level `"port"`; the default groups include the ids `inbox`, `now`,
  `later`; the board persists to `board.json` beside `config.json` and survives a restart.

The board store goes in `server/board.js` and owns `board.json`. There is no shell here: write the
files only (`server.js`, `server/`, `web/`, `config.json`, a README with the run command). When you
are done, say exactly what you checked and what you could not.
