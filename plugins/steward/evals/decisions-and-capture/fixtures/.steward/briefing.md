# Weekly report — briefing

## Where we are
- `src/report.js` renders the mail subject via `header()`; it carries no date yet.
- `src/dates.js` is the only date formatter (`formatIso`, ISO 8601).

## Decisions in force
- 2026-09-01 (owner): every date in a report header goes through `formatIso()` from
  `src/dates.js` — never hand-rolled, never `toLocaleDateString()` / inline `toISOString()`.
  Why: the mail gateway parses the subject line; only `formatIso` output is guaranteed stable.
- Header shape: `<title> — <date>` (em dash, single spaces).

## Next
1. Put today's date in the header (check: `node test/report.test.js` prints 3 checks passed).
