# Open questions — decisions waiting on the owner

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

Surfacing rule (owner law 2026-09-09, vision invariant 13): a question reaches the owner as
ONE one-keystroke choice with the recommended default first, batched with its siblings —
never as a file to read. The context below is for the model and the asking session.

## Q26 · OWNER, 2026-09-17: is steward / verification / the hooks adding value, or burning tokens? Is memory digestible, or infinite conflicting things? Lighter models? [NEW; absorbs Q13; nothing decided]

**Owner, verbatim (inbox 20260917-1652):** *"dude, check out what has been going on on all my othger
sessions. is steward and verification and all that adding value? are we keeping good quality content
or eveyrhing? it feels like it's just burning tokens for the most part, are we keeping a good
digestibgle memory or infinite things that conflict each other as we go on? how can we amend? shall
we use lighter models for this work in generaL?"* — and mid-turn: *"the hooks as well please"*.

**Context — measured, not argued (the full table is in state.md, carried verbatim):** on the four
steward ships push is 9.3–13.5 KB per prompt vs 2.0 KB on the no-harness control and ROSE since
audit 2; kb-hints is the largest family everywhere and is followed 0–7.5% (the one honest file-open
metric); recall notes are USED by content 49–90% — the one push mechanism that scores as used;
steward-model surfacings 25–51%; the judge returns an empty pick 42–52% of the time whole-life —
and **81% of 21 fires on aithseis AFTER the 300 s cap went live on 09-14** (p50 34 s, p95 66 s;
twin 67% of 3; mk-cc 0% of 2), so the empty picks are not the cap's doing; 31–55 min of
wall-clock per ship inside the Stop hook; log.md 529–1669 lines never rotated, 12–25
open questions per ship, every capture repeating the four-line preamble. Cost is BYTES + WALL-CLOCK:
the judge is already haiku and its whole spend is ≈ $5.2 across four ships; steward + lens agents run
on the session model (no `model:` frontmatter). Three of the table's numbers mislead without the
model's own corrections (state.md): digest "0/3" is unscorable-not-zero, "judge p95 = 60 s" is a
whole-life artifact of our old constant (the 300 s build is installed and measured above), and
this ship's "19 unintegrated" is a file count where the ledger says 2. Also measured, not zero:
the lens has ONE v1 trace line per ship — value UNMEASURED; essense-flow 0.27.0 + autopilot 0.5.0
are installed and silent outside `.pipeline/` — their remaining cost is process spawn only.

**Where the model already stands on each half:** the 09-06 reading (vision) prescribed deletions,
folds and guards on the PUSH side — #17 is that task, now moved ahead of Phase 2; "infinite
conflicting things" is #38 + Q21 (lifecycle + garden job, removal authority still unruled); the
judge is Q20 (option 3 pre-registered, n=3 then, four ships now); lighter models was Q13, folded
here. Invariant 11 binds: nothing retires on a promise or a thin sample, and a dead mechanism is a
QUALITY failure, not a cost one; invariant 12 binds the other way: a flat metric on a re-run
scorecard REMOVES a mechanism.

**Options (Claude's; each is a package the owner can take whole or per row):**
(a) **Cut the measured-dead push, keep what scores as used, garden the memory — the seven ranked
amendments from the capture, each with its evidence and its key:** (1) kb-hints OFF by default —
pointer kind, strict-follow 0 / 0 / 0 / 7.5%, the largest byte family, crowding the ~8–10 KB inline
bound recall needs (a QUALITY argument, not cost; pull stays — 109 `kb_query`/`kb_read` here since
09-06 say pull IS used, Q16's cue stays); (2) judge — with the 300 s cap live aithseis still picks
EMPTY 81% of 21 fires at p50 34 s: decide ranker-only vs judge per ship from
`judge.chosen_empty_pct` + `judge.agreement_pct`, and **if empty stays >50% after 20 more fires,
ranker-only** (Q20 option 5 — its trigger is now a number); (3) steward — rotate log.md (1669
lines); its recall row `used 0 / unknown 66` is UNSCORED, not unused — score by content before
dropping it from the index; the integration cadence contradicts 0.6.0's "integrate whenever
anything is unintegrated" (19 files here — 2 by the ledger — 15 on aithseis); `model: sonnet`
frontmatter on the steward agent for integrate passes (old Q13 (a): the visible diff is the
tripwire); (4) digest — keep, hard-bounded (kb 0.15.0 already does), score by content
(`uptake.by_family`) before judging; (5) lens — keep ON, read `lens.refuted` per ship after 20
dispatches, opt-in only if it reads 0; (6) strip the four-line preamble from MACHINE-INJECTED
bodies (keep it in the files) — every capture and inbox file repeats it; (7) "lighter models" —
the judge is already haiku; the lever for steward + lens is ONE `model:` frontmatter line each;
model price is not the cost, bytes and wall-clock are. (b) **Measure two more sittings on the
installed build, then cut what is still flat** — invariant 12's rule applied as written; costs
two more sittings of today's tax and the judge's answer is already in. (c) **Lighter models
everywhere, mechanisms unchanged** — addresses the lever the table says is NOT the cost.
(d) **Pull-only harness** — no per-prompt injection, no Stop judge; the psience control (2.0 KB,
0.3 min) is what that looks like, and psience is also where the owner said *"why is it not
saved?"*.

**Recommended default (Claude's): (a), all seven, in that order — one keystroke per row if the
owner wants to split it.** The two numbers the owner is feeling — bytes per prompt and minutes
inside Stop — have named owners (kb-hints bytes; the judge's empty picks), and each has a check
that decides it without argument: `hook_bytes.p50/p95` after the hints cut, `judge.chosen_empty_pct`
after 20 more fires. (b) would spend two sittings learning what the post-install window already
says; (c) alone would leave both numbers where they are; (d) is the one option the owner's own
psience complaint argues against. Nothing retires on a promise (invariant 11): every cut above is
gated on a number the scorecard already prints.

**Blocks:** the shape of #17's cuts; #38's first garden pass on this repo; the steward/lens
`model:` frontmatter (old Q13); Q20's ranker-only trigger.

---

## Q21 · Who may mark knowledge WRONG or unnecessary? [harness §7.8 / G15 — the garden job's authority; feeds #38]

**Context.** Owner, 2026-09-08 (verbatim): *"we are storing too many things. we should be
able to clean up wrong things or things that are not necessary and also keep learning from
what we are seeing."* Measured: standing context 25.6 KB per session AND per sub-agent;
`.steward/log.md` 82 KB, parts 49 KB; 23 archived digests titled by stamp produce noise
hits; top-3 kb ids fill 40% of hint slots, 84% of hints unread. Proposed (Claude's, §7.8):
kb entries get a LIFECYCLE — `live | superseded-by:<id> | refuted-by:<id> | archived` — set
in `status.json` (steward = only writer), joined onto entries at collect (the 0.11.0 shape,
zero engine change), held back by default and SAID ("2 superseded held back"); the history
stays — dead ends are the toolkit's most-queried knowledge. A GARDEN job (steward,
background, one per sitting like `integrate`, diff visible) proposes merges, supersessions,
archives and CLAUDE.md cuts from usage / size / contradiction measures; the lens's
refute/confirm marks `refuted-by`. What removes knowledge is the owner's to say
(invariants 1 + 2); what proposes it can be automatic.

**Options:** (a) proposal-only — every removal or supersession lands in the garden diff and
the owner ratifies it (one keystroke per batch); (b) the steward may AUTO-ARCHIVE entries
never pulled, hinted or cited in N sittings, with a visible diff and one-delete reversal —
N per project, suggested by the scorecard; refutations stay proposal-only; (c) automatic for
SUPERSESSIONS the substrate already proves (a capture carrying a CORRECTION / supersedes
header names its target), proposal-only for archives and refutations.

**Recommended default (Claude's): (a) to start, (c) now available** — its condition is MET: the
0.9.0 acted-on trace went LIVE with the 09-10 install (2 `duty:"acted-on"` lines read 09-11), so
(c) can follow immediately. A lifecycle mark that hides knowledge is a removal in effect, and no
removal moves unseen; (c) is safe only where the evidence is in the entry itself, and it removes
the most ritual. (b) still needs the usage measure to ACCUMULATE (`acted_on.*` keys — spans are
non-zero now, but "never pulled in N sittings" needs N sittings of it — and `acted_on.*` is a
FILE-OPEN measure, honest for POINTER kinds only; for injected bodies the measure is the
content-scored `uptake.used_pct`, capture `20260911-0300`, digest 09-17).

**REAL INPUT ARRIVED 2026-09-12 — the question is no longer argued from a wish (plugin-toolkit
1.16.0 `asset-value`):** knowledge is now ranked per kb SOURCE and per ASSET, with an
`unused_assets` keep/cut list the garden job can consume directly. First numbers: `.steward/log.md`
scored **0 of 1 used across 5 surfacings** — the biggest file in the model and the least used
when surfaced. Two cautions that change how (b) must be built: the uptake scorer credited
BOILERPLATE as use until the same release added idf weighting (steward-model 79% → 64%), so any
"never used" verdict predating 1.16.0 is unsound; and **`asset.origin_recorded` is FALSE** —
`.claude/kb/` is gitignored, so no entry carries a commit, author or history, and provenance can
only be captured by a frontmatter field AT WRITE time (owner deferred; → #38). An archive
decision without provenance cannot answer "who said this and when", which is exactly what makes
a wrong deletion unrecoverable.

**Blocks:** #38's removal policy; nothing built yet.

---

## Q22 · Design-duty severity — advise, or BLOCK on a measured regression at `@ship` only? [harness §7.7 / G14; feeds #37]

**Context.** Owner, 2026-09-08 (verbatim): *"as new things are added and context is
enriched we need to be designing better code. code is cheap now so we need to be designing
better codebases."* Today the concern is enforced by TEXT (five surfaces, kept by the Q15
ruling) and one advisory pre-code gate; the measured substrate exists and never runs
ambiently — the code-glossary engine's extensibility measure, dispatch scanner
(switch-on-type / registry detection), coupling and DRY clusters (2.1 s on `plugins/kb`).
#37 builds a turn-end duty over the files the turn touched (the 0.8.0 file-touch extractor):
the DELTA — a new switch-on-subtype or hard-coded concrete target, coupling edges added, a
duplicate cluster that gained a member, extensibility score down — named with file:line and
the catalog seam that closes it; a cluster reaching THREE members demands an extraction
decision (extract / accept with reason). Per project only, never across independently
installed plugins (invariant 7's scope limit); the signature signal is dead for untyped
params, so the duty must say which signals ran (#15 precondition).

**Options:** (a) ADVISE everywhere — one tail line naming the regression + the closing
seam, never blocks (invariant 8); (b) advise in-session, BLOCK at `@ship` when the baseline
score drops — a baseline file per project makes "lower" a number; (c) block in-session too
when a cluster reaches three members (extract / accept-with-reason demanded before yield),
the "context enriched" trigger made hard.

**Recommended default (Claude's): (b).** In-session hooks stay advisory (invariant 8); the
owner's own gate moment is `@ship` (5 uses, the real workflow), and a ship that lowers a
measured score is exactly what the owner said should not happen. (c) only if the scorecard
(#31) shows the advise is ignored. Under invariant 12 the duty ships with its key:
regressions caught per sitting — and the Q15-kept text surfaces retire only when that
number is non-zero over a week.

**Blocks:** #37's severity defaults; nothing built yet.

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
status is now UNCERTAIN (tasks #9 adjudicates whether it is red or test-all misses it, and
09-09 added a second intermittent). (c) Re-add later, gated behind #9 going green.

**Recommended default (Claude's): (a).** The revert survived a push in the same sitting, so
treat it as deliberate; correct the stale prose (folds into tasks #6). Re-adding is cheap
whenever wanted. If CI ever returns, its invocation must carry `--root` (the 08-23
gate-record correction).

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
protocols, where #15 Phase A wires the same measures — and since 2026-09-08 the owner's
two-axes wish routes the AMBIENT half to #37 (a measured design duty), which is (a) taken
one step further.

**Owner-words evidence toward (a), 2026-08-26 (verbatim):** *"the essense flow aprts are
rarely used so i don't know if it is what we are looking to populate. i want claude
overall to abide to this."* Said about the pattern menu, not the consumers — so it
STEERS, it does not close this question — but it is direct owner testimony that
essense-flow is rarely exercised, and the same reasoning executed: the vocabulary half
shipped AMBIENT (patterns 0.1.0), not into the pipeline.

**Options:** (a) surviving path only — #15 wires coupling/extensibility into executor
steps + #37 covers ambient sessions; the named-shape vocabulary is DONE ambient-side
(patterns 0.1.0); essense-flow keeps rung-2 + criteria 8/9, no new pipeline build. (b) Both
sides — pipeline projects get the consumers too (~consumer wiring only, the engine exists).
(c) Execute the 2026-06-26 plan as written, pipeline-first.

**Recommended default (Claude's): (a), now with owner-words support.** Building consumers
into a plugin slated to dissolve spends budget where the craft is leaving, and the wish
targets "the way we write code with Claude" GENERALLY — the surviving path's job.
Reversible: (b) is additive later if a live pipeline project shows the gap.

**Blocks:** the essense-flow half of the wish's scope; #15 and #37 proceed either way.

---

## Q17 · Retire or keep: reuse-gate · session-lifecycle · essense-flow · code-glossary — each measured at ZERO real use [Tier 3, audit 2]

**Context.** Audit 2 (five ships, 212 human prompts): reuse-gate dormant since 07-07,
0 projects configured; session-lifecycle 0 uses ever (no handoffs dir anywhere; `@prompt`
replaced it; kb's `handoffs` source then indexes nothing); essense-flow 0 uses since 08-10
(owner 08-26: "rarely used"; Phase E #19 already plans its retirement; Q4/Q5 hold its docs
until Phase D/E); code-glossary never invoked interactively, engine sound (2.1 s, found
two identical registries inside kb). Each is an EXTENSION-SURFACE question — what stays
ambient, what becomes a gate, what goes to `archive/benched-plugins` — not a keep/kill vote.
Since 2026-09-08 the code-glossary half has a concrete shape: #37's `@ship` design gate IS
the ★ option below, sharpened by the owner's two-axes wish.

**Options per surface (Claude's defaults marked ★):** reuse-gate — ★fold into
pattern-gate (one pre-write nudge, one guard) / keep as is · session-lifecycle — ★archive
to benched (drop kb's `handoffs` source config with it) / keep for public users / keep
only retro+meta-review as future steward verbs · essense-flow — the EXTRACT half is DONE (below),
so the live vote is ★**FREEZE** (no new investment, keep the slot; Phase E retires it; Q5 doc
repositioning may move earlier) / archive now / keep investing / extract `/research` + `/verify`
too · code-glossary — ★make it a GATE inside
`@ship` (drift + duplicate-registry + design-score check, deterministic — #37) rather than a
skill to remember / keep skill-only / archive.

**THE EXTRACTION IS DONE (2026-09-12, #39 CLOSED) — this question now has two facts it was
missing, and neither was self-answered by the session that produced them:**
1. **`/elicit` is out.** It landed as its own plugin, `plugins/elicit/` 0.1.0 (one SKILL.md,
   zero code, bundle-safe), retargeted at `.steward/vision.md` + `questions.md`. So the one
   capability with a life outside the pipeline no longer depends on essense-flow being
   installed, whatever this question rules. The sub-choice "own plugin or steward verb" was
   settled IN FACT by the build (own plugin); its consequence is that #16's Phase-B `/discuss`
   must extend or absorb elicit, never duplicate it.
2. **Keeping essense-flow installed now costs ~zero.** Its measured harm was never the skills
   (0 invocations, no cost) — it was 535 DEGRADED banners + 305 autopilot halt diagnostics per
   audit window, and 0.27.0 / 0.5.0 fixed both at the source. "Freeze" therefore means "stop
   investing", not "endure the noise", and the ARCHIVE option loses its urgency argument: the
   decision can be made on reach and maintenance alone.
**Still the owner's to rule:** whether essense-flow keeps its bundle slot or goes to
`archive/benched-plugins` now versus at Phase E (#19); and whether any OTHER skill deserves the
same extraction — `/research` and `/verify` are the named candidates, both useful without a
state machine (the session that built elicit did not touch them).

**Recommended default (Claude's): the four ★ marks** — each is a fold, a freeze or an
extraction, none deletes a capability the owner uses; all reversible from the archive branch.

**Blocks:** Q5's timing; #17's fold scope; #19's Phase-E benching. (#39's build legs are CLOSED
— nothing is waiting on this to ship, only to be retired.)

---

## Q20 · The recall judge is a NOISY sample, not a verdict — keep, narrow, vote, or replace? [Q11 datum, inbox 20260906-1700]

**Context.** Q11 was RESOLVED on quality-over-speed assuming the judge's pick is the quality
ceiling. Measured 2026-09-06 on one real 8.8 KB prompt (haiku, 28-entry index): the child
DELIBERATES 2.1–8.9k output tokens for a ~600-char verdict, the amount varies 4× on
identical input (`--effort low` 25.8 s → 56.9 s on two identical runs; `--effort medium`
95.8 s > the 60 s budget — the mechanism behind audit 2's 12 ETIMEDOUTs); the SAME
configuration twice → DIFFERENT picks in every pairing tried; 10-turn replay: identical
verdict sets 3/10. The lean flags buy −36% cost + no harness boot in the child + no state
pollution, NOT speed (shipped in 0.7.0 for those). Every option below is measurable with
ONE check: 10 repeats on 3 real turns → agreement rate, p95 ms, cost, against the measured
rows. Since 0.8.0 the judge also sees "FILES THIS TURN OPENED" and drops already-read notes
— a smaller candidate set for free; whether agreement moved is part of the same check.

**Options:** (1) keep as is — accountable now (trace `engine`/`ms`/`costUsd`/`lean`),
fallback ranker on timeout; (2) `--effort low` as the default — cheapest measured, still
noisy (n=2); (3) the ranker pre-selects top-K (K≈8) candidates and the judge rules only on
those — smaller prompt, less to deliberate (this is NOT the dead "should recall fire?"
pre-filter: recall still fires every turn and the judge still chooses); (4) two-vote judge,
keep the intersection — halves false positives, doubles cost; (5) ranker + per-session
dedupe replaces the LLM judge; the saved tokens go to the lens.

**Recommended default (Claude's): (1) NOW, (3) as the pre-registered candidate** — nothing
retires on a promise (invariant 11): keep the judge until a 0.8.0 trace exists (#1 leg f)
and #30 writes the agreement inputs; then run the one check with (3) against (1) and adopt
(3) only if agreement is not worse and p95 ms is lower. (5) is the fallback if agreement
stays near chance — a coin-flip judge is a dead mechanism, and a dead mechanism is a quality
failure by the owner's own law.

**FIRST REAL NUMBERS, 2026-09-11 evening (the check RAN — session log entry, `node -e` over the
trace + `harness-stats --root .`):** 9 recall lines, every one carrying `judge_chosen` +
`ranker_top`; **the judge returned an EMPTY pick in 6 of 9** sittings where the ranker had
candidates, and in the 3 where it did pick, its top choice was NEVER the ranker's top
(`agreement_pct` 66.7 on `agreement_n` 3 counts overlap, not top-1 — read them as different
questions). n=3 retires nothing (invariant 11: no mechanism dies on a promise or a thin sample),
but the shape of the failure is now known and it is not the one the options were ranked for:
the dominant mode is the judge declining to choose at all, which option (3) — ranker
pre-selects top-K, judge rules on a small set — addresses head-on, while (2) and (4) do not.
**Trigger to bring this back:** 10 more recall lines, or any sitting where an empty pick loses
material the session then had to re-derive.

**Blocks:** nothing — the wait is over and the first reading is in.

**2026-09-17 (the owner's value question, Q26): the cap is gone as an excuse, and the judge still
declines.** Whole-life: empty picks 42–52%, p95 pinned at the old cap in every ship (state.md
table) — a whole-life artifact, because the 60 s cap was OURS, raised to 300 s by the owner's
09-14 ruling (resolved ledger) and INSTALLED the same day. Post-install (`--since
2026-09-14T18:30Z`): **aithseis 21 fires, p50 34 s, p95 66 s, 81% EMPTY**; twin 3 fires, 67%;
mk-cc 2 fires @ 73 s, 0%. So the dominant mode is confirmed on a build that can finish: the judge
declines to choose, and giving it time did not change that. **Trigger, now a number (Q26
amendment 2):** per ship, `judge.chosen_empty_pct` + `judge.agreement_pct`; if empty stays >50%
after 20 more fires → option (5), ranker-only, that ship. Option (3) stays the alternative if the
owner wants to keep a judge at all.

---

## Resolved ledger (provenance — these answers are now law in the model)

- **Owner RULING (2026-09-14, recorded from source 09-17 — the sitting left no inbox item): the
  judge timeout ×5.** Verbatim: *"extend the timeout if it's in our hands make it 5 times longer i
  don't care"* → `DEFAULT_TIMEOUT_MS` 60 s → 300 s, Stop hook ceiling 420 s; the platform never
  capped Stop at 60 s (probed: a 300 s-declared hook ran 75 s to completion). Provenance:
  `plugins/turn-end/lib/judges/claude-p.js:66-82`, `hooks/hooks.json:14`; kb capture
  `20260914-0200`. Supersedes every "60 s budget" wording in Q20, state.md and parts.md.
- **Q24 · plugin-toolkit reach → CLOSED BY INSTALL (recorded 09-17 from the ledger; the sitting
  left no capture).** `installed_plugins.json` carries `plugin-toolkit@mk-cc-resources` 1.18.0 at
  `553c366`, 2026-09-12T17:21Z, AND `mk-cc-all` 2.28.0 (09-11T21:33Z, which carries elicit) — the
  layout in fact is option (a): standalone toolkit + the full bundle, six skills double-listed.
  The four gates reach any project; elicit reaches every bundle install. Whether to slim the
  bundle (the (b) half) is #2's residue, not a reach question. The model carried "plugin-toolkit
  is NOT installed" for six days after it stopped being true — the 09-17 digest still said so —
  which is the counts-class defect on the install side: an authored install fact, exactly what
  `running.installed_vs_checkout` exists to compute.
- **Q25 · `@fc` → CLOSED BY BUILD (09-13/14; recorded 09-17 at subject level).** The tree is clean
  at `6052e6b` == origin with thorough-mode 1.12.2 on disk, so (i) is answered — it shipped; and
  commit `34536d9` "feat(turn-end): fewer-clicks — the owner's law, checked where the answer is" is
  option (c)'s conditional duty, built (turn-end 0.12.0 per the root CLAUDE.md). Whether the owner
  ruled (a)+(c) or the session executed under the standing 09-06 delegation is NOT recorded in the
  model — the sitting left no capture; the next pass integrates it from one.
- **Q13 · steward on sonnet → MERGED into Q26 (2026-09-17).** The owner's own question now covers
  it (*"lighter models for this work in general"*); Q13's trial shape — try it, the visible diff is
  the tripwire, one weak diff ends it — is carried inside Q26 option (a).
- **Q23 · the standing `[instr]` keys → DELEGATED and SHIPPED (owner 2026-09-10, verbatim "you
  decide"); the model carried it as open for two days too long.** Five keys ship in
  `plugins/plugin-toolkit/defaults/harness-stats.json` (a project overrides the list wholesale in
  `.claude/harness-stats.json`; sources merge by id, a malformed project config is reported, not
  fatal). RE-PICKED 2026-09-11 under the quality-over-cost law (invariant 11): the line LEADS
  with `uptake.used_pct` and carries NO byte count — the owner judges the harness by whether the
  work improved, not by bytes. File read this pass, so the claim is disk-backed. Provenance:
  log 2026-09-10 (the ship entry records the delegation and the check `harness-stats --line`
  printing the five keys).
- **Owner rulings (2026-09-09, one-keystroke panel — four questions, defaults marked; two
  answers differ from Claude's recommendation and are recorded as LAW, not argued):**
  **Q19 · ground truth for "done" → RAN AND OBSERVED:** a check ran after the last file
  change AND was observed (exit code recorded); not required green; per-project override
  allowed (the `requireGreen` knob, shipped turn-end 0.8.0, default off). Claude's default,
  chosen; deny-list not raised — the doc's default (none until the scorecard shows a class
  of irreversible mistakes; settings-level `permissions.deny`, never a hook) stands. #28's
  ledger leg BUILT under it. **Q18 · goal duty → arms EVERY task the owner starts** (`do
  it` / `steward:next`): the task's done-check is the termination criterion; one tail line
  if the session yields with it unmet; advise, never block. ALSO ratifies *"a mechanism
  ships with its metric key"* → vision invariant 12. Claude's default, chosen; #32
  UNBLOCKED. Not ruled: harness §9.5 (`/goal` with idle check-ins) — the doc's default
  EXCLUDED stands under invariant 1; #32 carries the goal inside the one tail. **Q16 ·
  zero-setup memory → KEEP THE CUE.** No auto-seed, no one-keystroke seed; the existing
  one-time `/kb-seed` cue stays. The owner chose against BOTH proposals — CLOSED as "no
  change"; G11 carries no task; Phase D's on-ramp is hand-seeding. **Q15 · the design-moment
  injection → SLIM ONLY.** Trim the global CLAUDE.md Generalize-First Gate (and the `++`
  restatement) to what the patterns / generalize-first hooks do not already inject; keep
  every hook as it is; NO fold into a registry hook. The owner chose (a)-shaped over the
  recommended (c); APPLIED the same sitting (gate 1,788 → ~640 B, file 6,528 → 5,228 B,
  backup kept); #17's registry-fold leg is OFF the plan; the measured design-duty path
  (§7.7 → #37) stands separately and is the only way the text retires. Executor consequence
  the owner saw: #29 → #27 → #28 → the slim, then #30/#31, #32 after #28 — Phase 0 built
  and shipped `68ce999` in that order. Provenance:
  `inbox/20260909-0015-owner-rulings-q19-q18-q16-q15.md`.
- **Owner LAW (2026-09-09): no pointers — everything in-environment, least clicks.**
  Verbatim: *"also this cannot be poitning me to files. it needs to be giving me eveyrhting
  i need in a digestible manner within this environment or i need to be seeing something
  it needs to be doing as many of the thigns on it's own and leaving the least amount of
  clicks to me"* (said after an answer that ended "see §7.7 / §7.8"). Now vision invariant
  13, sharpening 2 and 6; applies to every owner-facing surface; the surfacing rule at the
  top of this file. Provenance:
  `inbox/20260909-0010-owner-no-pointers-everything-in-environment-least-clicks.md`.
- **Owner wish (2026-09-08, two more harness axes — nothing decided beyond the wish):**
  modular/decoupled code that improves as context enriches; documents kept clean (prune
  wrong/unnecessary, keep learning). Verbatim in vision (the frame); Claude's answer in
  `design/harness.md` §7.7 / §7.8 = G14 / G15 → tasks #37 / #38; the two decisions only the
  owner can make → Q21 / Q22 above. Extends the HFDP wish and invariants 4 + 7. Provenance:
  `inbox/20260908-1905-owner-two-more-axes-modular-code-and-clean-docs.md`.
- **Owner request (2026-09-08, EXECUTED as research; decisions parked): "research what a
  Claude harness is… is what I currently have a harness? … complete management of managing
  memory, of managing context, of pushing the work further, of verifying the work."** →
  `design/harness.md` (log 2026-09-08): Claude Code IS the harness, this toolkit is a
  harness LAYER (vision frame); ten components with measured status; gaps G1–G13 → tasks
  #29–#36 (+ #27 #28 #17 and Q15–Q17 as already homed); §9 owner decisions → Q18 (goal
  scope + the rule), Q19 (strictness + deny) — both RULED 09-09 (entry above). Two live
  findings on the way: installed≠running (G1 → #29, BUILT) and recall's Bash-blind detector
  (G2 → #28, BUILT). Provenance:
  `inbox/20260908-1748-owner-research-what-a-harness-is-and-plan-to-make-toolkit-a-complete-harness.md`.
- **Owner directive (2026-09-06, EXECUTED same sitting): "ok, decide what is the best way to
  handle it. the need is that my vision is applied and works."** Reply to Claude's prism
  answer (next entry). Claude's decision under it: Tier 1 first as small verified batches →
  #23 #22 #24 #25 #26 + lens-restored 1b BUILT (four log entries 2026-09-06), nine plugins
  bumped, gates green, SHIPPED `bc39fe0` on the owner's "@ship it", installed — NOT yet
  running in that process (G1). The scorecard baseline (#31) and the push-side prism run
  (#17 step 0) are the sequence's next two steps. Provenance:
  `inbox/20260906-1520-owner-decide-and-apply-vision-must-work.md`.
- **Owner question (2026-09-06, ANSWERED by Claude, then delegated): "should we use prism
  to solve these issues? … redesign as long as it fits my vision… result based."** Answer:
  plumbing (Tier 1) gets no panel — build, run the named check, done; the PUSH-SIDE fork
  (what a session receives from memory, when, how big; owner-named lens
  *what-I-actually-experience*) is panel-worthy AFTER a scorecard baseline; prism AS a
  mechanism replacing lens/judge/steward: not yet — those measurably work, the plumbing
  fails, and the lens has no telemetry to judge a panel by. The verbatim prism brief is
  preserved in the inbox file for #17 step 0. Provenance:
  `inbox/20260906-1500-owner-should-prism-solve-the-audit-issues-result-based.md`.
- **Lens corrections to the audit-2 plan (2026-09-06, Claude accepted all five):** silent
  drops restored (1b BUILT; items 18 → #15, 19 → half at #24 / rest #8, 20 → #17, 21 → #8,
  22 → #35); item 1's check amended to recall QUALITY (came back uninterpretable → Q20);
  `background_tasks` may never arrive (0.7.0 derives from the transcript); the ranking key
  SPLIT — owner rulings (quality over speed; dead mechanism = quality failure) vs
  Claude-derived values (fold > add; fire conditionally; deterministic > LLM); items 2/4
  softened (give-up ONCE; cap primary, order secondary) — all as built. Errata: avg 6,361 B
  per prompt, 33 real sessions + 1 unknown, spawns ≥8 UPS + 5 Stop. Provenance:
  `inbox/20260906-1405-audit-2-plan-corrections-from-lens.md`.

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
  Phase 1 item (6) + Phase 3 stats. **Numbers 2026-09-06 — CORRECTED the same day:** the
  audit's one-word probe (33.0 s wall / 3.8 s API → 3.9 s with `--setting-sources ""`)
  measured STARTUP on a trivial prompt; on a real 8.8 KB prompt the child DELIBERATES
  (api_ms ≈ wall, 2–9k output tokens, nondeterministic picks — inbox `20260906-1700`). The
  lean flags shipped in 0.7.0 for cost + isolation, not speed; the ranker-first "should
  recall fire?" pre-filter stays dead; whether the judge's NOISE is acceptable is the new
  question → Q20. Provenance:
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
  is the wrong lever before #27; #27 SHIPPED 0.13.0 on 09-09, #11 re-measures after it.
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
  invariant 10; shipped as turn-end 0.4.0 `self-check`, live-proven 08-10/08-23; given
  GROUND TRUTH in 0.8.0 (Bash-aware file-touch, named-check floor, exec-result recorder).
  Provenance: `inbox/done/20260801-2349-self-check-before-done.md`.
- **Owner pass 2 on self-check (2026-08-02, EXECUTED in turn-end 0.4.0 pre-release):** a
  run is a check only if OBSERVED (*"it needs to have used enough logs for it to be able
  to understand what happened"*), COMPARED vs the ASK (*"and if it was what was asked"*),
  and probed to BREAK (*"tested to break it and not only happy paths"*). Executed:
  `ran-and-looked` detector, result-tense-only named checks, ask teaches
  run→LOOK→compare→break. Vision invariant 10 sharpened; Q19 (09-09) made OBSERVED, not
  green, the floor of "done". Provenance:
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
