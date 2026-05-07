---
name: heal
description: Pipeline self-heal. Picks up from any prior state — fresh project, mid-flight pause, prior tool's artifacts, code-without-spec. Walks the working directory, infers phase from on-disk artifacts (reading shapes, not just listings), proposes a walk-forward, applies via legal transitions only on user confirm.
version: 1.0.0
schema_version: 1
---

# Heal skill

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Heal can run from **any** state, including `idle`, missing state, or corrupt state.
- Heal NEVER silently mutates state. Every inferred change is presented as a **walk-forward proposal**; the user confirms via `AskUserQuestion` before any state write.
- When the user confirms, heal applies the inferred state through **legal transitions one step at a time** — no jumping, no skipping the state machine. Legal transitions go through `essense-flow-tools state-set-phase`. Illegal-phase recovery (current phase non-canonical) goes through `essense-flow-tools state-force-set-phase`, which writes HEAL-LOG.md atomically before mutating state.yaml. After the first force-set step, subsequent steps must transition legally without force.
- Read artifact bodies, not directory listings. Existence alone is never sufficient evidence.
- Append to `.pipeline/heal/HEAL-LOG.md` after every applied step — what was inferred, why, and what was applied. Force-set and cursor-rewind ops update HEAL-LOG.md frontmatter automatically (`force_actions[]`, `cursor_rewinds[]`); body-line entries are also appended.

## Skill operating mechanism (S9.7 redesign — 2026-05-08)

Heal's substance — Discover → Infer → Propose → Apply (one legal step at a time) → Hand off — is preserved verbatim per the 2026-05-05 preservation contract. The mechanism re-routes state writes and path lookups through the narrow CLI surface so master cannot improvise.

**Eleven-step CLI op sequence** master walks during a heal invocation:

1. `essense-flow-tools init heal --project-root <root>` — returns canonical_paths (`heal_log_md`, `proposal_yaml`, `heal_archive_dir`), 6 ordered_steps (`discover-artifacts → infer-phase-and-confidence → propose-walk-forward → await-user-confirm → apply-walk-forward-step-by-step → handoff`), `phase_from`/`phase_to`/`transitions` as descriptive strings (per init-spec §1.8 D-2 closed at S6.5: heal walks the full graph; consumers interpret), `sub_agents: [{name: 'essense-flow-sub-recognizer', cardinality: 'optional, judgment-driven', quorum: 'tolerant'}]`, `degraded: <bool>` (true when state.yaml absent or corrupt).
2. `essense-flow-tools step-advance --skill heal --next-step discover-artifacts --project-root <root>` — cursor open at step 0.
3. **Discover.** Walk project root + candidate paths from init JSON's hint (and from `defaults/config.yaml.discovery.prior_artifact_paths` if configured). Read bodies. If volume is large, dispatch `essense-flow-sub-recognizer` agents in parallel — one per shape (`SPEC-shape`, `REQ-shape`, `ARCH-shape`, `sprint-output-shape`, `foreign-tool-prose-shape`, or other). Tolerant quorum: a missing shape return becomes a synthetic "shape not surveyed" entry. Master STILL writes proposal.yaml and HEAL-LOG.md regardless of dispatch.
4. `step-advance --next-step infer-phase-and-confidence` — cursor advances.
5. **Infer.** Synthesize discovery records into `(inferred_phase, confidence, walk_forward[], reconciliation_actions[], unknowns[])`. Confidence is `high` (every artifact shape-matching + complete) | `medium` (some partial / prose drafts) | `low` (only prose / wholly unrecognized).
6. `step-advance --next-step propose-walk-forward` — cursor advances. Master writes `.pipeline/heal/proposal.yaml` (canonical path from init JSON `canonical_paths.proposal_yaml`) via ordinary `Write`. Shape per substance "Job 3 — Propose" template.
7. `step-advance --next-step await-user-confirm` — cursor advances. Master surfaces proposal via `AskUserQuestion` with arrow-key options Accept / Edit / Reject.
8. `step-advance --next-step apply-walk-forward-step-by-step` — cursor advances. **Per walk-forward step, in order**, master picks the appropriate CLI op:
   - **Legal transition between canonical phases** → `essense-flow-tools state-set-phase --value <to> [--sprint <n>]`. Existing legal-transition + prerequisite-predicate + per-task-record gate enforcement applies.
   - **Illegal-phase recovery** (current phase non-canonical, e.g., `phase: building` from a v0.7 state file) → `essense-flow-tools state-force-set-phase --value <canonical-phase> --reason "<one-line audit reason>"`. Use **only on the first step** of an illegal-phase walk per substance "use `force: true` on **only the first** finalize step" rule. The op refuses if current phase is already canonical AND state non-degraded (recovery-only guard, exit 9). The op atomically appends `force_actions[]` to HEAL-LOG.md frontmatter BEFORE writing state.yaml.
   - **Stuck cursor from a prior aborted skill run** → `essense-flow-tools cursor-rewind`. Idempotent (no-op when cursor absent). Atomically appends `cursor_rewinds[]` to HEAL-LOG.md frontmatter.
   - **Manifest split / task-spec conversion** during improvised-schema architect-output recovery — ordinary file moves to `.pipeline/.heal-archive/` (substance verbatim) plus ordinary `Write` of converted YAML at canonical path. Each conversion is a separate user confirm. Un-convertible task specs (missing pseudocode + missing test contract) route to architect via `decomposing → architecture` (a legal transition) — never silently get a stub.
9. `step-advance --next-step handoff` — cursor advances. Master surfaces the recommended next slash command for the now-current phase.
10. `step-advance --next-step skill-complete` — sentinel deletes `.pipeline/cursor.yaml`.
11. (Out-of-band) HEAL-LOG.md frontmatter now reflects the full audit trail: `force_actions[]`, `cursor_rewinds[]`, plus the substance-mandated `inferred_phase`, `confidence`, `artifacts_recognized`, `artifacts_unrecognized`. The body of HEAL-LOG.md is append-only and carries one human-readable line per applied step.

**State-write surface re-routed through CLI ops:**

| Substance call | Replaced by |
|---|---|
| `lib/finalize.js` per walk-forward step | `essense-flow-tools state-set-phase` (legal) or `state-force-set-phase` (illegal-phase recovery only) |
| `lib/state.js assertLegalTransition` | Internal to `state-set-phase` (already enforced before writing). For force-set, the assertion is bypassed under recovery-only guard. |
| Direct cursor file manipulation | `essense-flow-tools cursor-rewind` (idempotent delete + audit-trail append) |
| HEAL-LOG.md write | Atomically owned by `state-force-set-phase` and `cursor-rewind` ops (audit-trail-before-state-mutation discipline). For ordinary discovery / inference / proposal narration, master appends body lines via ordinary `Write` to the canonical path from init JSON. |

`lib/finalize.js` and `lib/state.js` direct-call surfaces are **DEPRECATED for heal**. The CLI op path is the structural-containment surface that closes drift.

## Core principle

Pick up where you are, not where the pipeline wishes you were. Heal absorbs prior work — partial, mis-shaped, or from another methodology — and reconciles it into the pipeline's shape. The pipeline never says "this project is not compatible." It says "here is what I see, here is what I infer, here is where I propose we resume."

## What you produce

- `.pipeline/heal/HEAL-LOG.md` — append-only record of inferred phases, applied steps, and any reconciliations. Frontmatter carries `force_actions[]` (per `state-force-set-phase` invocation) and `cursor_rewinds[]` (per `cursor-rewind` invocation) automatically.
- `.pipeline/heal/proposal.yaml` — current walk-forward proposal awaiting user confirmation.
- (after confirm) `.pipeline/state.yaml` — written via legal transitions, one step at a time. For illegal-phase recovery, the first step uses `state-force-set-phase`; subsequent steps use `state-set-phase`.

HEAL-LOG.md frontmatter shape (refreshed each invocation):

```yaml
---
schema_version: 1
last_invocation: <iso>
inferred_phase: <phase>
confidence: high | medium | low
artifacts_recognized: [...]
artifacts_unrecognized: [...]
force_actions:
  - at: <iso>
    prior_phase: <observed-or-null>
    new_phase: <canonical-phase>
    reason: <one-line audit reason>
cursor_rewinds:
  - at: <iso>
    prior_cursor_skill: <observed-or-null>
    prior_cursor_step: <observed-or-null>
    no_op: <bool — true when cursor was already absent>
---
```

## How you work

### Job 1 — Discover

Walk the project root. For each candidate prior-artifact path (`SPEC.md`, `REQ.md`, `ARCH.md`, `.pipeline/**`, plus any user-configured paths in `defaults/config.yaml.discovery.prior_artifact_paths`):

1. **Existence check** — does the file exist?
2. **Shape check** — read the body. Does it carry the pipeline's frontmatter shape (e.g. SPEC.md with `schema_version: 1` and complexity assessment)? Or is it a prose document from another methodology?
3. **Content read** — for shape-matching files, read in full. For shape-mismatching files, read enough to characterize them as drafts to reconcile.

The output of discovery is a structured record per artifact: `{path, recognized: bool, shape: 'pipeline' | 'prose' | 'unknown', notes}`.

### Job 2 — Infer

From the discovery record, infer:

1. **The current phase.** Highest-numbered canonical artifact that's complete + valid → that phase has finished. Phase is the next one in the sequence.
2. **Confidence.**
   - `high` — every encountered artifact is shape-matching and complete.
   - `medium` — some artifacts are shape-matching but partial; or some are prose drafts.
   - `low` — only prose drafts exist, or shape is wholly unrecognized.
3. **Reconciliation actions.**
   - Prior prose SPEC → invoke `elicit` in resume mode to bring it to pipeline shape.
   - Prior REQ without acceptance criteria → invoke `research` in tighten-criteria mode.
   - Prior ARCH in another format → extract recognizable parts; route the rest to elicit as addenda.
   - **Code-without-spec** (common after rapid prototyping) → enter reverse-elicit mode: `elicit` reads existing code, drafts a SPEC retroactively, asks user to confirm intent.

### Job 3 — Propose

Write `.pipeline/heal/proposal.yaml`:

```yaml
schema_version: 1
inferred_phase: <phase>
confidence: high | medium | low
walk_forward:
  - step: 1
    transition: idle-to-eliciting
    rationale: "<why>"
  - step: 2
    transition: eliciting-to-eliciting
    rationale: "resume on existing draft SPEC.md"
reconciliation_actions:
  - action: invoke-elicit-resume
    on: ".pipeline/elicitation/SPEC.md (prose, needs frontmatter)"
unknowns:
  - "<anything heal could not place>"
```

Surface the proposal to the user via `AskUserQuestion` with arrow-key options:
- **Accept** — apply the walk-forward as proposed.
- **Edit** — user wants to adjust the proposal before applying.
- **Reject** — discard, run `/init` instead.

### Job 4 — Apply (only on user confirm)

For each step in the walk-forward, in order:

1. Pick the appropriate CLI op per the routing rules above (state-set-phase / state-force-set-phase / cursor-rewind / file-move + Write for archive operations).
2. The op enforces its own validation (legality + prerequisite + per-task-record gate for state-set-phase; canonical-phase-list + recovery-only guard for state-force-set-phase). On rejection, halt and surface — do not silently skip.
3. Append a body line to `.pipeline/heal/HEAL-LOG.md` summarizing what was inferred, what was applied, any reconciliation invoked. Frontmatter array updates happen automatically inside force-set and cursor-rewind ops.

### Job 5 — Hand off

After the walk-forward completes:

- State is at the inferred phase.
- HEAL-LOG.md captures the audit trail.
- Recommended next action surfaces (typically the slash command for the now-current phase).

## Discovery confidence behavior

- **High confidence**: walk-forward proposal is concrete, applies cleanly. User confirms once.
- **Medium confidence**: proposal includes reconciliation actions (invoke elicit-resume, etc.). User can accept or edit before apply.
- **Low confidence**: proposal surfaces "phase uncertain" and asks the user to pick the starting phase via `AskUserQuestion`. Heal does NOT silently choose.

## Code-without-spec mode (reverse-elicit)

When prior artifacts are **only code** (no SPEC, no REQ, no ARCH):

1. Heal proposes: "code present, no spec — invoke elicit in reverse mode."
2. On confirm, elicit reads representative parts of the code, drafts SPEC.md retroactively (problem statement, goals inferred from features, constraints from package.json/CI/etc.), and asks the user via `AskUserQuestion` whether each inferred decision matches intent.
3. The drafted SPEC then enters the normal flow — review can audit it against the code, triage can route discrepancies, architect can decompose forward work.

## Optional delegation — when prior-artifact set is large

For fresh-project heal (no prior `.pipeline/`, just user pitch + clean repo), discovery runs cleanly in main context. The artifact set is small; reading shapes is quick.

For mid-flight heal (existing `.pipeline/` from this or another tool, code-without-spec scenarios, hand-written prose specs at unfamiliar paths, partial sprint outputs), the discovery substance — reading bodies of every candidate artifact, characterizing each shape, mapping to pipeline phase — burns master context. The disciplinary rule (read shapes not listings; existence is never sufficient evidence; never silently mutate state; user confirms before apply) drifts. Symptom: heal infers a phase from filenames rather than file bodies; walk-forward proposal lists confidence `high` for a v0.7 state file that master hadn't actually opened.

When the prior-artifact volume threatens the rule, dispatch **per-shape sub-recognizers** in parallel — one sub-recognizer per artifact kind (SPEC-shape, REQ-shape, ARCH-shape, sprint-output shape, foreign-tool-prose shape). Each reads its slice of candidate paths, returns recognized/unrecognized + content notes + reconciliation hints. Master synthesizes the walk-forward proposal with the shapes-not-listings rule still loud because master never read every body itself.

Use `templates/sub-recognizer-brief.md`. Quorum: `tolerant` — a missing shape recognition becomes a synthetic "shape not surveyed" entry; the proposal still surfaces it to the user with low confidence rather than silently omitting.

Per **INST-13**: no count threshold triggers this. Judgment-driven. If the prior set is small enough to read end-to-end without losing the discipline, stay in main. If reading every body would crowd out the proposal logic, delegate.

Per **Diligent-Conduct**: master STILL writes the walk-forward proposal and the HEAL-LOG.md. Sub-recognizers identify shapes; master decides walk-forward sequencing and confidence. Same legal-transition discipline applies — the walk-forward applies one step at a time on user confirm, regardless of whether discovery was delegated.

## Constraints

- Per **Graceful-Degradation**: heal handles every degraded state explicitly. Missing state, corrupt state, foreign-shape artifacts — each gets tailored handling, never blanket "this is unsupported."
- Per **Front-Loaded-Design**: heal does not silently invent design decisions to fill gaps. It surfaces every uncertainty as a question for the user.
- Per **Diligent-Conduct**: heal NEVER skips a transition. Walk-forward is one legal step at a time. The audit trail in HEAL-LOG.md is append-only.
- Per **Fail-Soft**: heal observes degraded states and warns; it does not refuse to start because the project is in an unexpected shape.
- Per **INST-13**: no cap on walk-forward steps. The proposal walks every legal transition needed to reach the inferred phase, one step at a time. A long walk is a real signal about how far the project drifted, not a budget violation.

## Scripts

`lib/state.js` direct read and `lib/finalize.js` are **DEPRECATED for heal** (S9.7 redesign 2026-05-08). State writes go through `essense-flow-tools state-set-phase` / `state-force-set-phase`; cursor operations go through `step-advance` / `cursor-rewind`. The CLI op path is the structural-containment surface that closes drift symptoms #1, #2, #3, #4 at the heal recovery boundary too.

`AskUserQuestion` (built-in) — proposal confirmation, reverse-elicit confirmations.

## State transitions

Heal does not have its own dedicated transitions. It uses the existing transition table — applying legal transitions one step at a time. Effectively, heal can move state from any phase to any phase **only** by walking the legal graph. The exception is the first step of an illegal-phase recovery: `state-force-set-phase` bypasses the legal-transition assertion BUT preserves the canonical-phase-list validation on `--value`. After the first force-set step, subsequent steps must transition legally without force.

If the inferred destination is not reachable from the current state via legal transitions, heal halts and surfaces. It does not invent illegal moves.

## Improvised-schema architect output (recovery case)

A failure mode seen in the wild: a prior architect run wrote artifacts in an improvised schema instead of the canonical layout. Heal must recognize the shape and propose conversion. Detection signals:

- `.pipeline/state.yaml` has `phase:` set to a value not in `references/transitions.yaml` (e.g. `building`, `built`, `architected`)
- `.pipeline/architecture/SPRINT-MANIFEST.yaml` exists at the architecture root (single file, all sprints inline) instead of one `.pipeline/architecture/sprints/<n>/manifest.yaml` per sprint
- `.pipeline/architecture/tasks/*.md` exists (flat, markdown frontmatter) instead of `.pipeline/architecture/sprints/<n>/tasks/<id>.yaml`
- task spec frontmatter lacks `goal`, `file_write_contract`, `behavioral_pseudocode`, `test_completion_contract`, `agency_level` (canonical schema)

Heal proposes the conversion in chunks the user can confirm:

1. **Phase repair** — if `phase` is invalid, propose nearest legal phase based on on-disk artifacts. State.yaml fields like `architecture.completed_at`, `decomposition.round`, `master_decisions` count point at `architecture` or `decomposing` typically; manifest+tasks closure points at `sprinting`. Apply via `essense-flow-tools state-force-set-phase --value <canonical-phase> --reason "<one-line>"` on the first finalize step (only legal recovery for an illegally-named phase). Recovery-only guard inside the op enforces this — refuses force-set when current phase is already canonical.

2. **Manifest split** — read `SPRINT-MANIFEST.yaml`, split each sprint block into `sprints/<n>/manifest.yaml`. Copy the per-sprint dependency graph + wave structure into each new manifest. Original file moved to `.pipeline/.heal-archive/SPRINT-MANIFEST.yaml` for audit trail, not deleted. Master uses ordinary file-move (`Bash mv`) plus ordinary `Write` for the new per-sprint manifests. (No CLI op required for archive moves; preservation contract calls.)

3. **Task spec conversion** — for each `tasks/*.md` file, propose YAML conversion:
   - `goal` from the "Why" or top-level summary section of the markdown
   - `file_write_contract.allowed` from the `files:` frontmatter list
   - `requirements_traced` from any FR/NFR references in the body
   - `dependencies` from `deps:` frontmatter
   - `agency_level: guided` (default) unless the markdown explicitly carries detailed pseudocode (then `prescribed`) or explicitly says "agent decides" (route back to architect, not heal — open contracts violate Front-Loaded-Design)
   - `behavioral_pseudocode` and `test_completion_contract` cannot always be derived. Heal surfaces these gaps as needing architect re-entry, NOT silent stub-out. Each conversion is an interactive confirm with the user; missing fields are listed explicitly.

Conversion writes new YAML files via ordinary `Write` to canonical path; original `.md` files moved to `.pipeline/.heal-archive/tasks/` for audit. The post-conversion state is `phase: sprinting` with one manifest per sprint and tasks-as-yaml — exactly what build expects. Note: the canonical layout per S5 §1.4 architect uses nested per-sprint manifests at `.pipeline/architecture/sprints/<n>/manifest.yaml` and per-task specs at `.pipeline/architecture/sprints/<n>/tasks/<task-id>.yaml`; heal's conversion targets these paths.

Per **Diligent-Conduct**: every conversion step is a separate user-confirm. No batch "convert all 80 task specs" without per-step visibility. Per **Graceful-Degradation**: a task spec that cannot be converted (missing pseudocode + missing test contract + the user cannot fill them mid-heal) routes to architect via `decomposing → architecture`, never silently gets a stub.

## Before each apply step

Last block — read it just before you act.

Heal does not finalize once; it walks the legal transition graph one step at a time. **Each step is its own CLI op call.** Each step is its own user confirm. No batched walk.

For each step:

1. Verify the proposed `from → to` exists in `references/transitions.yaml`. If your proposal lists a transition that doesn't appear there, you invented it — halt, re-read.
2. The CLI op's `--value` arg uses the **literal** phase names from the transition graph, never English. If you find yourself writing `--value building` you have the wrong target — `state-set-phase` and `state-force-set-phase` both reject any value not in the canonical-12 list at exit 3.
3. After each apply, re-read `state.yaml` from disk via `essense-flow-tools init <phase-skill>` (which reports current state) or by ordinary `Read`. If the on-disk `phase` does not match what the op returned, surface as a drift signal — do not proceed to the next step.
4. For an illegal-phase recovery (current `phase` is not in the legal phases list), use `state-force-set-phase --value <canonical> --reason "<text>"` on **only the first** step. The op's recovery-only guard refuses if current phase is already canonical (exit 9). Subsequent steps use `state-set-phase` legally.
5. Append every step's narrative to `.pipeline/heal/HEAL-LOG.md` body. The frontmatter `force_actions[]` and `cursor_rewinds[]` arrays are updated automatically by the ops; the body line is your narrative. The log is the audit trail.

ms-precision ISO 8601 reminder: any timestamp arg the CLI ops accept (none for the new heal-specific ops, but related setters like `state-set-elicitation-completed` if you call them during reconciliation) requires millisecond precision (`2026-05-08T00:00:00.000Z` not `2026-05-08T00:00:00Z`). The setters' strict round-trip ISO check rejects non-ms forms at exit 3.
