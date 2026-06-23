---
name: review
description: Code review on current sprint. Hunts bugs (does the code work?) and drift (does the code match the spec?). Every finding has file:line + verbatim quote, re-validated against disk. Confirmed critical findings block sprint advance. Run after /build, before /verify.
version: 1.0.0
schema_version: 1
---

# Review skill

## Read this before doing anything

See `references/principles.md` `## Read This Before Doing Anything` (canonical source — the 4-bullet block lives there; this skill cites it by reference).

## Conduct

Canonical conduct lives at `references/principles.md` `## Conduct` — read it there; it is not duplicated here. The three lines that govern every step of this skill: no shortcuts or deferrals of scope; sub-agents get agency, clear goals, and parallel dispatch; thorough on substance, lean on ceremony.

## Operating contract

- Read SPEC.md (required), ARCH.md + decisions.yaml (required), task specs + sprint manifest (required), SPRINT-REPORT.md + per-task completion records (required), modified code (read in full where claims point), prior false-positive ledger, prior acknowledged-findings ledger.
- Verify `state.phase == reviewing`.
- Existence of a file is **never** sufficient evidence — read code at the cited line.
- Every finding carries verbatim path evidence with quote ≥ `evidence.min_quote_length` (config). Shorter quotes auto-flag the finding as inconclusive.
- The validator pass re-reads cited files; quotes that drifted out of position auto-flag as `false_positive` with reason `quote_drift`.
- Dispatch parallel adversarial lenses via the `Agent` tool with `subagent_type=essense-flow-adversarial-lens` (registered at `plugins/essense-flow/agents/essense-flow-adversarial-lens.md`). Quorum mode: `tolerant` (n−1 lenses may crash; missing lens becomes a synthetic risk finding). Dispatch per-finding validators via `subagent_type=essense-flow-validator` (registered at `plugins/essense-flow/agents/essense-flow-validator.md`). Quorum mode: `all-required`.
- The block-or-pass decision is **deterministic**: count of confirmed-and-unacknowledged criticals. No keyword scoring, no severity-weighting, no fuzzy aggregate.
- Use `essense-flow-tools state-set-phase --value verifying` (or `--value triaging`) to transition out of `reviewing` once the QA-REPORT.md is written. The op's prerequisite-artifact predicate evaluator reads QA-REPORT.md frontmatter's `confirmed_unacknowledged_criticals` field and rejects the wrong destination structurally — see "Skill operating mechanism" below. (`lib/finalize.js` direct calls deprecated for review.)

## Skill operating mechanism (structural-containment redesign)

Path lookups + step bookkeeping + adversarial-lens / validator dispatch + state advancement go through the narrow CLI surface introduced for the redesign. **You do not infer paths from prose. You do not write `phase:` directly. You do not pick QA-REPORT.md extensions or sprint directory names from convention. You do not call `lib/dispatch.js` or `lib/finalize.js` for review's state writes — `state-set-phase` is the sole writer; the deterministic gate is enforced structurally at the CLI op level by the prerequisite-predicate evaluator that reads QA-REPORT.md frontmatter.** The mechanisms below give you exact strings to write or pass; you use them verbatim.

### Get canonical paths from `init review`

At skill-start, call:

```bash
node plugins/essense-flow/bin/essense-flow-tools.cjs init review --project-root <project-root>
```

Returns JSON with `canonical_paths` (`qa_report_md`, `spec_compliance_yaml`, `false_positive_ledger_yaml`, `acknowledged_ledger_yaml`), `ordered_steps` (the 6-step sequence below), `sub_agents` (the registered `essense-flow-adversarial-lens` and `essense-flow-validator` blocks — cardinalities and quorums named), `transitions` (legal phase transitions for review — read-only reference; advancement happens via `state-set-phase`), `sprint_number` (read from state.yaml), `required_inputs`, `principles_cited`. Parse the JSON. **Use the strings verbatim — never construct path or step names from prose.**

Where the templates contain `<n>` (sprint number), substitute with the literal sprint number from `init.sprint_number` at write time:

- `qa_report_md` (`.pipeline/review/sprints/<n>/QA-REPORT.md`) → ordinary `Write` after substituting `<n>`. Master writes this directly with `Write`; the prerequisite-predicate evaluator at `state-set-phase` reads its frontmatter to enforce the deterministic gate.
- `spec_compliance_yaml` (`.pipeline/review/sprints/<n>/spec-compliance.yaml`) → ordinary `Write` after substituting `<n>`.
- `false_positive_ledger_yaml` (`.pipeline/review/false-positive-ledger.yaml`) → ordinary `Write`. Sprint-spanning (no `<n>`); read prior contents, append this run's false positives, write back.
- `acknowledged_ledger_yaml` (`.pipeline/review/acknowledged-ledger.yaml`) → ordinary `Write`. Sprint-spanning (no `<n>`); read prior contents, accept user's explicit acks, write back. **Two entry shapes are honored — see "Acknowledged-ledger schema" below for the class-pattern extension that closes the per-sprint loop where finding_ids regenerate.**

### Advance the per-skill cursor at each step

Before doing the substantive work of each step in `ordered_steps`, call:

```bash
node plugins/essense-flow/bin/essense-flow-tools.cjs step-advance --skill review --next-step <step-name> --project-root <project-root>
```

The op rejects out-of-order or non-monotonic advances. Sequence MUST be `read-inputs-and-ledgers → extract-spec-claims → audit-adversarial-lenses → validate-findings-against-disk → compute-deterministic-gate → finalize` per init's `ordered_steps`; out-of-order returns exit 13 with a "not the immediate successor" error. After `finalize`'s substantive work, call `step-advance --next-step skill-complete` to delete the cursor (signals review run finalized cleanly; the next skill — verify or triage, depending on the gate's verdict — can run).

### Dispatch adversarial lenses via the registered agent

Use the `Agent` / `Task` tool with `subagent_type=essense-flow-adversarial-lens`. The agent is registered at `plugins/essense-flow/agents/essense-flow-adversarial-lens.md` with description, tool allowlist (`Read, Grep, Glob` — no Bash, no Write, no Edit; the lens hunts for problems, it does not run tests or modify code), and the per-lens brief input shape as its body. Use `templates/adversarial-brief.md` to assemble the brief; substitute `{{lens}}`, `{{sprint_number}}`, `{{spec_path}}`, `{{arch_path}}`, `{{decisions_path}}`, `{{manifest_path}}`, `{{sprint_report_path}}`, `{{lens_specific_instructions}}`, `{{min_quote_length}}`, `{{sentinel}}` per-lens before dispatch.

Dispatch every lens for the current sprint in a SINGLE message — parallel, no concurrency cap (resource caps as gates are forbidden; the work defines the count). Lenses are picked **adaptively** based on what the sprint touched:

- `correctness` — does the code do what the task spec said?
- `contract-compliance` — were `file_write_contract` bounds respected?
- `hidden-state` — globals, mutable closures, shared mutable references that surprise.
- `failure-modes` — what happens at the edges? unhandled errors? race conditions?
- `spec-drift` — does the implementation match the spec claim at the cited locator?
- `functional-testing` — read the tests for what they actually verify.
- `rule-completeness` — iterates every rule with `applies_to` in `.pipeline/architecture/decisions.yaml`; runs `review-rule-sweep` per rule; emits one finding per non-exempt sibling. Dispatched via `subagent_type=essense-flow-rule-completeness-lens` (registered at `plugins/essense-flow/agents/essense-flow-rule-completeness-lens.md`).
- `pattern-debt` — re-runs prior-sprint QA-REPORT rule sweeps; emits one finding per NEW hit not in prior round's resolved set. Dispatched via `subagent_type=essense-flow-pattern-debt-lens` (registered at `plugins/essense-flow/agents/essense-flow-pattern-debt-lens.md`).
- `dry-violation` (adaptive — dispatch when `.pipeline/glossary/GLOSSARY.yaml` exists from a /glossary run) — duplication evidence is pre-computed, not re-hunted: GLOSSARY.md's top extractables name the clone families; `.pipeline/glossary/DIFF.md`'s `grown` section (when present) names the duplication sites THIS sprint added. The lens substrate-verifies the cited sites and emits findings only for confirmed, sprint-relevant duplication; severity `minor` unless a `grown` site duplicates a helper the spec/arch explicitly centralizes (then `major`).
- (Adaptive — master may add a lens for what the sprint touched; no cap.)

Each lens returns a list of findings. **Findings without `verbatim_quote` and `file_path:line_number` are rejected at master's evidence-policy step.** Quotes shorter than `{{min_quote_length}}` auto-flag inconclusive.

### Rule-completeness + pattern-debt lens dispatch

Dispatch these two lenses in the SAME parallel-dispatch message as the 6 adversarial lenses. They share the parallel cardinality semantics (`cardinality: per-lens parallel`). Briefs:

**Rule-completeness (`essense-flow-rule-completeness-lens`):**
- `project_root` — absolute path to project under review.
- `sprint_number` — current sprint.
- `decisions_path` — `.pipeline/architecture/decisions.yaml`.
- `budget_timeout_ms` — default 30000 per rule.
- `max_rules` — default 50.

The lens calls `essense-flow-tools spec-rule-validate --decisions-file <decisions_path>` first; on non-zero exit it halts and surfaces (rule encoding upstream is structurally broken). Then per rule it calls `essense-flow-tools review-rule-sweep --rule-id <id> --project-root <project_root> --decisions-file <decisions_path> --output-format json --budget-timeout-ms <budget_timeout_ms>`. Findings emit with `rule_id`, `file_path:line`, `verbatim_quote`, `severity`, `sweep_pattern` (the rule's `applies_to` block, carried so the pattern-debt replay can re-run this round next time).

**Pattern-debt (`essense-flow-pattern-debt-lens`):**
- `project_root`, `sprint_number`, `decisions_path` as above.
- `max_rounds` — default 20.
- `budget_timeout_ms` — default 30000 total.

The lens calls `essense-flow-tools review-pattern-debt-sweep --project-root <project_root> --decisions-file <decisions_path> --max-rounds <max_rounds> --budget-timeout-ms <budget_timeout_ms> --output-format json`. Recurrence findings emit one per new_hit. Advisories (`status: rule-not-in-current-decisions`) emit at minor severity.

### Bootstrap-baseline for adopting on mature projects

When the rule-completeness sweep first runs on a project that did not previously have it (no prior `baseline-ledger.yaml` at `.pipeline/review/baseline-ledger.yaml`), all current rule-completeness findings get tagged `status: pre-existing-acknowledged` automatically. Master writes the ledger after dispatching `state-set-phase reviewing → triaging --acknowledge-baseline` (the flag turns the first round's rule-completeness findings into baseline entries instead of blocking criticals). Subsequent rounds only surface NEW violations (file modified since baseline OR not in baseline-ledger). This prevents the bootstrap-flood failure mode where a first run on a 50-rule mature project produces 200 findings and grinds triage.

### Budget caps

Per round:
- Rule-completeness: max 50 rules processed per round; sweep timeout 30s per rule. Overflow → emit `sweep_partial: true` finding per unprocessed rule; surface to master; never silent skip.
- Pattern-debt: max 20 prior rounds replayed; sweep timeout 30s total. Overflow → emit `sweep_partial: true`; surface; never silent skip.

Both caps overridable via `init review` JSON (extension lands in init's fields for these lenses when the init op next updates).

### Dispatch per-finding validators via the registered agent

Use the `Agent` / `Task` tool with `subagent_type=essense-flow-validator`. The agent is registered at `plugins/essense-flow/agents/essense-flow-validator.md` with description, tool allowlist (`Read, Grep, Glob` — same posture as the lens; no Bash, no Write, no Edit), and the per-finding brief input shape as its body. Use `templates/validator-brief.md` to assemble the brief; substitute `{{finding_id}}`, `{{finding_yaml}}`, `{{file_path}}`, `{{line_number}}`, `{{sentinel}}` per-finding before dispatch.

Dispatch every validator (one per finding) in a SINGLE message — parallel, no concurrency cap. Each validator returns one of:

```yaml
finding_id: <slug>
verdict: confirmed | needs_context | false_positive | intentional_exception
rationale: "<one to three sentences>"
quote_drift_detected: true | false
```

**Master computes the deterministic gate from the verdicts** — `confirmed_unacknowledged_criticals = count(verdict == confirmed AND severity == critical AND finding_id NOT IN acknowledged-ledger)`. `intentional_exception` verdicts count as acknowledged-via-annotation and never contribute to the critical count; their findings get persisted in QA-REPORT.md with `status: intentional_exception` and the annotation's `reason` quoted verbatim. The count is the gate; honour it.

### Advance phase via `state-set-phase`

After QA-REPORT.md is written with the frontmatter `confirmed_unacknowledged_criticals: <count>`, call:

```bash
# Pass review (no confirmed unacknowledged criticals) — go to verifying:
node plugins/essense-flow/bin/essense-flow-tools.cjs state-set-phase --value verifying --project-root <project-root>

# Block review (one or more confirmed unacknowledged criticals) — go to triaging:
node plugins/essense-flow/bin/essense-flow-tools.cjs state-set-phase --value triaging --project-root <project-root>
```

The op validates legality (`reviewing → verifying` and `reviewing → triaging` are both legal per `references/transitions.yaml:213-225`). Then it evaluates the prerequisite-artifact predicate against the QA-REPORT.md frontmatter:

- For `--value verifying`: predicate `confirmed_unacknowledged_criticals == 0` against the QA-REPORT.md the master just wrote. **If the count in frontmatter is non-zero, the op rejects with exit 7** — closing the drift symptom where master picks `verifying` when `triaging` is the canonical destination.
- For `--value triaging`: predicate `confirmed_unacknowledged_criticals > 0`. If the count is zero, the op rejects with exit 7 — closing the symmetric drift.

This is the **deterministic gate** the redesign exists to keep loud — enforced structurally at the CLI op rather than relying on master's gut-check.

The op writes only the `phase:` field; `--sprint` is NOT accepted for these targets (review's transitions are not sprint-targeted; sprint stays at the value carried from build).

## Skip-IFF rule for lens dispatch


## Review-lens-dispatch Skip-IFF rule

Phase-exit gates are objective and machine-checked: skipping sub-agent dispatch is allowed only under the explicit conditions below, counted from the output artifact — there is no bypass flag, and "the environment can't do it" is not an admissible skip cause. The default discipline: review-skill lens dispatch count >= 6 (canonical lens count per the existing review skill body — `correctness`, `contract-compliance`, `hidden-state`, `failure-modes`, `spec-drift`, `functional-testing`, with adaptive additions; no cap). Master review MAY skip the 6-lens dispatch ONLY IFF EITHER:

1. **task_count <= 2** — the sprint under review has <= 2 tasks in the manifest. Rationale: a 1-2 task sprint cannot exercise 6 distinct review lenses with non-trivial verdict; condensed review is a substance-justified shortcut.

OR

2. **rule-allowed-substance-quote cited** — the `QA-REPORT.md` frontmatter or master synthesize note carries a verbatim rule quote from this SKILL.md's Skip-IFF section or from a closed design decision authorizing the condensed-lens path for this sprint. Citation MUST include the rule-quote text + source decision ID.

IF NEITHER condition holds → 6-LENS DISPATCH IS MANDATORY; the `transitions.yaml` `requires` predicate at the `reviewing → verifying` boundary refuses exit if `lenses_dispatched.length < 6` and no rule-allowed-skip flag is set.

**Predicate enforcement.** `evalDispatchPredicate` recognizes the phrase `with sufficient lens dispatch` (declared in the `DISPATCH_PHRASES` table at `bin/essense-flow-tools.cjs:1962`, phrase entry at `bin/essense-flow-tools.cjs:1964`, `sourceKey: 'lens'`). The evaluator checks count vs threshold via `cursorState.alignment_lens_dispatches_per_round`, and honors the rule-allowed-skip path when a verbatim rule-quote citation is present in the QA-REPORT frontmatter.

**Drift detection.** The `drift-7` substantive check scans `QA-REPORT.md` frontmatter post-hoc to confirm that any sprint exiting `reviewing → verifying` with `lenses_dispatched.length < 6` carries a valid skip justification (`task_count <= 2` OR rule-quote citation). Mis-justified skips surface as drift findings, not silent advances.

**Verifiable check.** Spawn review skill on a fixture sprint with `task_count=10` + `lenses_dispatched=[]` + no rule-quote citation. The `state-set-phase reviewing → verifying` op refuses with `EXIT_ALIGNMENT_DRIFT` (exit code 19), diagnostic naming the failed dispatch-sufficiency rule by its `sourceKey`.

## Core principle

Adversarial. Findings without verbatim path evidence are not findings. Vibes don't ship. Equally critical: do not fabricate findings to look thorough — fabricated bugs spawn endless fix-the-non-existent-bug loops and destroy the pipeline.

## What you produce

- `.pipeline/review/sprints/<n>/QA-REPORT.md` — the findings table.
- `.pipeline/review/sprints/<n>/spec-compliance.yaml` — every spec decision with verdict.
- `.pipeline/review/false-positive-ledger.yaml` — appended on every run.
- `.pipeline/review/acknowledged-ledger.yaml` — items the user has explicitly accepted.

QA-REPORT.md frontmatter (the deterministic-gate input read by `state-set-phase`'s predicate evaluator):

```yaml
---
schema_version: 1
sprint: <n>
findings_total: <count>
confirmed_critical: <count>
confirmed_unacknowledged_criticals: <count>   # the deterministic gate — read by state-set-phase
class_acknowledged: <count>                   # count of confirmed criticals matched by class-pattern in acknowledged-ledger.yaml; CLI subtracts before gate eval
acknowledged: <count>
needs_context: <count>
false_positives: <count>
lenses_run: [...]
lenses_missing: [...]                         # never hidden
---
```

The `confirmed_unacknowledged_criticals` field is the gate input — `state-set-phase --value verifying` requires `effective_confirmed_unacknowledged_criticals == 0`; `state-set-phase --value triaging` requires `effective > 0`. The CLI predicate evaluator computes `effective = max(0, confirmed_unacknowledged_criticals - class_acknowledged)` per `subtractKey: 'class_acknowledged'` (`bin/essense-flow-tools.cjs:2253`; subtraction applied in `evalCountPredicate` at `:2517`). Frontmatter without `class_acknowledged:` defaults to 0 (back-compat preserved).

### Acknowledged-ledger schema (closes the per-sprint loop)

`.pipeline/review/acknowledged-ledger.yaml` is sprint-spanning. Two entry shapes are honored:

```yaml
- entry_id: ACK-001
  finding_id: SPRINT-7-FFR-hash-stale-diag-1   # per-finding ack (legacy)
  ack_reason: |
    User accepted finding SPRINT-7-FFR-hash-stale-diag-1; tracked in TODO.md.
  acknowledged_at: <iso8601>

- entry_id: ACK-002
  match_pattern: 'behavioral-test-uncoverable-without-seam'                # CLASS pattern
  pattern_type: literal | regex                                            # literal (substring) or regex against finding.claim / finding.lens / finding.proposed_check
  match_against: ['claim', 'lens', 'proposed_check']                       # which finding fields to match (any-match = matched)
  ack_reason: |
    Behavioral testing of these catch-arms requires injectable test seams
    at build-level (scoped to a dedicated seam-infrastructure sprint).
    Class-acked until seam ships; future sprints auto-skip these findings.
  decision_ref: decisions.md#test-seam-deferral
  acknowledged_at: <iso8601>
  expires_at: <iso8601-or-null>                                            # optional auto-expiry; null = no expiry
```

**Why the class-pattern shape exists.** Before the class-pattern extension, `acknowledged-ledger.yaml` was finding_id-keyed only. Each sprint generated fresh finding_ids (sprint-N prefixed), so per-id acks never carried forward. Same-class findings (e.g. "behavioral test uncoverable without test seam") re-surfaced every sprint as fresh confirmed criticals — the loop self-perpetuated. The `match_pattern` shape lets master tag a CLASS of findings as known-debt once; every subsequent sprint's confirmed criticals matching the pattern get counted toward `class_acknowledged` and subtracted from the gate.

**Master's count-computation (Job 4 — Decide).** After validators return verdicts, master:

1. Counts `confirmed_critical = count(verdict == confirmed AND severity == critical)`.
2. For each confirmed critical finding, checks acknowledged-ledger:
   - If `finding_id` matches any ledger entry's `finding_id:` field → counted as `acknowledged` (per-id ack, legacy path).
   - ELSE if any ledger entry has `match_pattern:`, evaluate the pattern against the finding's declared `match_against:` fields (default `['claim', 'lens', 'proposed_check']`); if any match → counted as `class_acknowledged` (class-pattern path).
   - ELSE the finding remains in `confirmed_unacknowledged_criticals`.
3. Writes BOTH `confirmed_unacknowledged_criticals: <count>` AND `class_acknowledged: <count>` to QA-REPORT.md frontmatter. The CLI predicate evaluator subtracts; master does NOT subtract before writing.
4. `acknowledged: <count>` retains its legacy meaning (per-finding-id acks); does not duplicate `class_acknowledged`.

**When to add a class-pattern entry.** During triage (after a sprint blocks), if a class of findings recurs each sprint because the substrate fix is scoped to a separate architect-sprint (e.g. test-seam infrastructure does not exist yet), author a class-pattern ledger entry referencing the closed decision that authorizes the deferral. Without `decision_ref:`, the class-pattern entry is REJECTED at next-sprint review's setup step — preventing silent class-acks that have no governance trace.

**Pattern evaluation safety.** `pattern_type: literal` does a case-insensitive substring match; `pattern_type: regex` compiles the pattern with a 5-second timeout per finding (master enforces; CLI does not — CLI only reads the precomputed count from frontmatter). Malformed regex or timeout → ledger entry is logged as `inert: true` for the current run and surfaced to user; does NOT auto-match.

**Milestone-level gate vs sprint-level gate.** Without class acks, `confirmed_unacknowledged_criticals == 0` is a per-sprint shipping binary; substrate-test-uncoverable findings made that gate unreachable in finite sprints. With class-pattern acks, the gate effectively shifts to milestone-level: a sprint ships when (a) sprint-introduced criticals close OR (b) recurring class-criticals carry a decision-referenced class-ack. Acknowledged class-debt rolls forward in the ledger; the ledger IS the milestone-debt registry. When the substrate fix lands (e.g. test-seam infrastructure ships), the corresponding class-pattern entry is removed from the ledger and the next review surfaces those findings naturally.

## How you work

### Setup (`read-inputs-and-ledgers`)

1. Read all required inputs (per `init review` `required_inputs`). If anything missing, refuse to start with the specific path missing.
2. Read prior false-positive ledger — those rejections are remembered.
3. Read prior acknowledged ledger — those items already accepted.

### Job 1 — Extract spec claims (`extract-spec-claims`)

Walk SPEC.md + ARCH.md + decisions.yaml top-down. Emit one claim per design decision:
- "The system should do X."
- "Module Y owns responsibility Z."
- "State transition A → B should be atomic."

Each claim carries a locator hint pointing at where in the codebase the check applies.

### Job 2 — Audit (`audit-adversarial-lenses`)

Spawn parallel agents via `subagent_type=essense-flow-adversarial-lens`, each through a distinct lens. Lenses are picked **adaptively** based on what the sprint touched:

- **correctness** — does the code do what the task spec said?
- **contract-compliance** — were file_write_contract bounds respected?
- **hidden-state** — globals, mutable closures, shared mutable references that surprise
- **failure-modes** — what happens at the edges? unhandled errors? race conditions?
- **spec-drift** — does the implementation match the spec claim at the cited locator?
- **functional-testing** — read the tests for what they actually verify

Each agent produces findings with this shape:

```yaml
finding_id: <slug>
lens: <lens>
severity: critical | major | minor
file_path: <relative>
line_number: <int>
verbatim_quote: |
  <multi-line quote pulled from cited code>
context_window:
  before_lines: 3
  after_lines: 3
claim: "<what the agent thinks is wrong>"
proposed_check: "<the test/grep/inspection that would prove it>"
```

**Findings without `verbatim_quote` and `file_path:line_number` are not findings.** Reject them at extraction time.

### Job 3 — Validate (`validate-findings-against-disk`)

Every finding is independently re-checked against disk before being trusted. Spawn one `subagent_type=essense-flow-validator` per finding (parallel, single message):

1. **Quote drift check.** Read the cited file, look for the verbatim quote within the cited window. If the quote does not appear, auto-flag the finding as `false_positive` with reason `quote_drift`.
2. **Claim evaluation.** Does the code at that location actually exhibit the described problem? Three verdicts:
   - **confirmed** — finding holds. Evidence on disk, claim is true.
   - **needs_context** — may hold, but a judgment call is required (e.g. spec ambiguity). Requires explicit user acknowledgment.
   - **false_positive** — does not hold. Append to ledger with rationale.

For drift-lens findings: each spec claim verdicts as one of `implemented`, `partial`, `missing`, `drift`. `missing` and `drift` feed the same routing pipeline as confirmed bugs.

### Job 4 — Decide (`compute-deterministic-gate`)

Compute `effective_confirmed_unacknowledged_criticals = max(0, confirmed_unacknowledged_criticals - class_acknowledged)`. That number — and only that number — decides advance.

- **Zero** → sprint passes review. Route to `verifying`.
- **Non-zero** → sprint blocks. Route to `triaging` (which routes to upstream phases based on per-finding categorization).

Per-finding-id acks AND class-pattern acks both reduce the effective count. The per-id acks live in `acknowledged-ledger.yaml` under `finding_id:` entries (counted in `acknowledged:` field of frontmatter); the class-pattern acks live in the SAME ledger under `match_pattern:` entries (counted in `class_acknowledged:` field). See "Acknowledged-ledger schema (closes the per-sprint loop)" above for entry shape + count-computation steps + governance requirement (`decision_ref:` mandatory for class-pattern entries).

The CLI predicate evaluator (`evalCountPredicate`, `bin/essense-flow-tools.cjs:2468`) reads both fields from QA-REPORT.md frontmatter and applies the subtraction. Master writes BOTH counts (does not pre-subtract).

### Anti-fabrication discipline

This is the other half of the principle:

- **Path evidence is required for every finding.** No hand-waving claims.
- **Verbatim quote is re-validated.** Drifted quotes flag as `quote_drift`.
- **Claim is re-evaluated against actual code at the location.** Not against the agent's recollection.
- **Uncertain findings go to `needs_context`** with the user as the resolver — never silently classified as confirmed to look productive.

A review that invents bugs to look thorough drives the pipeline into endless fix-the-non-existent-bug loops. The fix-loop is the failure mode this discipline prevents.

### Finalize (`finalize`)

Write QA-REPORT.md, spec-compliance.yaml, and the updated ledgers via ordinary `Write` to the canonical paths from `init review`. Then advance phase via `state-set-phase`:

```bash
# pass-review case (count == 0):
node plugins/essense-flow/bin/essense-flow-tools.cjs state-set-phase --value verifying --project-root <project-root>

# block-review case (count > 0):
node plugins/essense-flow/bin/essense-flow-tools.cjs state-set-phase --value triaging --project-root <project-root>
```

Then `step-advance --skill review --next-step skill-complete` to delete the cursor.

## Unknowns channel (librarian protocol)

`needs_context` validator verdicts and `inconclusive` lens findings are unknowns by another name (`references/librarian.md`): things the pipeline could not determine on its own. Treat them with gate discipline — register each (`register-add --kind unknown`), batch the open ones into one `AskUserQuestion` before the phase advances, and never let one dissolve into a silently-passed report. A ratified default is an answer; an ignored unknown is a fabricated book.

## Constraints

- Per **Diligent-Conduct**: every finding's evidence is structural (path + quote + context) and re-validated. No vibes-based findings persist.
- Per **Fail-Soft**: a single lens crashing produces a synthetic risk finding. The other lenses still synthesize. Quorum is `tolerant`.
- Per **Front-Loaded-Design**: a `needs_context` finding is **not silently resolved** — the user explicitly resolves it. Never let the categorizer pick a side just to keep the pipeline moving.
- Per **No-Resource-Caps** (`references/principles.md`): no cap on the number of lenses. Adaptive — picked from what the sprint touched. No budget on findings count.
- Per **Graceful-Degradation**: when the sprint report is partial, review audits what's on disk and surfaces the missing portion as a coverage gap finding (synthetic, with `lens: report-coverage`). Refusing to review because the input is incomplete is a fail-closed regression.

## Why delegation is mandatory here

Without parallel adversarial lenses, the review substance — bug-hunting plus drift-checking across the sprint's modified code — would run in master context. By the time the deterministic gate computes, the rule (every finding carries verbatim path evidence; quotes shorter than `min_quote_length` auto-flag inconclusive; quote-drift auto-flags `false_positive`; uncertain findings go to `needs_context`) drifts under all the code being read. Drift symptom: vibes-based findings persist ("looks fragile"); quote-drift goes uncaught; uncertain findings get silently classified as confirmed to look productive — which drives the endless fix-the-non-existent-bug loop the discipline exists to prevent.

Delegation keeps the rule loud at validation. Each lens-agent returns evidence-backed findings from a clean context; master re-validates each one against disk via the per-finding validator agent, with the evidence policy still in working memory because the master never read the code in bulk.

## Scripts

- `bin/essense-flow-tools.cjs` — primary CLI surface: `init review`, `step-advance`, `state-set-phase`. Sole writer of `state.yaml`; deterministic gate enforced at `state-set-phase`'s prerequisite-predicate evaluator reading QA-REPORT.md frontmatter.
- `lib/dispatch.js` — DEPRECATED for review. Use `Agent` tool with `subagent_type=essense-flow-adversarial-lens` / `essense-flow-validator` instead.
- `lib/brief.js` — adversarial brief assembly + validator brief assembly. Master assembles briefs from `templates/adversarial-brief.md` and `templates/validator-brief.md` directly (substituting placeholders); the lib's brief-assembly helpers are reference utilities.
- `lib/finalize.js` — DEPRECATED for review. Use `state-set-phase` instead.

## State transitions

| from | to | trigger | auto |
|------|----|---------|------|
| sprint-complete | reviewing | initial entry | yes |
| triaging | reviewing | re-review of fixed-in-tree findings | no |
| reviewing | triaging | confirmed_unacknowledged_criticals > 0 | yes |
| reviewing | verifying | confirmed_unacknowledged_criticals == 0 | no |

## Before you finalize

Last block — read it just before you act.

**Phase targets** (verbatim from `references/transitions.yaml`):

- `sprint-complete → reviewing` — initial entry to the review pass
- `triaging → reviewing` — re-entry for re-review of a previously-blocked sprint whose confirmed criticals were fixed directly in the working tree (triage routes here with `routed_to: reviewing`; phase is already `reviewing` by the time /review runs, so the `state.phase == reviewing` check passes normally — no special entry handling needed)
- `reviewing → triaging` — confirmed_unacknowledged_criticals > 0; route findings
- `reviewing → verifying` — confirmed_unacknowledged_criticals == 0; advance to spec compliance

Not legal: `reviewed`, `qa-done`, `triage` (singular — the legal phase is `triaging`).

**The exact CLI invocation for the reviewing→verifying transition:**

```bash
node plugins/essense-flow/bin/essense-flow-tools.cjs state-set-phase --value verifying --project-root <project-root>
```

For `reviewing → triaging`, swap `--value triaging`. **Do NOT pass `--sprint`** — these transitions are not sprint-targeted (per cli-spec.md §1.2 and per `state-set-phase` rejection rules).

**Self-check before the call:**

1. Did you call `init review` to get canonical paths and ordered_steps from JSON, not infer them from prose?
2. Did you advance the cursor via `step-advance --skill review` at every step, in the canonical order?
3. Is the value passed to `state-set-phase` one of `verifying` or `triaging`? Spelled exactly with no plural / no past tense (`reviewed`, `qa-done`, `triage` are NOT canonical)?
4. Does the QA-REPORT path use the **literal** sprint number from `init.sprint_number` (NOT the placeholder `<n>`)?
5. Is `confirmed_unacknowledged_criticals` in the QA-REPORT.md frontmatter derived from the per-finding **validator** returns, not from a master gut-check? The count is the gate; honour it. The CLI op's predicate evaluator reads this field; if it disagrees with your intended `--value`, the op rejects.
6. Did **lens agents** produce the findings, **validators** re-quote against disk? Master should not be reading code in bulk; both should run via `Agent` tool with `subagent_type=essense-flow-adversarial-lens` / `essense-flow-validator`.
7. Are you calling `state-set-phase`, NOT `Write` on `.pipeline/state.yaml` and NOT `lib/finalize.js`?

If any answer is `no`, stop. Re-read.

## Numbered step sequence (ordered_steps anchors)

The six blocks below are the addressable anchors consumed by
`essense-flow-tools next-step --skill review`. Each `## N. <step-name>`
heading mirrors a slot in the `ordered_steps` array returned by
`essense-flow-tools init review` (verbatim). Steps are emitted one at a
time so consumed steps fall out of context; the cursor advances only on
an explicit `step-advance`. Bodies above remain the source-of-truth;
these blocks point back into them so the parser (lib/cursor-schema.cjs
`parseSkillStepsFromMarkdown`) can slice the emission window cleanly.
The heading shape is the parser contract: the parser stays canonical,
only the SKILL.md files carry numbered headings.

## 1. read-inputs-and-ledgers

Step 1 of 6 for the review skill (ordered_steps anchor).

Read all required inputs (per `init review` `required_inputs`). Read
the prior false-positive ledger — those rejections are remembered. Read
the prior acknowledged ledger — those items already accepted. If any
input missing, refuse to start with the specific path missing.

See the existing skill body section "How you work" → "Setup (`read-
inputs-and-ledgers`)" for the full substance. This heading is the
addressable anchor for `next-step --skill review` body emission bounded
by the next numbered heading.

## 2. extract-spec-claims

Step 2 of 6 for the review skill (ordered_steps anchor).

Walk SPEC.md + ARCH.md + decisions.yaml top-down. Emit one claim per
design decision with a locator hint pointing at where in the codebase
the check applies.

See the existing skill body section "How you work" → "Job 1 — Extract
spec claims (`extract-spec-claims`)" for the full substance. This
heading is the addressable anchor for `next-step --skill review` body
emission bounded by the next numbered heading.

## 3. audit-adversarial-lenses

Step 3 of 6 for the review skill (ordered_steps anchor).

Spawn parallel agents via `subagent_type=essense-flow-adversarial-lens`,
each through a distinct lens (correctness | contract-compliance |
hidden-state | failure-modes | spec-drift | functional-testing —
adaptive). Each finding carries `finding_id`, `lens`, `severity`,
`file_path`, `line_number`, `verbatim_quote`, `context_window`,
`claim`, `proposed_check`. Findings without `verbatim_quote` and
`file_path:line_number` are not findings.

See the existing skill body section "How you work" → "Job 2 — Audit
(`audit-adversarial-lenses`)" for the full substance. This heading is
the addressable anchor for `next-step --skill review` body emission
bounded by the next numbered heading.

## 4. validate-findings-against-disk

Step 4 of 6 for the review skill (ordered_steps anchor).

Spawn one `subagent_type=essense-flow-validator` per finding (parallel,
single message). Quote drift check — read the cited file, look for the
verbatim quote within the cited window; if the quote does not appear,
auto-flag as `false_positive` with reason `quote_drift`. Claim
evaluation produces one of `confirmed | needs_context | false_positive`.

See the existing skill body section "How you work" → "Job 3 — Validate
(`validate-findings-against-disk`)" + "Anti-fabrication discipline" for
the full substance. This heading is the addressable anchor for `next-
step --skill review` body emission bounded by the next numbered heading.

## 5. compute-deterministic-gate

Step 5 of 6 for the review skill (ordered_steps anchor).

Count `confirmed_unacknowledged_criticals`. That number — and only that
number — decides advance. Zero → sprint passes review, route to
`verifying`. Non-zero → sprint blocks, route to `triaging`.

See the existing skill body section "How you work" → "Job 4 — Decide
(`compute-deterministic-gate`)" for the full substance. This heading is
the addressable anchor for `next-step --skill review` body emission
bounded by the next numbered heading.

## 6. finalize

Step 6 of 6 for the review skill (ordered_steps anchor).

Write QA-REPORT.md, spec-compliance.yaml, and the updated ledgers via
ordinary `Write` to the canonical paths from `init review`. Advance
phase via `state-set-phase --value verifying` (pass-review) or `--value
triaging` (block-review). Cursor cleanup via `step-advance --skill
review --next-step skill-complete`.

See the existing skill body section "How you work" → "Finalize
(`finalize`)" + "Before you finalize" for the full substance. This
heading is the addressable anchor for `next-step --skill review` body
emission; since this is the last step (N == K == 6), the emission
window runs from this heading to end-of-file.
