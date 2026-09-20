---
name: postit-board
description: One simple web app, built in ONE shot, in the owner's Node house style. PROJECT.md exists, so the page duty must have it rewritten before the turn yields, and self-check must have the final message name the check. Two out-of-code decisions sit in the page's "Decisions in force".
tags: [progress-captured, verified-done, decisions-honoured]
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

Read the page first. There is no shell here: write the files only (`server.js`, `server/`,
`web/`, `config.json`, a README with the run command). When you are done, say exactly what you
checked and what you could not.
