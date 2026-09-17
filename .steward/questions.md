# Open questions — decisions waiting on the owner (garden pass 2026-09-18 — cut to open threads; resolved history moved to a one-line ledger, full context in git/log.md)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Surfacing rule (owner law, vision invariant 13): a question reaches the owner as ONE
one-keystroke choice with the recommended default first, batched with its siblings — never a
file to read.

## Q26 · Is the harness earning its keep? [narrowed 2026-09-18 — the ruling answered the "infinite conflicting things" half]

**Still open:** the two numbers the owner is feeling. (1) **Push bytes** — kb-hints (the
largest, least-followed family) is now OFF by default (kb 0.16.0, shipped); re-measure
`hook_bytes.p50/p95` after 20 real prompts before calling this closed. (2) **Judge minutes** —
raising the timeout 60 s→300 s did NOT fix the empty-pick rate (42–81% across ships,
post-install); the mechanism is the judge declining to choose, not time. Trigger for
ranker-only, per ship: `judge.chosen_empty_pct` > 50% after 20 more fires (already true on
aithseis) → Q20.

**Resolved by the 2026-09-18 ruling, not by this question:** "are we keeping infinite
conflicting things" — answered by the garden mechanism (steward 0.7.0): one live copy, latest
input wins, the gardener deletes. This pass is its first live run.

**Recommended default:** keep measuring #17's remaining amendments (log rotation — now the
garden's job; `model:` frontmatter on steward/lens for a lighter-model trial; strip the
propagation preamble from injected bodies) against the same two numbers before ruling further.

---

## Q22 · Design-duty severity — advise, or BLOCK on a measured regression at `@ship` only? [feeds #37]

**Context.** Owner 2026-09-08: *"as new things are added... we need to be designing better
codebases."* The measured substrate (code-glossary's extensibility/coupling/DRY-cluster
signals) exists and never runs ambiently.

**Options:** (a) advise everywhere, never block; (b) advise in-session, BLOCK at `@ship` when a
per-project baseline score drops; (c) also block in-session when a cluster reaches 3 members.

**Recommended default: (b).** In-session hooks stay advisory (invariant 8); `@ship` is the
owner's real gate moment (5 uses, audit 2).

---

## Q20 · The recall judge is a noisy sample, not a verdict — keep, narrow, vote, or replace?

**Context.** Post-install (300 s cap live, `--since 2026-09-14T18:30Z`): aithseis 21 fires,
81% EMPTY; twin 3 fires, 67%; mk-cc 2 fires, 0%. The dominant failure is the judge declining
to choose — time was never the constraint.

**Options:** (1) keep as-is, ranker fallback on death; (2) `--effort low` default; (3) ranker
pre-selects top-K, judge rules only on those (addresses the decline-to-choose mode directly);
(4) two-vote judge, keep the intersection; (5) ranker-only, drop the LLM judge.

**Recommended default: (5) per ship once `chosen_empty_pct` > 50% over 20 more fires** — already
true on aithseis; (3) is the fallback if the owner wants to keep a judge anywhere.

**Trigger:** `judge.chosen_empty_pct` + `judge.agreement_pct`, read per ship.

---

## Q17 · Retire or keep: reuse-gate · session-lifecycle · essense-flow · code-glossary?

**Context.** reuse-gate is now ON (0.2.0, no longer dormant — its own question narrows to
fold-into-pattern-gate vs keep separate). session-lifecycle: 0 uses ever. essense-flow: 0 uses
since 08-10, its one wanted phase already extracted (`elicit`), so keeping it installed now
costs ~zero — the live vote is freeze-vs-archive on reach/maintenance alone. code-glossary:
sound engine, never invoked interactively — #37 makes it a gate inside `@ship` instead of a
skill to remember.

**Recommended default (★):** reuse-gate — keep as its own gate (already switched on, doing its
job); session-lifecycle — archive to benched; essense-flow — FREEZE (no new investment, Q19/E
retires it); code-glossary — becomes #37's `@ship` gate.

---

## Resolved ledger (one line each — provenance + outcome; full context in git log / inbox files)

- **2026-09-18, owner ruling:** ONE live copy, contradictions keep the latest input and delete
  the loser, git is the archive, garden deletes. **Answers Q21** (removal authority — the
  gardener deletes, the diff is the review) and supersedes the 09-08 status-lifecycle proposal.
  `inbox/20260918-0010-…`.
- **Q12 · CI workflows, past its 14-day expiry — resolved to its stated default: (a) no CI, on
  purpose.** The revert (`3633ff7`) survived a push in the same sitting; RELEASE-NOTES' stale
  claim is already corrected via the Track-5 CHANGELOG migration. Gates stay laptop-run, cheap
  to re-add if ever wanted.
- **Q14 · Extensibility consumers, past its 14-day expiry — resolved to its stated default: (a)
  surviving path only.** #15 wires coupling/extensibility into executor steps, #37 covers
  ambient sessions; no new essense-flow build (it dissolves anyway).
- **Q24 · plugin-toolkit reach → CLOSED BY INSTALL (09-17 ledger read).** Both standalone
  toolkit and the full bundle are installed; #2 keeps the slim-or-keep residue.
- **Q25 · `@fc` → CLOSED BY BUILD.** Shipped in thorough-mode 1.12.2, on demand only.
- **Q13 · steward on lighter model → MERGED into Q26,** carried as one of its remaining threads.
- **Q23 · standing `[instr]` keys → owner-delegated ("you decide"), shipped in
  `defaults/harness-stats.json`, leads with `uptake.used_pct`.**
- **Q19 · "done" ground truth → RAN AND OBSERVED**, not required-green; per-project
  `requireGreen` override.
- **Q18 · goal duty → arms every task the owner starts** (`do it` / `steward:next`); ratified
  invariant 12 (a mechanism ships with its metric key).
- **Q16 · zero-setup memory → KEEP THE CUE**, no auto-seed.
- **Q15 · the design-moment injection → SLIM ONLY**, no registry fold; applied same sitting.
- **Owner law, 2026-09-09:** no pointers — everything in-environment, least clicks → vision
  invariant 13.
- **Q11 · context-recall firing policy → quality over speed** (owner, 2026-08-23) → vision
  invariant 11; superseded in detail by Q20.
- **Q1–Q10 (2026-07 through 08-23):** phase-0 pilot = this repo; lens kept ON as-is; `@prompt`
  fix audited all 8 modifiers; essense-autopilot retires with Phase E; essense-flow doc
  repositioning holds until Phase D/E; `.steward/` committed, `inbox/` gitignored; kb retrieval
  = 3-rung ladder, cheapest first (rung 1 shipped); kb-seed judges on its own; turn-end is its
  own plugin with the escalation ladder; steward-sync (turn-end duty) is the enforced-recompute
  answer. Full text: `git log` + the original inbox files under `inbox/`.
