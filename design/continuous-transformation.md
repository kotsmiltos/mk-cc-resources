# Continuous Transformation — v3 (full re-derivation, 2026-07-21)

> **Read this before doing anything**
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

> **type:** design source of truth
> **output_path:** design/continuous-transformation.md
> **key_decisions:** steward-recomputes-the-model on every input (the re-derive discipline made structural, not textual); pull-based synchronous work (captain present, ship never moves unseen); rich living model, NOT a one-pager; existing tools become steward/executor internals
> **open_questions:** model file-structure (what sections, what granularity); steward token cost per /sync; model-bloat pruning policy; pilot confirmation
> **history note:** v1 was accreted; v2 re-derived but carried three owner-refuted ideas (one-page kernel, unattended nightly autonomy, rule-as-text). v3 re-derives with the owner's 2026-07-21 corrections in full. Superseded content is deleted, not archived. Provenance: all quantified counts trace to the 2026-07-21 transcript audits (6 parallel agents, ~60 transcripts) and same-day lens re-verifications.

---

## 0. What the owner corrected, and what it means (load-bearing — do not re-litigate)

1. **"You cannot describe the whole project in one page… it is not doable."** A real project's living intent does not compress to a page. The intent substrate must be a **rich, structured model** — the externalized head of a good tech lead: vision, current state, parts + contracts, open questions, next tasks. Multiple files, real content. Compactness comes from structure and pruning, not from a page limit.
2. **"The engine works through the inbox without me — that is totally false. This can never happen."** And the reason is the design's most important constraint: *"I will wake up in the morning, and the ship will be somewhere, and I will not know where it would have gone and why… I've lost track. I've lost interest."* **Situational awareness IS engagement.** The owner's connection to the project — knowing where the ship is and why — is the fuel. Unattended work severs it. Therefore: **the ship never moves unseen. Autonomy is in DEPTH (the AI does all the detail), never in TIME (work does not happen in the owner's absence).** Pull-based: work happens NOW, when the owner says so, while they watch.
3. **"If you just add the line somewhere, you're not gonna respect it."** Correct, and the toolkit's own history proves it (rules preached everywhere, enforced nowhere → gates that run in zero projects). Disciplines must be **mechanisms, not text**. The re-derive-don't-patch discipline becomes a ROLE in the system (the steward, below) — it happens because the process routes through it, not because an instruction asks nicely.

Carried forward from v1/v2 (still true, evidence unchanged): AI fast at writing code / slow at ceremony (manual 10× pipeline); patch-not-rethink is the root failure at turn/code/project altitude; pipeline tools launch-only in practice (all invocations week 1, everywhere); owner is currently the engine (20–93 steering turns/session); decoupling gates exist (`runner coupling`/`extensibility`, runner.py:285-337) and run nowhere; per-intent cost budget (one build agent + deterministic checks + max one review pass — never loops).

## 1. The model (v3): mailroom, steward, captain-present work

Two persistent things per project, one interaction loop.

### THE MODEL — the project's living overview (rich, not a page)
A structured artifact set — the single place the project's current truth lives:
- **Vision & why** — what this is, who it serves, what matters (changes rarely, but CAN change).
- **Current state** — what exists, what works, what's known-broken. Honest, current.
- **Parts & contracts** — modules, what each promises (`exposes`/`consumes`), test pointers. (The code-side stays honest via the existing machinery: MAP.md/`runner map` for what exists, coupling/extensibility gates for how tangled.)
- **Open questions & decisions** — pending owner calls, each with context + a recommended default (absorbs librarian's unknowns[] and the decision-queue idea).
- **Next tasks** — the derived, ordered, ready-to-hand-off queue. Always current because it is RECOMPUTED (below), never appended blindly.

The model is machine-read by every working agent and is the ONLY context a session needs — session-start context reconstruction (the pasted-kickoff ritual, @prompt, handoff.md) becomes obsolete: the steward reports state from the model in seconds.

### THE STEWARD — "the guy behind the inbox" (the re-derive discipline, made structural)
A defined role (agent + strict protocol), invoked at inbox-processing and on demand. Its ONLY job:
1. Pick up each inbox item. Understand it **against the whole model**.
2. **Recompute the model.** If the item implies an addition — add. An edit — edit. A deletion — delete. A pivot — cascade the change through vision, parts, tasks; drop tasks that no longer serve; add the ones that now do. Never bolt an item onto the task list without reconciling the whole.
3. Re-derive **next tasks** from the updated model.
4. **Show the diff**: "here is what your input changed in the project — this was added, this edited, this deleted, this reordered — and why." The owner always knows where the ship is and why. The diff is how tracking (and therefore interest) survives.

The steward never writes product code. It maintains understanding. Honest enforcement chain (the steward is an LLM following a protocol — nothing magically *forces* recomputation, so append-only stewardship is **detected, not trusted away**): (a) the mandatory diff at every /sync — a lazily-appended item shows up as a bolt-on diff the owner sees immediately; (b) Phase B's adversarial suite — pivot/contradiction/deletion/duplicate items must produce correct cascaded diffs; (c) a recurring spot-check — periodically one adversarial item is re-injected during normal use, and a correct cascade is the ongoing proof. (Same property as the owner's verification lens in the checking direction, applied before work, on the plan itself. Until Phase 0 lands, the meta-project's own re-derive discipline remains instruction-based — the memory rule — which is exactly why Phase 0 builds the mechanism.)

### THE CAPTAIN'S LOOP — ambient, zero commands to remember (owner correction #4, 2026-07-21: "now I need to remember even more things… fuck that")
The audits already proved the rule: 14 essense-flow slash commands — all abandoned; the ONE adopted ritual (`@prompt`) survived because it fit a motion the owner already makes. Therefore the loop attaches to existing motions; it adds NO vocabulary:
- **Opening the project IS the briefing.** SessionStart hook (same machinery essense-flow's context-inject already uses): the steward reports, unprompted, in ~5 lines — where the ship is, what changed since last time, the next 3 tasks, any decision waiting. No pasted context, no /resume, nothing typed.
- **Talking IS dropping.** The owner types whatever they want, like they already do — messy asks, rants, half-ideas. Anything not an immediate work instruction is captured to the inbox automatically. No /drop.
- **Plain words ARE the verbs.** "what's next?" → answer from the model. "do it" / "work on the clumping thing" → executor runs now, owner watching. "wait, I think food should rot" → captured, steward recomputes, shows the diff. Slash commands exist only as optional aliases for power use — never required, never taught first.
- **Wrap-up IS the sync — and leftovers integrate at next open.** When the owner signals the end ("sync"/"wrap up"), the steward integrates the session's inbox and shows the diff. If the owner just leaves, unintegrated items are flagged by the next opening briefing and integrated THEN, owner present, before other work. (Build note, v0.1.0: there is deliberately NO Stop/session-end hook — Claude Code's Stop event fires at every turn-end, not session end, and a per-turn steward dispatch would violate the one-pass cost budget this design mandates. Next-open integration keeps every diff owner-present with zero per-turn tax.)
- **Executors** do the detail under the cost budget: small step → tests + coupling/extensibility gates → show result + named check. The lens fires at hand-back (a "done" claim exists to check) — the lens IS the one review pass, not an extra loop.
- The owner's presence is captain-shaped only: pick, watch, redirect in sentences. Speed from the fast loop (the 10× mode), continuity from the model, engagement from presence + diffs, adoption from zero added memory load.

**Background work: none that moves the ship — and none that moves the MODEL either.** The one permitted absent-owner activity is mailroom sorting: the steward MAY pre-digest inbox items into staging annotations **inside inbox/ only**, so /sync is instant. Zero model writes, zero code writes, zero task-state changes in the owner's absence — ALL integration happens at an owner-present /sync. This limit is permanent, not probationary: the owner's refutation was "this can never happen," not "off by default."

## 2. What happens to the existing toolbox (owner asked: "they were the first version — what are we doing now?")

| Tool (v1) | v3 role |
|---|---|
| essense-flow phases (elicit/research/architect/build/review/verify) | Dissolve into steward + executor craft: elicit's questioning = how the steward interviews when the model has holes; architect's contract discipline = how the model's parts section is kept; research = a steward verb whose output lands in the model; review/verify = executor hand-back checks. The phase ceremony retires; the craft survives. Classic pipeline stays available but is no longer the recommended path. |
| @prompt / handoff / resume (the manual continuity ritual — 21 prompt files + 254 @prompt calls in crowd-game alone) | Obsolete as user rituals. The model is the continuity. Session start = steward reports state + next tasks from the model. |
| code-glossary MAP / coupling / extensibility | Finally wired: MAP feeds the model's current-state; gates run on every executor step (this is what keeps code un-tangled and parts rebuildable — regeneration-over-patching stays available as an executor tactic when a part resists change). |
| verifiability-lens | Kept — it caught 5 real errors this session — but re-economized: fires at task hand-back and on risk signals, cached config, bounded. Not per-turn. |
| librarian unknowns[] / AskUserQuestion gates | Become the model's open-questions section — surfaced via /sync and /next, persistent until answered. |
| essense-autopilot | **Retires.** Its entire purpose is auto-advancing the phase pipeline — and it is the closest thing in the current kit to TIME-autonomy, the refuted failure mode. Nothing to auto-advance; nothing should advance unseen. |
| thorough-mode modifiers (@thorough, @verify, @build, @debug…) | Working-style carried INTO the executor protocol as standing discipline (executors always work thorough/verified — no per-prompt token needed). @prompt alone is obsolete (model = continuity). |
| reuse-gate | Folds into executor-step discipline: the check-existing-before-writing reminder becomes part of the executor protocol at code-write time. |
| session-lifecycle retro / meta-review / claude-md-sync | retro + meta-review → candidate steward verbs (/retro over the outcome record; friction findings become inbox items). claude-md-sync → absorbed by the model-vs-code drift check for pilot projects; unchanged for non-steward repos. |
| dry-refactor | Executor tactic alongside regeneration: when a part resists change, the executor picks rebuild-from-contract or glossary-driven extraction — same gate checks either way. |
| alert-sounds, caveman, scout, note-tracker | Unaffected; orthogonal. |

## 3. Stress-test against the record

| Observed failure | Under v3 |
|---|---|
| Owner-as-engine (20–93 steering turns/session) | Presence stays, detail leaves: pick/watch/redirect. The steering turns were detail-driving; those become executor work. |
| Session-start reconstruction ritual (every project) | Dead: the model is the memory; steward reports it. |
| psience persona churn (feedback → patch × 45-turn session) | "The voice is wrong" is an inbox item → steward recomputes what the product IS → affected parts rebuilt from updated contracts. One recompute, one wave — visible diff each step. |
| Pipeline week-1 abandonment | Nothing to abandon: no phases. The loop is the same on day 1 and day 100. |
| job-platform death (questions died with the session) | Open questions live in the model, resurface on every /sync until answered. |
| Binance mega-refactors (accreted coupling) | Gates on every executor step from day 1. |
| Morning-mystery objection (v2's own flaw) | No trigger for absent-owner work exists (everything runs on the owner's word, owner present); the one absent-owner activity is inbox-staging — itself diff-visible at integration and covered by the Phase B checks. Detected, not trusted away. |
| This session's own patch-loop (3 owner catches) | The meta-project now runs the same mechanism: owner feedback = inbox item; this doc = the model; each feedback round = full recompute (v1→v2→v3 are the receipts — v3's existence is the discipline working, structurally). |

## 4. Honest risks

1. **Steward mis-recomputation** — it will sometimes misread an item's implications. Mitigation: the mandatory diff — wrong understanding is VISIBLE at /sync, corrected in a sentence, before any code moves. Wrongness is cheap when it's caught at the model, expensive only when it reaches code unseen.
2. **Model bloat/rot** — a growing artifact set can drift into the dead-SPEC state. Mitigation: deletion is a first-class steward operation (owner's words: "if it's a deletion, it deletes"); recomputation prunes by definition; the deterministic drift-check (model contracts vs `runner map`) stays.
3. **/sync cost** — recomputing against the whole model on every batch costs tokens. Bounded: the model is orders of magnitude smaller than transcripts; measure in the pilot, set the budget from data (no arbitrary thresholds).
4. **Executor quality still bounded by tests.** Where tests are weak, hand-backs are weaker. Unity constraint stands (verified): editor-bound tests → fast suite (471 EditMode, ~10s) on every step; slow suite (29 PlayMode, editor-seizing, unstable at 8× time-acceleration) batched to owner-present moments.
5. **This design can still fail the owner's engagement test** — if /sync diffs are noisy or preachy, tracking dies the same death. Diffs must be short, concrete, why-first. Treat digest quality as a first-class requirement, measured in the pilot.

## 5. Plan

- **Phase 0 — the steward goes ambient on the pilot (no experiment framing, no commitment — owner correction #4: it must cost the owner NOTHING to try).** Build, in mk-cc-resources as one plugin (steward agent def + SessionStart briefing hook; integration runs at owner wrap-up or next open — deliberately no per-turn/session-end hook, see §1): on first session in crowd-game the steward finds no `model/`, offers to build it itself from what's there (VISION.md, CLAUDE.md, `runner map` output); from then on every session opens with the 5-line briefing and closes with the diff. Owner just… uses the project normally. Disable = one line, any time. Measurement is passive (transcripts record steering-turns and briefing usefulness; no metrics homework for the owner). *Checks: (a) session starts require zero pasted context — briefing from the model alone; (b) integration diffs read correctly — owner can always say where the ship is; (c) steering-turns per landed task ≈ 0 between "do it" and hand-back; (d) at least one real direction-change lands as: spoken thought → model recompute → visible diff → rebuilt part.*
- **Phase A — wire the gates** (coupling/extensibility + tests into every executor step; deterministic model-vs-code drift check). *Check: deliberate reach-in fails a hand-back; stale model entry flagged.*
- **Phase B — harden the steward** (recompute protocol tested against adversarial inbox items: a pivot, a contradiction with the vision, a deletion, a duplicate; verbs beyond /next: /discuss /test /work). *Check: each adversarial item produces a correct diff, including cascaded deletions — AND the recurring spot-check is wired: one adversarial item re-injected periodically during normal use keeps proving the cascade works, not just once at test time.*
- **Phase C — lens re-economics** (hand-back + risk-triggered firing, cached profile). *Check: fire-count vs measured pilot baseline drops with zero missed hand-back failures.*
- **Phase D — second project + generalization pass** (EMDE or psience; extract what's crowd-game-specific; the verb set and model structure prove open or get fixed). *Check: second project onboards by seeding a model, no code changes to the tooling.*
- **Phase E — retire ceremony officially** (docs + marketplace reposition; classic pipeline preserved for those who want it). *Check: new toy project goes idea → running slice through steward loop only, one evening.*

The owner's re-derive discipline for THIS meta-project stays in force mechanically: every future feedback round = inbox item against this doc = full recompute = new version with diff. No text-rule pretends to enforce it; the process does.
