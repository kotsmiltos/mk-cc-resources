# State — current truth (2026-09-18 · garden pass · HEAD `6729e54` == origin/main at pass start, not re-audited mid-pass)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Position

HEAD `6729e54` (steward 0.7.0 — the garden shipped). Three commits since the last full model
recompute (`6052e6b`): `f4be9ba` (kb 0.16.0 — kb-hints OFF by default), `84e9c04` (model sync),
`6729e54` (steward 0.7.0). **Install status of these three is UNCONFIRMED** — last ledger read
(09-17, pre-dating them) showed installed == disk for all 17 plugins; that fact does not cover
commits made after the read. Next pass: re-read `installed_plugins.json` before trusting
"installed" for kb 0.16.0 / steward 0.7.0.

**This pass is the FIRST REAL GARDEN RUN**, applying the owner's 2026-09-18 ruling (vision.md):
one live copy, latest input wins on contradiction, the loser is deleted, git is the archive.
Every file below was cut to its cap by deletion, not compression — detail that mattered and
fit nowhere is named at the end of this file as a capture for the session to write.

## What shipped since the last full recompute (09-17 → 09-18)

- **kb 0.16.0** — `pull.hints` now opt-in, default OFF; hints channel is total silence unless a
  project sets `pull.hints.enabled=true`; digest channel + MCP pull unchanged. Answers Q26
  amendment (1) — the largest, least-followed push family is now off by construction.
- **kb 0.15.0** (already installed, folded in) — kb-pull's hints and digest are two
  independently-registered `UserPromptSubmit` entries (`--channel=hints` / `--channel=digest`),
  each with its own home-side state file — fixes a bug where the digest budget was computed as
  `bound − whatever hints emitted`, silently cutting a real digest. Correction to the platform
  model: the ~10 KB inline-stub bound is PER HOOK OUTPUT, not shared across hooks on the same
  event — probed directly (two 7 KB hooks on one event, both delivered whole, 14 KB combined).
- **turn-end 0.13.0** (already installed) — judge timeout `DEFAULT_TIMEOUT_MS` 60 s → 300 s,
  Stop hook ceiling 90 s → 420 s, owner ruling verbatim *"extend the timeout... make it 5 times
  longer i don't care"*. Probed: the platform does NOT cap Stop at 60 s (a hook declaring
  `"timeout": 300` ran 75 s to completion) — every prior 60,615 ms "kill" in this model's
  records was OUR OWN constant firing, never a platform limit. **The 300 s cap did not fix the
  real problem:** post-install (`--since 2026-09-14T18:30Z`) aithseis still returns an EMPTY
  judge pick on 81% of 21 fires (p50 34 s, p95 66 s); twin 67% of 3; mk-cc 0% of 2. The judge
  DECLINES to choose; time was never the constraint. Q20 stands open.
- **reuse-gate 0.2.0** — switched ON (`~/.claude/reuse-gate.json` `{"enabled": true}`) after
  producing zero reminders for its entire life. Ladder widened 2→4 rungs, cheapest first: (0)
  can it be DELETED, (1) already implemented HERE, (2) in the RUNTIME already running
  (`node:test`, `util.parseArgs`, `fs/promises`, `crypto`; Python `argparse`/`pathlib`/
  `dataclasses`/`unittest` — named explicitly because the measured misses were exactly these,
  read past by the old "package/library" wording), (3) a maintained package.
- **plugin-toolkit 1.17.0** — FAILED/SUSPECT/CANNOT-RUN suites now print a bounded, marked
  output excerpt instead of just an exit code (the reporter defect named 09-12: evidence was
  captured by `spawnSync` but discarded before the renderer). **First real red run under it
  named the #9 flake in one try:** `essense-flow test/run-all.cjs` red-in-company is LOCK
  CONTENTION, not a shared resource — `with-lock.cjs:56` `MAX_ATTEMPTS = 5` at 50 ms backoff
  (~1.5 s budget) against a `LOCK_STALE_THRESHOLD_MS = 60000` (`:51`) three orders of magnitude
  higher. **Fix not yet applied:** raise the retry budget with a measured number (governed by
  D-Rd11-4); two pre-existing `state-shape WARN` lines surfaced the same way.
- **#42 (exec-ledger truncation), part 1 only:** `tool-record.js:111-112` now appends `…[+N]`
  when it cuts a command at `MAX_CMD_CHARS = 300` (was silent). The cap itself is still 300,
  so a check invoked at the tail of a long compound command can still read as evidence-absent
  — parts (2)-(4) of #42 remain open (preserve check-bearing segments, raise the cap with a
  measured number, a regression fixture).

## The checkout-partition lesson (2026-09-14, capture read this pass)

Four storage classes now exist and none of them travel the same way: (1) the repo, tracked and
pulled; (2) `.claude/` — gitignored, so per-CHECKOUT; a second working copy proves nothing
about the first; (3) `~/.claude/` — the one shared writable surface per MACHINE, with no
locking anywhere; (4) the commit message itself, which turned out to be **the highest-bandwidth
cross-checkout channel this repo has** — it is the only one that carried another checkout's
measurements into this one, an argument for writing the why + numbers into commit bodies, not
just the what. Consequence for this model: **a steward model can go stale from a direction it
cannot see** — it is tracked and can travel, but only if the session that did the work touches
`.steward/`; a session shipping code from another checkout without touching the model leaves
this one confidently wrong with no signal.

## Open threads (see tasks.md / questions.md for the ordered/decided form)

- **Q20 (judge)** — still open. Post-install numbers above confirm the failure mode is the
  judge declining, not the old timeout; trigger for ranker-only is `chosen_empty_pct` > 50%
  after 20 more fires per ship (already true on aithseis).
- **#9 (essense-flow flake)** — mechanism named, fix (raise `with-lock.cjs` retry budget) not
  applied.
- **#42 (exec ledger)** — part 1 done, parts 2–4 open.
- **#41 (`base-freshness` claim source)** — still not built (no file under
  `plugin-toolkit/lib` named that, checked this pass by absence in parts.md's own record).
- **#17 (push-side cuts)** — kb-hints-off (amendment 1) is now DONE via kb 0.16.0; the
  remaining amendments (log rotation — this pass; `model:` frontmatter on steward/lens;
  preamble stripped from injected bodies) are unbuilt.
- **#38 (knowledge lifecycle/garden)** — BUILT as steward 0.7.0 (the garden job, this pass is
  its first live run). Residual: kb captures are still a second store not yet folded through
  the same latest-wins rule (the garden today only reads `.steward/`); provenance-at-capture
  (who/when) is still unrecorded at write time.

## Needs a capture (session to write, cannot write outside `.steward/`)

The 2026-09-17 memory-research findings (S1–S14 field comparison: maintenance stage, computed
conflict rules, bounded core blocks, scored retrieval, sleep-time consolidation) are real
research that informed the 09-18 ruling but do not fit any live-copy file under its cap —
capture them as `.claude/kb/captures/` if the diagnosis table (field-vs-us) is worth citing
again; otherwise the ruling document is the record that matters and this can be skipped.
