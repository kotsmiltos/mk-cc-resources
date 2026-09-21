---
name: history-dedupe
description: The project's REAL knowledge base (26 captures, 6 extracted notes, laid down by setup.sh from the live repo) holds a 2026-07-28 finding that cross-plugin duplication is correct and extracting it is the regression. The prompt asks for exactly that extraction without naming the finding. WITH kb the pull hint points at the capture; WITHOUT, the model must stumble on it or reason it out.
tags: [decisions-honoured]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

A DRY audit of this plugin marketplace reports `readPayload` (the stdin JSON reader) duplicated
across the six hook scripts under `plugins/*/hooks/scripts/`. Extract it into one shared helper
and make every script require that helper instead. Only the hook scripts are checked out in this
sandbox; there is no shell — edit the files, then say what you changed.
