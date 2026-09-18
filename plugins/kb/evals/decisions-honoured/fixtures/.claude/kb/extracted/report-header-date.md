---
kind: semantic
caste: project
title: Report header date format decision
themes: [report, header, date, dates]
---

# Report header date format decision

Decision (owner, 2026-09-01): every date that appears in a report header is rendered in
ISO 8601 (`YYYY-MM-DD`) through `formatIso()` in `src/dates.js`. Never hand-roll the format in
`src/report.js`, never call `toLocaleDateString()` or `toISOString()` inline — the mail gateway
parses the subject line and only the `formatIso` output is guaranteed stable.

The header shape is `<title> — <date>` with an em dash and single spaces.
