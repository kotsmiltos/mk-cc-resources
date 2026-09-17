---
description: Garden the project model NOW — delete what is no longer valid (latest input wins on a contradiction), consume the inbox / log / digests into the one live copy, and show the diff of what was kept, replaced, and deleted.
---

1. Run the deterministic half and show its one-line summary:
   `node "<steward plugin root>/bin/steward-garden.js" --root "<PROJECT GIT ROOT>" --apply`
   (the SessionStart briefing prints this exact command when the garden is due; otherwise
   resolve the plugin root from the installed steward plugin). It deletes by DATE only — log
   entries past `logKeepDays`, archived digests, integrated inbox files, `inbox/done/` — and
   reports the judgment candidates: expired questions, files over their cap, captures new since
   the last run.
2. Dispatch the `steward` agent (job: garden, model: sonnet) in the background with that report
   as the brief. The agent judges the live copy against the newest inputs: a contradicted claim
   is REPLACED by the latest input and the older deleted; a stale claim is deleted; an expired
   question is resolved to its stated default (or deleted with the default named in the diff);
   every over-cap file is cut to its cap. Briefing regenerated last.
3. Show the returned diff: kept N · replaced M · deleted K, one line per replacement and
   deletion, and an explicit flag on every line where a newer Claude note overwrote an older
   OWNER statement. If nothing was due and nothing changed, say exactly that in one line.
