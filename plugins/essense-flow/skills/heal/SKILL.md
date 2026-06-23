---
name: heal
description: Pipeline self-heal. Two jobs — (1) recover from any state (fresh, mid-flight, corrupt, code-without-spec) by reading artifacts and proposing walk-forward via legal transitions; (2) sweep stale claims from outstanding work register and disposition each per user confirm. Applies only on user confirm — never silent mutations.
version: 1.0.0
schema_version: 1
---

# Heal skill

## Read this before doing anything

See `references/principles.md` `## Read This Before Doing Anything` (canonical source — the 4-bullet block lives there; this skill cites it by reference).

## Conduct

Canonical conduct lives at `references/principles.md` `## Conduct` — read it there; it is not duplicated here. The three lines that govern every step of this skill: no shortcuts or deferrals of scope; sub-agents get agency, clear goals, and parallel dispatch; thorough on substance, lean on ceremony.

## Operating contract

- Heal can run from **any** state, including `idle`, missing state, or corrupt state.
- Heal NEVER silently mutates state. Every inferred change is presented as a **walk-forward proposal**; the user confirms via `AskUserQuestion` before any state write.
- When the user confirms, heal applies the inferred state through **legal transitions one step at a time** — no jumping, no skipping the state machine. Legal transitions go through `essense-flow-tools state-set-phase`. Illegal-phase recovery (current phase non-canonical) goes through `essense-flow-tools state-force-set-phase`, which writes HEAL-LOG.md atomically before mutating state.yaml. After the first force-set step, subsequent steps must transition legally without force.
- Read artifact bodies, not directory listings. Existence alone is never sufficient evidence.
- Append to `.pipeline/heal/HEAL-LOG.md` after every applied step — what was inferred, why, and what was applied. Force-set and cursor-rewind ops update HEAL-LOG.md frontmatter automatically (`force_actions[]`, `cursor_rewinds[]`); body-line entries are also appended.

## Skill operating mechanism

Heal's substance — Discover → Infer → Propose → Apply (one legal step at a time) → Hand off — is preserved verbatim per the preservation contract. The mechanism re-routes state writes and path lookups through the narrow CLI surface so master cannot improvise.

**Eleven-step CLI op sequence** master walks during a heal invocation:

1. `essense-flow-tools init heal --project-root <root>` — returns canonical_paths (`heal_log_md`, `proposal_yaml`, `heal_archive_dir`), 6 ordered_steps (`discover-artifacts → infer-phase-and-confidence → propose-walk-forward → await-user-confirm → apply-walk-forward-step-by-step → handoff`), `phase_from`/`phase_to`/`transitions` as descriptive strings (heal walks the full graph; consumers interpret), `sub_agents: [{name: 'essense-flow-sub-recognizer', cardinality: 'optional, judgment-driven', quorum: 'tolerant'}]`, `degraded: <bool>` (true when state.yaml absent or corrupt).
2. `essense-flow-tools step-advance --skill heal --next-step discover-artifacts --project-root <root>` — cursor open at step 0.
3. `essense-flow-tools state-reconcile [--apply] --project-root <root>` — deterministic first move for a missing/corrupt/stale state.yaml: compares the cache against artifact inference (the artifacts ARE the state; state.yaml is a derived cache) and with `--apply` rebuilds it from disk when inference is confident, HEAL-LOG audited. Reach for this BEFORE proposing a manual walk-forward — most degraded states are just a stale cache, and ops auto-reconcile a missing cache themselves when the artifacts are unambiguous. Ambiguous inference refuses to apply and lists every candidate with evidence; THAT is where heal's judgment-driven walk-forward earns its keep.
3. **Discover.** Walk project root + candidate paths from init JSON's hint (and from `defaults/config.yaml.discovery.prior_artifact_paths` if configured). Read bodies. If volume is large, dispatch `essense-flow-sub-recognizer` agents in parallel — one per shape (`SPEC-shape`, `REQ-shape`, `ARCH-shape`, `sprint-output-shape`, `foreign-tool-prose-shape`, or other). Tolerant quorum: a missing shape return becomes a synthetic "shape not surveyed" entry. Master STILL writes proposal.yaml and HEAL-LOG.md regardless of dispatch.
4. `step-advance --next-step infer-phase-and-confidence` — cursor advances.
5. **Infer.** Synthesize discovery records into `(inferred_phase, confidence, walk_forward[], reconciliation_actions[], unknowns[])`. Confidence is `high` (every artifact shape-matching + complete) | `medium` (some partial / prose drafts) | `low` (only prose / wholly unrecognized).
6. `step-advance --next-step propose-walk-forward` — cursor advances. Master writes `.pipeline/heal/proposal.yaml` (canonical path from init JSON `canonical_paths.proposal_yaml`) via ordinary `Write`. Shape per substance "Job 3 — Propose" template.
7. `step-advance --next-step await-user-confirm` — cursor advances. Master surfaces proposal via `AskUserQuestion` with arrow-key options Accept / Edit / Reject.
8. `step-advance --next-step apply-walk-forward-step-by-step` — cursor advances. **Per walk-forward step, in order**, master picks the appropriate CLI op:
   - **Legal transition between canonical phases** → `essense-flow-tools state-set-phase --value <to> [--sprint <n>]`. Existing legal-transition + prerequisite-predicate + per-task-record gate enforcement applies.
   - **Illegal-phase recovery** (current phase non-canonical, e.g., `phase: building` from a legacy state file) → `essense-flow-tools state-force-set-phase --value <canonical-phase> --reason "<one-line audit reason>"`. Use **only on the first step** of an illegal-phase walk per substance "use `force: true` on **only the first** finalize step" rule. The op refuses if current phase is already canonical AND state non-degraded (recovery-only guard, exit 9). The op atomically appends `force_actions[]` to HEAL-LOG.md frontmatter BEFORE writing state.yaml.
   - **Stuck cursor from a prior aborted skill run** → `essense-flow-tools cursor-rewind`. Idempotent (no-op when cursor absent). Atomically appends `cursor_rewinds[]` to HEAL-LOG.md frontmatter. Note: since v0.20.0 `step-advance` self-heals the *safe* foreign-cursor case automatically — when a new skill enters fresh (its first ordered step) and the current phase is legal for that skill, the stale cursor is auto-rewound inline (also logged to `cursor_rewinds[]`). This heal op remains the path for the ambiguous cases the inline self-rewind deliberately refuses: illegal current phase for the entering skill, or a foreign cursor encountered mid-sequence.
   - **Dual-schema state.yaml from a migrated project** (foreign top-level keys — `pipeline.*`, `phases_completed`, `verification.*`, `next_action`, `session.*`, … — that trigger a per-call `state-shape WARN: unknown top-level key(s)`) → `essense-flow-tools state-quarantine-legacy`. Moves every foreign top-level key into a `legacy:` sub-namespace so the live cache is purely canonical and the WARN stops. Idempotent (no-op when no foreign keys). Atomically appends `legacy_quarantines[]` to HEAL-LOG.md frontmatter — the one-time migration note that replaces the perpetual per-call WARN. Run this once during a migration walk-forward; the quarantined schema is preserved (not deleted) under `legacy:` for reference. (NOTE: this quarantines top-level keys; foreign fields nested *inside* a canonical block — e.g. a legacy `triage.round` — are not the WARN's subject and stay put.)
   - **Manifest split / task-spec conversion** during improvised-schema architect-output recovery — ordinary file moves to `.pipeline/.heal-archive/` (substance verbatim) plus ordinary `Write` of converted YAML at canonical path. Each conversion is a separate user confirm. Un-convertible task specs (missing pseudocode + missing test contract) route to architect via `decomposing → architecture` (a legal transition) — never silently get a stub.
9. `step-advance --next-step handoff` — cursor advances. Master surfaces the recommended next slash command for the now-current phase.
10. `step-advance --next-step skill-complete` — sentinel deletes `.pipeline/cursor.yaml`.
11. (Out-of-band) HEAL-LOG.md frontmatter now reflects the full audit trail: `force_actions[]`, `cursor_rewinds[]`, `legacy_quarantines[]`, plus the substance-mandated `inferred_phase`, `confidence`, `artifacts_recognized`, `artifacts_unrecognized`. The body of HEAL-LOG.md is append-only and carries one human-readable line per applied step.

**State-write surface re-routed through CLI ops:**

| Substance call | Replaced by |
|---|---|
| `lib/finalize.js` per walk-forward step | `essense-flow-tools state-set-phase` (legal) or `state-force-set-phase` (illegal-phase recovery only) |
| `lib/state.js assertLegalTransition` | Internal to `state-set-phase` (already enforced before writing). For force-set, the assertion is bypassed under recovery-only guard. |
| Direct cursor file manipulation | `essense-flow-tools cursor-rewind` (idempotent delete + audit-trail append) |
| Foreign top-level keys in a migrated state.yaml | `essense-flow-tools state-quarantine-legacy` (idempotent move into `legacy:` + audit-trail append) |
| HEAL-LOG.md write | Atomically owned by `state-force-set-phase`, `cursor-rewind`, and `state-quarantine-legacy` ops (audit-trail-before-state-mutation discipline). For ordinary discovery / inference / proposal narration, master appends body lines via ordinary `Write` to the canonical path from init JSON. |

`lib/finalize.js` and `lib/state.js` direct-call surfaces are **DEPRECATED for heal**. The CLI op path is the structural-containment surface that closes drift.

## Core principle

Pick up where you are, not where the pipeline wishes you were. Heal absorbs prior work — partial, mis-shaped, or from another methodology — and reconciles it into the pipeline's shape. The pipeline never says "this project is not compatible." It says "here is what I see, here is what I infer, here is where I propose we resume."

## What you produce

- `.pipeline/heal/HEAL-LOG.md` — append-only record of inferred phases, applied steps, and any reconciliations. Frontmatter carries `force_actions[]` (per `state-force-set-phase` invocation), `cursor_rewinds[]` (per `cursor-rewind` invocation), and `legacy_quarantines[]` (per `state-quarantine-legacy` invocation) automatically.
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

### Job 6 — Stale-claim sweep

*Stale-claim handling routes through heal as the single recovery surface — no in-band auto-release timers, no unclaim ops scattered across the toolset. Without enforced staleness handling, any "every queued item gets handled" guarantee is theatre.*

**Verbatim contract.** Heal-op MUST read `.pipeline/outstanding-work-register.yaml`; for each entry where `status == "in_progress"` AND `claimed_at` field present AND `(now - claimed_at) > threshold_hours`, the entry is **STALE**.

**Threshold reading rule (HARD CHECK).** `threshold_hours = SKILL.md frontmatter \`stale_claim_threshold_hours\` field for the skill that owns the entry (per entry's owning skill — derived from \`added_by\` / \`target_phase\` per the canonical phase→skill table); fallback to 24 (DEFAULT_STALE_THRESHOLD_HOURS) when frontmatter absent or unparseable`. The constant `DEFAULT_STALE_THRESHOLD_HOURS = 24` lives in `plugins/essense-flow/lib/staleness.cjs` — one shared library, so every consumer of staleness semantics reads the same threshold; duplicate implementations of one meaning drift apart.

**Owner-skill resolution.** The register entry schema does not carry a top-level `skill` field. Heal-op derives owner skill from:

1. `entry.added_by` substring match against the canonical 9-skill list (e.g. `"round-2 elicit"` → `elicit`).
2. Fallback: `entry.target_phase` mapped through the canonical phase→skill table (`eliciting → elicit`, `research → research`, `triaging → triage`, `architecture → architect`, `sprinting → build`, `reviewing → review`, `verifying → verify`).
3. Fallback: `null` — `readSkillThreshold(null)` safely returns DEFAULT_STALE_THRESHOLD_HOURS because the SKILL.md path resolution fails the existence check.

**Default behavior (flag absent).** Heal-op surfaces each stale item via `AskUserQuestion` with closed options `["unclaim", "keep claimed (mark not-stale)", "keep but flag as stale-acknowledged"]`. Per **Front-Loaded-Design**: heal does NOT silently choose disposition; user picks per item.

**`--auto-release` flag behavior.** When the flag is present, heal-op batch-releases ALL stale items without per-item user surface — flips `entry.status` from `in_progress` to `open`, clears `entry.claimed_at` to `null`, and writes one HEAL-LOG entry per release with disposition `unclaimed-by-auto-release` (audit-trailed reason: "auto-release sweep, threshold=<N>h").

**HEAL-LOG entry shape per sweep** (append-only, body line per release; frontmatter arrays untouched — `force_actions[]` and `cursor_rewinds[]` belong to other ops):

```text
[<iso_timestamp>] STALE_SWEEP item_id=<id> claimed_at=<iso> threshold_hours=<N> disposition=<disp>
```

Disposition is one of the closed enum:

- `unclaimed-by-user` — default-mode user picked "unclaim".
- `unclaimed-by-auto-release` — `--auto-release` flag-mode batch-released.
- `kept-by-user` — default-mode user picked "keep claimed (mark not-stale)".
- `kept-but-flagged-stale` — default-mode user picked "keep but flag as stale-acknowledged".

**Backward-compat HARD CHECK.** Entries lacking the `claimed_at` field are SKIPPED — not stale-eligible. Never throw, never warn-fail. Register schema evolution is additive-only: legacy entries persisted before the `claimed_at` field existed must read cleanly through every consumer (`register-list`, this stale-claim sweep) forever. Re-emphasized: `entry.claimed_at === undefined` is treated as `null`, the entry is silently passed over, and the sweep proceeds.

**Layered-defense pairing.** This Job 6 sweep is the **repair side** of the stale-claim defense; Job 7 below is the **disposition side**. Both consume `plugins/essense-flow/lib/staleness.cjs` for parity — a stale claim is the same stale claim from either lens.

**CLI op invocation.** The sweep is deterministic, judgment-free work — exactly what belongs in a CLI op rather than model judgment. Heal-op exposes it through its existing `heal` op surface with the required `--sweep-stale-claims` flag (explicit flag, no inference from ambient state). Optional `--auto-release` toggles batch mode. Invocation:

```bash
essense-flow-tools heal --sweep-stale-claims [--auto-release] [--project-root <p>]
```

### Job 7 — Apply disposition (per-item)

*Adjudication acts on one item at a time — one decision, one audit-log line, heterogeneous verdicts allowed; batch convenience is not worth condensed judgment. Pairs with Job 6 as the writer/mutator half of the stale-claim reader/writer pair.*

**Op surface.** Master invokes this op once per stale item after Job 6 surfaces an `AskUserQuestion` block. The user's chosen action routes here as a single CLI call:

```bash
essense-flow-tools heal --apply-disposition --item-id <id> --action <release|keep|escalate> [--project-root <p>]
```

Both `--item-id` and `--action` are required flags — no inference from cursor / state / prior context; missing required flags fail with a diagnostic naming them. `--apply-disposition` is mutually exclusive with `--sweep-stale-claims` — one sub-op per invocation. Combining the two flags fails with exit 4 + a diagnostic.

**Allowed actions (closed enum).** The action whitelist is exhaustive over the stale-claim coverage gate — every stale item observed by Job 6 gets exactly one writer-side disposition through one of these three actions OR through the `--sweep-stale-claims --auto-release` shortcut (which is equivalent to bulk `release`).

| Action      | Register mutation                                                          | Audit-trail intent                                |
|-------------|-----------------------------------------------------------------------------|---------------------------------------------------|
| `release`   | `entry.status = 'open'`; `entry.claimed_at = null`.                          | reclaim work back to the open queue.              |
| `keep`      | no mutation to status / claimed_at (explicit no-op).                         | user-affirmed keep — preserves existing claim.    |
| `escalate`  | `entry.status = 'escalated'`; `entry.escalated_at = now`; `claimed_at` preserved (evidence). | hand off to architect / triage; provenance preserved. |

The `keep` action is intentionally a no-op on register state — the HEAL-LOG line is the entire artifact of the disposition. Job 6 cannot tell whether the user looked at a stale item and confirmed "this is still the right person on it" vs. silently ignored the surface; the explicit `keep` action through Job 7 closes that gap. On `escalate`, `claimed_at` is preserved as audit-trail evidence — the architect picking up the escalation needs to know who held the stale claim.

**Audit-trail line shape (mirrors Job 6 STALE_SWEEP for grep parity over HEAL-LOG.md).** Each invocation appends exactly one body line to `.pipeline/heal/HEAL-LOG.md`:

```text
[<iso_timestamp>] APPLY_DISPOSITION item_id=<id> prior_status=<observed> prior_claimed_at=<iso-or-null> action=<release|keep|escalate> new_status=<post>
```

The token order is grep-stable — a single grep over HEAL-LOG.md for `APPLY_DISPOSITION item_id=<id>` returns one line per disposition applied to that item across all invocations. Combined with Job 6's `STALE_SWEEP item_id=<id>` lines, master can reconstruct the full lifecycle of any stale claim by grepping a single file.

**Register write atomicity.** Routes through the canonical `writeStateAndFingerprint` wrapper — tmp+rename + SHA-256 fingerprint sidecar refresh. A crash mid-write leaves either the prior register intact (no-op) or the post-write register + matching fingerprint (success). Torn writes are structurally precluded.

**Item-not-found surface.** If `--item-id` does not match any `entries[].item_id` in the register, the op exits non-zero with a diagnostic naming the missing id. No fuzzy match, no prefix match, no inference — the explicit-args discipline holds end-to-end.

**Layered-defense pairing.** Job 6 (read side) + Job 7 (write side) close the stale-claim coverage gate together. The shared `lib/staleness.cjs` constants ensure both lenses see the same staleness — a stale claim is the same stale claim from sweep and disposition.

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

For mid-flight heal (existing `.pipeline/` from this or another tool, code-without-spec scenarios, hand-written prose specs at unfamiliar paths, partial sprint outputs), the discovery substance — reading bodies of every candidate artifact, characterizing each shape, mapping to pipeline phase — burns master context. The disciplinary rule (read shapes not listings; existence is never sufficient evidence; never silently mutate state; user confirms before apply) drifts. Symptom: heal infers a phase from filenames rather than file bodies; walk-forward proposal lists confidence `high` for a legacy-format state file that master hadn't actually opened.

When the prior-artifact volume threatens the rule, dispatch **per-shape sub-recognizers** in parallel — one sub-recognizer per artifact kind (SPEC-shape, REQ-shape, ARCH-shape, sprint-output shape, foreign-tool-prose shape). Each reads its slice of candidate paths, returns recognized/unrecognized + content notes + reconciliation hints. Master synthesizes the walk-forward proposal with the shapes-not-listings rule still loud because master never read every body itself.

Use `templates/sub-recognizer-brief.md`. Quorum: `tolerant` — a missing shape recognition becomes a synthetic "shape not surveyed" entry; the proposal still surfaces it to the user with low confidence rather than silently omitting.

No count threshold triggers this — no resource caps; substance gates, never counters. Judgment-driven. If the prior set is small enough to read end-to-end without losing the discipline, stay in main. If reading every body would crowd out the proposal logic, delegate.

Per **Diligent-Conduct**: master STILL writes the walk-forward proposal and the HEAL-LOG.md. Sub-recognizers identify shapes; master decides walk-forward sequencing and confidence. Same legal-transition discipline applies — the walk-forward applies one step at a time on user confirm, regardless of whether discovery was delegated.

## Constraints

- Per **Graceful-Degradation**: heal handles every degraded state explicitly. Missing state, corrupt state, foreign-shape artifacts — each gets tailored handling, never blanket "this is unsupported."
- Per **Front-Loaded-Design**: heal does not silently invent design decisions to fill gaps. It surfaces every uncertainty as a question for the user.
- Per **Diligent-Conduct**: heal NEVER skips a transition. Walk-forward is one legal step at a time. The audit trail in HEAL-LOG.md is append-only.
- Per **Fail-Soft**: heal observes degraded states and warns; it does not refuse to start because the project is in an unexpected shape.
- Per **No-Resource-Caps** (`references/principles.md` "No Resource Caps"): no cap on walk-forward steps. The proposal walks every legal transition needed to reach the inferred phase, one step at a time. A long walk is a real signal about how far the project drifted, not a budget violation.

## Scripts

`lib/state.js` direct read and `lib/finalize.js` are **DEPRECATED for heal**. State writes go through `essense-flow-tools state-set-phase` / `state-force-set-phase`; cursor operations go through `step-advance` / `cursor-rewind`. The CLI op path is the structural-containment surface that closes the invented-field / invented-phase / wrong-path / wrong-extension drift symptoms at the heal recovery boundary too.

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
   - `file_write_contract.paths` from the `files:` frontmatter list
   - `requirements_traced` from any FR/NFR references in the body
   - `dependencies` from `deps:` frontmatter
   - `agency_level: guided` (default) unless the markdown explicitly carries detailed pseudocode (then `prescribed`) or explicitly says "agent decides" (route back to architect, not heal — open contracts violate Front-Loaded-Design)
   - `behavioral_pseudocode` and `test_completion_contract` cannot always be derived. Heal surfaces these gaps as needing architect re-entry, NOT silent stub-out. Each conversion is an interactive confirm with the user; missing fields are listed explicitly.

Conversion writes new YAML files via ordinary `Write` to canonical path; original `.md` files moved to `.pipeline/.heal-archive/tasks/` for audit. The post-conversion state is `phase: sprinting` with one manifest per sprint and tasks-as-yaml — exactly what build expects. Note: the canonical architect layout uses nested per-sprint manifests at `.pipeline/architecture/sprints/<n>/manifest.yaml` and per-task specs at `.pipeline/architecture/sprints/<n>/tasks/<task-id>.yaml`; heal's conversion targets these paths.

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
