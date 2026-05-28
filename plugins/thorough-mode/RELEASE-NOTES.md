# Release notes — thorough-mode

## 1.5.0 — @ship integration with plugin-toolkit

`@ship` modifier updated to reference `/version-bump` and `/docs-audit` from the new plugin-toolkit. When `@ship` fires in an mk-cc-resources plugin repo, the injection now points Claude at `/version-bump` for semver cascading (plugin.json + marketplace entry + bundle + metadata + RELEASE-NOTES in one shot) and `/docs-audit` for cross-doc drift detection (CLAUDE.md + README + marketplace.json vs disk state). Outside that repo, `@ship` falls back to the generic checklist.

No changes to other modifiers (++/@thorough, @present, @debug, @verify, @fresh).

## 1.4.0 — Add @debug, @verify, @fresh modifiers

Three new prompt modifiers mined from recurring rules across 4+ projects:
- **@debug** — root cause investigation before fixing (read code first, trace to origin, check patterns, propose fix with rationale)
- **@verify** — paranoid verification of every claim (prove results not intentions, run tests after each change, state verifiable check not "done")
- **@fresh** — context refresh (re-read key files, don't trust compressed reads, verify each constraint against current disk)

Each has smart hints that fire on natural language intent without the keyword. All stack with each other and existing modifiers.

## 1.3.2 — Prior versions

(See git history for changes prior to RELEASE-NOTES creation.)
