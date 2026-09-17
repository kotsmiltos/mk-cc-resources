# Decisions — one dated line each, with the why. A newer line names what it replaces.

- 2026-09-18 · **Subtract.** One page per project rewritten whole each sitting, one decisions list, one Stop question; kb / steward / lens / patterns / reuse-gate / essense-flow / autopilot off. Why: measured push 9–16 KB/prompt vs 2 KB without the toolkit, hints followed 0–7.5%, judge empty 81%, a 214k-token steward pass for two notes; "going in circles". Replaces the 09-18 garden law's machinery for this repo (the garden stays valid for a kept multi-file model).
- 2026-09-18 · Contradictions keep the LATEST input; the older is deleted; git is the archive. Why: "keeping everything still sounds wrong." Replaces the 09-08 status-lifecycle proposal (superseded-by / dormant tiers).
- 2026-09-18 · The recall engine default STAYS the judge; `engine: ranker` is a project opt-in. Why: the 81%-empty measurement is cost, not quality (agreement 17%, n=8); quality over speed (08-23).
- 2026-09-18 · The four-line preamble stays in files, is stripped from every injection. Why: 50 files carry it, every injection repeated ~330 bytes, the scorer once counted it as use.
- 2026-09-17 · kb-hints OFF by default. Why: pointer followed 0 / 0 / 0 / 7.5% across four projects while the largest hook-text family everywhere.
- 2026-09-17 · Core model stays in-repo (`.steward/`, now `PROJECT.md`), not the platform memory folder. Why: git-versioned, machine-independent, we control it when the platform changes.
- 2026-09-14 · Judge timeout 60 s → 300 s (owner: "make it 5 times longer"). Why: the cap was ours, never the platform's. Did not fix empty picks.
- 2026-09-11 · Integrate whenever anything is unintegrated (owner: "I CARE ABOUT Quality"). Replaces the 08-02 one-pass-per-sitting cap.
- 2026-09-09 · In-environment delivery, fewest clicks: content in the terminal, decisions as one-keystroke choices, never a file to read.
- 2026-09-08 · Store less; clean up wrong things; keep learning (owner). Became the garden, then the page.
- 2026-08-23 · Quality over speed: a mechanism that silently delivers nothing is a quality failure; fix with fail-open fallbacks that name their engine, never with cheaper replacements.
- 2026-08-23 · `.steward/` committed, `inbox/` gitignored. No CI workflows, on purpose (Q12 closed 09-18 to that default).
- 2026-07-27 · One blocking Stop hook toolkit-wide; every other plugin ships a duty. Why: two blocking hooks re-armed each other.
- 2026-07-21 · Patch-don't-re-derive was the root failure; recompute the whole deliverable and show the diff.
