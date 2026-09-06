# Open questions — decisions waiting on the owner

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

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
status is now UNCERTAIN (tasks #9 adjudicates whether it is red or test-all misses it).
(c) Re-add later, gated behind #9 going green.

**Recommended default (Claude's): (a).** The revert survived a push in the same sitting, so
treat it as deliberate; correct the stale prose (folds into tasks #6). Re-adding is cheap
whenever wanted. If CI ever returns, its invocation must carry `--root` (the 08-23
gate-record correction).

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

**Weighed 2026-08-23 against the new quality-over-speed law (vision invariant 11):** the
law says latency/cost alone never motivates a change — but the "unbearable" directives
were the owner's own, so this stays THEIR trade to take, not a dead question. The audit
adds a datum FOR quality: the recompute discipline is the part that measurably succeeds
in all four projects — the thing a weaker model would put at risk.

**Options:** (a) try sonnet for routine integrates and watch the diffs — the visible diff
is the built-in safety net that exposes a weak pass, and provenance makes any pass
re-runnable; (b) keep the default model — pay full price for full quality on every pass;
(c) split by job — sonnet for routine integrates, default model for pivots/seed (the
dispatching session chooses per job).

**Recommended default (Claude's): (a), with the law as the tripwire** — one weak diff
ends the trial immediately; reverting is one line.

**Blocks:** nothing.

---

## Q14 · Extensibility consumers — build into the dissolving pipeline, or land the craft in the surviving path?

**Context.** The owner's 2026-08-26 HFDP wish re-affirmed invariant 7 and reported the
outcome gap (*"we build code too specific for anything I ask"*). Of the chain decided
2026-06-26, disk shows A AND B SHIPPED — essense-flow 0.26.0's Declared-growth-axes SPEC
section + protocol fire-points, plugin-toolkit's `runner extensibility` engine (the
capture's "A never executed" claim was refuted at source; the lens amended the capture).
Genuinely unbuilt (verified: zero `extensib` matches in essense-flow): /glossary emitting
EXTENSIBILITY.yaml · a review `extensibility` lens · verify compliance items · the C
correction sweeps — pure consumer wiring on an engine that already accepts declared axes.
But essense-flow DISSOLVES at Phase E per v3; the craft survives in steward + executor
protocols, where #15 Phase A wires the same measures.

**Owner-words evidence toward (a), 2026-08-26 (verbatim):** *"the essense flow aprts are
rarely used so i don't know if it is what we are looking to populate. i want claude
overall to abide to this."* Said about the pattern menu, not the consumers — so it
STEERS, it does not close this question — but it is direct owner testimony that
essense-flow is rarely exercised, and the same reasoning executed: the vocabulary half
shipped AMBIENT (patterns 0.1.0), not into the pipeline.

**Options:** (a) surviving path only — #15 wires coupling/extensibility into executor
steps + ambient sessions; the named-shape vocabulary is DONE ambient-side (patterns
0.1.0); essense-flow keeps rung-2 + criteria 8/9, no new pipeline build. (b) Both sides —
pipeline projects get the consumers too (~consumer wiring only, the engine exists).
(c) Execute the 2026-06-26 plan as written, pipeline-first.

**Recommended default (Claude's): (a), now with owner-words support.** Building consumers
into a plugin slated to dissolve spends budget where the craft is leaving, and the wish
targets "the way we write code with Claude" GENERALLY — the surviving path's job.
Reversible: (b) is additive later if a live pipeline project shows the gap.

**Blocks:** the essense-flow half of the wish's scope; #15 proceeds either way.

---

## Q15 · The design-moment injection — now MEASURED: five surfaces, 1,645 B per design prompt, 1,788 B standing

**Context.** The push half is CLOSED (patterns installed 08-27, menu hook fired live).
Audit 2 (2026-09-06) put a number on the injection half: the design-open concern has
FIVE surfaces — the global CLAUDE.md Generalize-First Gate (1,788 B STANDING = 27% of the
global file, paid per session AND per sub-agent) · the generalize-first hook · pattern-menu
· pattern-gate · reuse-gate/@build — firing 1,645 B together on one design prompt. Also
measured: `++` is injected THREE ways, `@verify` restates 3 of the 4 always-on rules,
and per-prompt process spawns are 9. `/patterns` was never invoked in a real session;
whether any of these surfaces changes outcomes is unmeasured (the 09-04 doubt datum).

**Options:** (a) after ONE live-verified fire of both patterns hooks, slim the global
hook + CLAUDE.md gate down to what patterns does not carry. (b) Keep all surfaces —
redundancy as belt-and-suspenders. (c) **Fold the per-prompt regex stack into ONE
UserPromptSubmit hook over a `{trigger, injection}` registry** (verification-rules +
generalize-first + thorough-mode + pattern-menu), inject `++` once, move the gate out of
global CLAUDE.md into pattern-menu's footer on design prompts — Tier-2 item 14 of the
audit plan; check: plain prompt unchanged, `++` prompt −363 B, design prompt one block,
global CLAUDE.md < 5 KB, spawns 9 → 6.

**Recommended default (Claude's): (c)** — it is (a) done generically (a registry is the
drop-in surface a sixth trigger needs), still only AFTER a live fire of both patterns
hooks proves the replacement (quality over speed: nothing retires on a promise).

**Blocks:** #21 step 2; #17's first concrete cut.

---

## Q16 · Zero-setup memory — seed kb + steward automatically on first open of an un-seeded project? [Tier 3, audit 2]

**Context.** Audit 2 measured WHERE the owner felt the loss: the two projects with NO
kb/steward (psience 09-01, verbatim: *"i said it in the previous session why is it not
saved?"*; 09-04: *"can you tell me what happened there?"*). The `/kb-seed` cue-once
mechanism fired in both and was acted on in neither — measured dead. Owner 08-23:
*"ideally i don't want to spend time setting them up when i wanna work on them."*
Invariant 6 says a tool self-activates on PRESENCE (seeding is the on-switch); invariant 1
says the ship never moves unseen. Auto-seeding writes files into every git project the
owner opens — the owner must ratify that.

**Options:** (a) on first open of an un-seeded git project, dispatch `kb-seed` + steward
`seed` in the BACKGROUND (zero questions), show the diff at the next open, `unseed`
reverts — the audit plan's proposal. (b) One-keystroke gate: the first open asks ONE
question ("seed memory here?"), then (a) runs. (c) Keep the cue, make it louder — the
measured-dead path, not recommended. Whichever: the seed must be root-anchored, skip
scratch/temp roots, and leave a visible marker so a wrong seed is one delete.

**Recommended default (Claude's): (b)** — the owner's words support (a)'s zero-effort
goal, but a silent write into every project opened (incl. one-off checkouts) is the
"moves unseen" shape invariant 1 forbids; one keystroke keeps the owner's say and
costs nothing to remember.

**Blocks:** nothing built yet; would become a task on the answer.

---

## Q17 · Retire or keep: reuse-gate · session-lifecycle · essense-flow · code-glossary — each measured at ZERO real use [Tier 3, audit 2]

**Context.** Audit 2 (five ships, 212 human prompts): reuse-gate dormant since 07-07,
0 projects configured; session-lifecycle 0 uses ever (no handoffs dir anywhere; `@prompt`
replaced it; kb's `handoffs` source then indexes nothing); essense-flow 0 uses since 08-10
(owner 08-26: "rarely used"; Phase E #19 already plans its retirement; Q4/Q5 hold its docs
until Phase D/E); code-glossary never invoked interactively, engine sound (2.1 s, found
two identical registries inside kb). Each is an EXTENSION-SURFACE question — what stays
ambient, what becomes a gate, what goes to `archive/benched-plugins` — not a keep/kill vote.

**Options per surface (Claude's defaults marked ★):** reuse-gate — ★fold into
pattern-gate (one pre-write nudge, one guard) / keep as is · session-lifecycle — ★archive
to benched (drop kb's `handoffs` source config with it) / keep for public users / keep
only retro+meta-review as future steward verbs · essense-flow — ★FREEZE (no new
investment; Phase E retires; Q5 doc repositioning may move earlier) / keep investing /
archive now · code-glossary — ★make it a GATE inside `@ship` (drift + duplicate-registry
check, deterministic) rather than a skill to remember / keep skill-only / archive.

**Recommended default (Claude's): the four ★ marks** — each is a fold or a freeze, none
deletes a capability the owner uses; all reversible from the archive branch.

**Blocks:** Q5's timing; #17's fold scope; nothing else.

---

## Resolved ledger (provenance — these answers are now law in the model)

- **Owner request (2026-09-06, EXECUTED same sitting): review kb / steward / lens /
  thorough-mode / every hook / glossary / harness + cross-project usage + how to
  improve.** Executed as audit 2 (five agents, 269 session files, five ships): kb capture
  `20260906-1340-second-usage-audit-five-projects-measured` (every number, file:line) +
  the ranked plan (inbox `20260906-1345`, Claude's proposal — nothing decided). Tier 1 →
  tasks #23–#28; Tier 2 → #8 #27 #28 + #13/#17 folds; Tier 3 → Q16, Q17, Q15(c), #11
  re-parked. Provenance: `inbox/20260906-1236-review-plugins-and-cross-project-usage.md`.
- **Owner directive (2026-09-04, EXECUTED same day): the perspective-panel skill** —
  verbatim *"multiple agents… answer it from different perspectives… their sole focus on
  that specific thing… compile their outputs"* + *"apply that same logic to building what
  I've asked"* → prism 0.1.0, designed BY its own five-lens panel, shipped `2ffa2d0`,
  installed after a settings-level fix; acceptance criterion (owner invokes it again
  unprompted) MET 09-04 in psience. **The doubt datum in the same capture** (*"I don't
  think that we've built this. Really doing anything."*) is ANSWERED BY MEASUREMENT (audit
  2): model-keeping works; injecting is unread/repetitive; browse skills + pipeline unused.
  Provenance: `inbox/20260904-0405-perspective-panel-skill-and-doubt-about-impact.md`.

- **Q11 · Context-recall firing policy → RESOLVED 2026-08-23 by owner ruling — the SPEED
  framing itself was refuted.** Verbatim: *"46 seconds is not really a problem. getting
  things done to the highest degree is so switch your focus please. if it works we keep
  it. if we cna enhance we do that. we go for quality, not necessarily speed."* The
  every-turn judge STAYS default; the re-take question dissolves. What replaces it is
  quality/reliability work only: (a) fail-open ranker FALLBACK — a judge death
  (ETIMEDOUT/spawn) must never mean silent no-recall; the ranker picks instead and the
  output NAMES which engine chose (three live ETIMEDOUTs measured the same sitting are
  the substrate); (b) richer judge inputs (status/groups, harbor caste); (c) recall
  QUALITY measured (chosen-files-actually-used), never latency. Promoted to vision
  invariant 11 (quality over speed — the standing optimization order). Executes as
  Phase 1 item (6) + Phase 3 stats. **Number added 2026-09-06 (audit 2):** the judge is
  slow from STARTUP, not inference — 33.0 s wall / 3.8 s API by default vs 3.9 s with
  `--setting-sources ""` (no hooks fire in the child, OAuth intact, plan-billed); the
  every-turn judge stays default AND becomes cheap (→ #23); the ranker-first pre-filter
  idea is dead for good. Provenance:
  `inbox/done/20260823-1520-owner-rulings-on-stack-a-blueprint.md`.
- **Owner rulings on stack-a-blueprint §6 (2026-08-23, all four now design law —
  blueprint §6/§6b is the plan of record):** **(Q1)** item records — delegated with a
  seed idea, resolved as: `status.json` = lifecycle + `groups[]`; files NEVER move or
  rename; kb JOINS status at collect time (status/groups as themes, zero engine change);
  one search engine, one ledger, no ritual. **(Q2)** = Q11 resolution above. **(Q3)**
  fleet report SESSION-ONLY — invariant 1 read maximally strict, no cron. **(Q4)**
  `status.json` COMMITTED to git — project memory like the rest of the model; ids +
  relative refs only. Provenance: same inbox item; §6 rewritten same sitting, 7/7 checks.
- **Owner direction (2026-08-23, EXECUTED same sitting): "transformation, not patches."**
  Verbatim: *"i really don't think you've come up with the best solutions. it feelslike
  you are patching things. think about how you'd design this whole setup now that you
  have all of the data and the visions for each thing… think about this like a
  transformation team… extract the whole vision and let's see if we can plan something
  that looks good from every angle."* Executed: full re-derivation
  (`design/logbook-spine.md`) → concrete catalog (`design/building-blocks-catalog.md`) →
  `design/stack-a-blueprint.md` with §6 rulings + §6b plan of record; strike 1 shipped,
  pushed AND installed the same day. The six patch-shaped themes survive only as
  mechanics inside the architecture. Provenance:
  `inbox/done/20260823-1430-rethink-whole-design-not-patches.md`.
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
  **First fire OBSERVED live 2026-08-23** (post-0.4.1 root anchor — the credible candidate
  held); the evidence gate for hardening to `block` is now open, owner's call. The
  second-staleness-signal remainder (a sitting that captures nothing) is superseded by the
  Phase 1 cursor/instrument design. Provenance:
  `inbox/done/20260727-2029-q10-resolution-enforced-recompute-as-a-turn-end-duty.md`.
- **Q1 · Phase 0 pilot → mk-cc-resources (THIS repo)**, not crowd-game. The toolkit pilots
  itself; crowd-game seeding became a later task (Phase D), not the gate. CLOSED
  2026-08-23: the four-project audit is the Phase 0 validation — steward verdict SUCCESS,
  with the briefing-staleness class as the named residual (owned by Phase 1).
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
  structural and pre-lexical, fixed by the `pattern` split mode. Rungs 2/3 remained
  UNGATED until 2026-08-23: the aithseis kb-probe capture satisfied the rung-2 evidence
  gate — the un-gate is now an OWNER CALL parked in blueprint Phase 4 (tasks #11).
  **Re-read 2026-09-06 (audit 2):** hints are ignored for REPETITION + SIZE (84% ignored,
  top-3 ids in 40% of slots, digest stubbed by the platform), not for vocabulary — rung 2
  is the wrong lever before #27; #11 stays parked and re-measures after it.
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
- **Owner directive (2026-08-01, EXECUTED): work must be self-checked before Claude
  reports done.** Verbatim: *"can we make sure that when claude comes back with his work,
  it has already checked it's own work? … just arbitrarily calling 'DONE' — can we make
  sure this has happened before finishing and me having to ask?"* Sparked by a
  terrain-project incident: Claude authored blind, verified by sampling numbers, never
  rendered/looked, shipped "verifiably correct" instead of "looks right". Vision
  invariant 10; shipped as turn-end 0.4.0 `self-check`, live-proven 08-10/08-23.
  Provenance: `inbox/done/20260801-2349-self-check-before-done.md`.
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
