---
name: page-and-self-check
description: PROJECT.md exists, so the page duty must have it rewritten whole before the turn yields, and self-check must have the final message name the check that proved the edit. WITHOUT, no Stop hook asks for either.
tags: [progress-captured, verified-done]
runs: 3
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

Add today's date to the report header in src/report.js so that header('Weekly') returns the
title followed by today's date, like `Weekly — 2026-09-18`. Keep body() unchanged. There is a
test in test/report.test.js.
