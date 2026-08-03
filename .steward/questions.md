# Open questions — decisions waiting on the owner

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Q11 · Re-take the context-recall firing policy — the estimate it was chosen on was wrong

**Owner's words, verbatim (2026-07-27):** *"OPEN — context-recall fires every turn at a
MEASURED 46s; that policy was chosen on a wrong 11s estimate and is worth re-taking."*

**Why this is open.** The current policy — fire the `claude -p` judge on EVERY turn end, no
pre-filter — was picked from a Claude-authored menu whose cost estimate said ~11s and
measured **46s** (source: `.claude/kb/captures/20260727-0830-invented-constraints-written-in-the-owners-voice.md`).
The attribution was corrected in code (turn-end 0.2.3), but fixing the *record* of a
laundered choice does not re-open the *choice*; it is still standing on the bad number.

**The config contradiction that sharpened this on 07-31 is FIXED — the previous
recommended default was EXECUTED (turn-end 0.3.1, same evening):** `hooks.json` timeout
raised 30 → 90 (read 2026-08-01), restoring the invariant *the hook budget must exceed
the judge budget* (the judge carries its own 60s execFile timeout + a NAMED degradation).
Before-numbers: 39/52 in-window fires died at ~31s across 4 projects, crowd-game 0
completions. Measured pass after: real fire, judge ran, clean verdict, 40.6s, exit 0.
The ~31s-stall-with-lost-payload cost is GONE; the policy the owner chose (every-turn
recall, no silent misses) now executes as chosen. Only the RE-TAKE itself remains.

**What a re-take has to preserve** (the original argument, intact and not a cost claim):
any gate deciding when recall matters can itself be wrong, and its failure mode is
SILENT — the turn that most needed a note is the turn a cheap heuristic skips. 46s does
not refute that; it prices it. The candidate directions (Claude's framing, offered as
material, not a menu): eat the 46s unconditionally · make the judge cheaper rather than
rarer · let the 46s overlap the turn instead of terminating it · gate on a signal whose
misses are visible. The owner pays the 46s and knows what a missed note costs — the
decision is theirs.

**Weighed 2026-08-01 (two riders, neither reopens the frame):** (1) the digest-hazard
rider from the 2030 inbox item — every judge fire spawns a child SessionStart — died
before it could bear on this: kb 0.10.2's `MK_TURN_END_DEPTH` stand-down means a judge
fire can no longer touch the digest. (2) The new owner-directed `self-check` duty adds a
default-ON demand to producing turn-ends, but it is deterministic with NO judge —
negligible cost, so it does not re-take this question; it joins the Phase C economics
ledger (tasks #18).

**Recommended default (Claude's):** with the contradiction fixed and one measured pass
recorded, change nothing further — the chosen policy now actually executes. Re-open only
if the 46s per producing turn-end annoys in practice; any alternative arrives with its
own measured number (your rule).

**Blocks:** nothing — the standing cost is the 46s judge per turn-end, which is the
policy as originally chosen, now genuinely delivered.

---

## Q12 · CI: the tree now has ZERO workflows — was the revert deliberate?

**The facts (disk-read 2026-07-31):** `51f139e` (plugin-toolkit 1.9.0) added
`.github/workflows/checks.yml` running the three gates on `push`, replacing a workflow that
was dead twice over (invoked a script deleted in `508e2a7`, on a `pull_request` trigger in
a repo with zero PRs ever). **289 seconds later**, `3633ff7` — *"revert(ci): drop the
GitHub Actions workflow, restore the one it replaced"* — removed it. But the `.github/`
directory **does not exist at all** now: the subject claims a restore that is not in the
tree. Both commits are pushed. The model does not know whether the revert was the owner's
call or Claude's mid-session; the 0130 inbox item still describes checks.yml as live, so it
predates or missed the revert. Meanwhile plugin-toolkit's RELEASE-NOTES 1.9.0 still states
the workflow "is replaced by `.github/workflows/checks.yml`" — false on disk.

**Options:** (a) **No CI, on purpose** — fix the RELEASE-NOTES claim and done; the gates
stay laptop-run (they now travel via the standalone install, see tasks #2). (b) **Re-add
checks.yml** — recoverable from `51f139e` in minutes; note the ledger-compaction suite's
status is now UNCERTAIN (tasks #10 adjudicates whether it is red or test-all misses it).
(c) Re-add later, gated behind #10 going green.

**Recommended default (Claude's): (a).** The revert survived a push in the same sitting, so
treat it as deliberate; correct the stale prose (folds into tasks #7). Re-adding is cheap
whenever wanted.

**Blocks:** nothing.

---

## Q13 · Steward agent model override — run routine integrates on sonnet?

**Context.** Third economics escalation in two days (owner: *"steward fires too often and
for too long"* → *"can we make the steward lighter? it is unbearable right now"*). Steward
0.3.0/0.3.1 already cut fires (one background pass per sitting), pass scope (agent Economy
budget) and standing injected text (halved). The remaining big lever is the MODEL the
steward agent itself runs on: a `model: sonnet` override would cut integrate cost roughly
5x and speed the pass up (Claude's estimate, not measured here). Not taken silently,
because recompute quality is the plugin's soul and the trade is the owner's.

**Options:** (a) try sonnet for routine integrates and watch the diffs — the visible diff
is the built-in safety net that exposes a weak pass, and `inbox/done/` provenance makes
any pass re-runnable; (b) keep the default model — pay full price for full quality on
every pass; (c) split by job — sonnet for routine integrates, default model for
pivots/seed (the dispatching session chooses per job).

**Recommended default (Claude's): (a)** — try it. The diff discipline exists precisely to
make lazy or shallow recomputes visible; reverting is one line.

**Blocks:** nothing.

---

## Resolved ledger (provenance — these answers are now law in the model)

- **Q10 · Who forces the RECOMPUTE? → RESOLVED 2026-07-27: the `steward-sync` turn-end
  duty, on the owner's terms** (verbatim: *"steward-sync duty. Owner decision: advise,
  session-span, silent on empty"*; applies while `.steward/inbox/*.md` count > 0, satisfied
  at count 0). **The collision DISSOLVED rather than being decided** — worth recording,
  because "we picked A" loses the reason the trade-off stopped existing: the question was
  priced when enforcement meant a plugin shipping its own blocking Stop hook (*"a fourth
  blocking hook in the stack"*); turn-end removed that price, so enforcement is a data
  declaration in the one blocking tail and steward keeps its no-Stop-hook design intact.
  Both positions hold at once. CHOSEN BY CLAUDE, NOT REQUESTED (per the duty's own header):
  priority 25, the ask wording, item = top-level non-dot `.md`. **Deliberately weaker than
  the kb precedent** (*"a nudge… is not gonna be enough"* → kb got a block): `advise` never
  blocks, so a sitting CAN still end with the model stale — the owner set that explicitly;
  escalation is one config line (`{"duties":{"steward-sync":{"severity":"block"}}}`).
  **Open remainder, flagged not proposed:** the duty only sees STAGED notes; a sitting that
  changes the project's shape with no capture written leaves the model stale and the inbox
  empty, and nothing fires (Q10's second staleness signal, unbuilt, not asked for). First
  observed fire still outstanding — tasks #4.
  Provenance: `inbox/done/20260727-2029-q10-resolution-enforced-recompute-as-a-turn-end-duty.md`.
- **Q1 · Phase 0 pilot → mk-cc-resources (THIS repo)**, not crowd-game. The toolkit pilots
  itself; crowd-game seeding became a later task (Phase D), not the gate.
- **Q2 · verifiability-lens → keep ON as-is.** Phase C baselines come from rough session
  measurements (24–30 fires/long session, ~25–55k tokens/dispatch), not a controlled pilot.
- **Q3 · @prompt fix → audit all 8 modifiers.** Done in one pass over thorough-mode's
  matching (machine-text guard).
- **Q4 · essense-autopilot → retires with Phase E.**
- **Q5 · essense-flow doc repositioning → holds until Phase D/E.** No softening now.
- **Q6 · Untracked files → confirmed scratch, RESOLVED** (.gitignore entries appended).
- **Q7 · `.steward/` → commit the model; `inbox/` gitignored** (incl. the `!.gitkeep`
  negation trap). Public-repo safe: raw captures stay local.
- **Q8 · Toolset candidates → "also build fleet briefing now."** GSD uninstall + fleet
  briefing executed same session; sessionless drop channel DEFERRED behind the crowd-game
  eval; psience hygiene PARKED.
- **Q9 · kb retrieval → ANSWERED 2026-07-25: improve it** ("yeah we need to improve that,
  fuzzy matching? other techniques?"). Law: 3-rung ladder, cheapest substrate first —
  (1) deterministic term-overlap upgrades [SHIPPED, kb 0.4.0], (2) characterization pass,
  (3) embeddings as a drop-in ranker; rungs 2/3 evidence-gated on real corpus misses.
  How it played out: the first foreign-corpus miss was NOT the anticipated class — a
  SPLITTER-class miss (a bullet-ledger with zero `##` collapsed into one 62KB entry),
  structural and pre-lexical, fixed by the `pattern` split mode. Rungs 2/3 remain UNGATED.
  Provenance: `inbox/done/20260725-0337-retrieval-improvement-direction.md`,
  `inbox/done/20260725-1400-first-retrieval-miss-splitter-class.md`.
- **Owner direction (not a question, EXECUTED): kb-seed judges on its own.** "It should be
  able to see on its own" → the mandatory confirm-every-time gate is gone; the seeder
  judges, writes, then REPORTS. Shipped kb 0.5.0 with the depth mandate.
  Provenance: `inbox/done/20260725-0337-kb-seed-should-see-on-its-own.md`.
- **Owner directions (not questions, EXECUTED 2026-07-27):** turn-end is its own plugin,
  not hosted inside an existing one · the tail escalates `additionalContext` → `block` ·
  autopilot should become a duty (NOT yet done — its `decide()` is welded into `main()`) ·
  distribution: *"i wanna push an update to me marketplace, update from there and have it
  working"* → the marketplace now points at the GitHub repo, so push is required before any
  install sees a change.
  Provenance: `inbox/done/20260727-0700-turn-end-shipped-and-what-it-changes.md`.
- **Owner direction (2026-07-27): stop speaking in the owner's voice.** *"we originally put
  a stupid/wrong number in that you decided to do on your own, i never spoke something of
  it… not just numbers but in general not speaking and doing things in my voice."* Now law
  for this model too: every default records whether it was owner-set, measured (with the
  command), or Claude's choice.
- **Owner directive (2026-08-01, being EXECUTED same day): work must be self-checked
  before Claude reports done.** Verbatim: *"can we make sure that when claude comes back
  with his work, it has already checked it's own work? … just arbitrarily calling 'DONE'
  — can we make sure this has happened before finishing and me having to ask?"* Sparked by
  a terrain-project incident: Claude authored blind, verified by sampling numbers, never
  rendered/looked, shipped "verifiably correct" instead of "looks right". Now vision
  invariant 10 + tasks #1 (in-flight: default-ON deterministic `self-check` DEMAND duty in
  turn-end, no judge; quality-lens stays the opt-in deep tier — deliberately NOT a re-take
  of lens economics or Q11). Provenance:
  `inbox/done/20260801-2349-self-check-before-done.md`.
- **Owner pass 2 on self-check (2026-08-02, EXECUTED in turn-end 0.4.0 pre-release):** a
  run is a check only if OBSERVED (*"it needs to have used enough logs for it to be able
  to understand what happened"*), COMPARED vs the ASK (*"and if it was what was asked"*),
  and probed to BREAK (*"tested to break it and not only happy paths"*). Executed:
  `ran-and-looked` detector, result-tense-only named checks, ask teaches
  run→LOOK→compare→break. Vision invariant 10 sharpened. Provenance:
  `inbox/done/20260802-0040-self-check-must-look-log-and-break.md`.
- **Owner economics directives (2026-08-02 + 2026-08-03, both EXECUTED same sitting):**
  *"steward fires too often and for too long"* → steward 0.3.0 (ONE background pass per
  sitting + the agent Economy budget); *"can we make the steward lighter? it is
  unbearable right now"* → steward 0.3.1 (standing injection halved: 4-line protocol,
  briefing ≤6 lines / 900 chars, one-line inbox note, diff ≤10) + the turn-end 0.4.1 ask
  trim. Discipline preserved by design — the complaint priced the LOOP, not the
  recompute. Residual owner lever parked as Q13 (sonnet override). Provenance:
  `inbox/done/20260802-0011-steward-fires-too-often-too-long.md` +
  `inbox/done/20260803-2142-steward-still-unbearable-make-lighter.md`.
