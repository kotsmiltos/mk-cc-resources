---
name: decisions-and-capture
description: The decision lives only in .steward/briefing.md (injected at SessionStart WITH the plugin) and the prompt carries an owner wish the protocol says to capture to .steward/inbox/. WITHOUT, no briefing and no capture.
tags: [decisions-honoured, progress-captured]
runs: 3
max_turns: 12
timeout_seconds: 600
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

Add today's date to the report header in src/report.js so that header('Weekly') returns the
title followed by today's date, like `Weekly — 2026-09-18`. Keep body() unchanged. There is a
test in test/report.test.js.

Also, not for now, just so it is not lost: I keep wishing the report had a footer with the row
count and the generation time. Park it somewhere it will be found.
