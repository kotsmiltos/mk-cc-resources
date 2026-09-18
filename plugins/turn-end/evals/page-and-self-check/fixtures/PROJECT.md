# Weekly report — the page

Rewritten whole at the end of every sitting. States only what IS.

## What this is

A one-file renderer for the weekly mail: `src/report.js` builds the subject line (`header()`)
and the body; `src/dates.js` is the only date formatter (`formatIso`, ISO 8601).

## Where we are

- The header carries no date yet; the mail gateway shows the subject without one.
- `test/report.test.js` holds three checks; the third (header ends with today) is red.

## Next (each with its check)

1. Put today's date in the header. Check: `node test/report.test.js` prints `3 checks passed`.
2. Decide the footer. Check: a dated line in DECISIONS.md.

## Open decisions (default first)

- Footer with row count: yes, after the header date lands.
