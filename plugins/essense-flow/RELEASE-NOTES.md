# essense-flow Release Notes

## 0.4.3 (2026-04-28)

Fix `reviewing` phase mapping regression introduced in 0.4.2.

### Fix

- **`reviewing → /triage` (revert).** v0.4.2 changed `reviewing` mapping to `/review` based on the assumption that phase=reviewing means "review-skill mid-flight, /review resumes." In practice, phase=reviewing typically persists *after* `/review` writes QA-REPORT.md but the orchestrator stops before firing the `reviewing → triaging` transition (per `transitions.yaml:234-242`, that transition is `auto_advance: true triggered_by: review-skill` — but `auto_advance` is descriptive intent, not enforcement). With the `/review` mapping, autopilot loops `/review` against an already-existing QA-REPORT. Reverted to `/triage` so the post-review hand-off advances correctly. Affects `references/phase-command-map.yaml` and `skills/context/scripts/next-runner.js`.
- **Companion change in essense-autopilot 0.2.1** adds a readiness gate for the genuine mid-flight case: phase=reviewing without QA-REPORT.md halts with a diagnostic pointing to `/review`, instead of letting autopilot fire `/triage` against a missing artifact.

### Notes

- Underlying root cause (B2) — `/review` workflow's step 9 (transition) and step 10 (inline triage) don't reliably execute — is tracked separately. This release is the surface fix; the structural fix lands later.

## 0.4.2 (2026-04-27)

Build skill — single-invocation wave contract.

### Fix

- **`/build` no longer pauses between waves.** Previously, `/build` finished wave-0, ran tests, and stopped — the orchestrator interpreted "verify after each substantive change" (general guidance) as "halt and let user re-invoke between waves". Multi-wave sprints required N manual re-invocations of `/build`.
- **New rule (`SKILL.md` constraint + `workflows/execute.md` step 5b):** ALL waves of a sprint complete in one `/build` invocation. Per-wave test gate (`build-runner.runWaveGate`) gates progress; halt only when that gate fails. Skill-specific rule overrides any general "small batches, pause between" guidance.

### New

- **`build-runner.runWaveGate(projectRoot, waveIndex, options)`** — wave-boundary gate. Wraps the existing `lib/deterministic-gate.runGate` (`npm test` + `npm run lint`) with wave context. Returns `{ ok, gateRan, waveIndex, skipped, skipReasons, failures, blockedOn }`. On failure, `blockedOn` is a single-line summary suitable for direct write into `state.blocked_on`. Tests in `tests/wave-gate.test.js` cover passing, failing, fully-skipped, partially-skipped, and blockedOn-format scenarios.

## 0.4.1 (2026-04-27)

Bug fixes and observability improvements driven by autopilot-pairing discovery: pipelines could land in invalid phase values (`"triaged"`) or stall mid-skill (`architecture` with empty tasks) without diagnostic surface.

### Fixes

- **Phase-enum guard in `writeState`** (`lib/state-machine.js`). Rejects writes of phase values outside the canonical set derived from `references/transitions.yaml`. Prevents future state corruption from typos / external writers landing values like `"triaged"` (which is not a valid phase). Returns `E_PHASE_UNKNOWN` with the canonical phase list. Existing corruption is detected separately via the new SessionStart drift surface.
- **`next-runner.js` `architecture: /architect`** (was `/build`). Phase `architecture` means the architect skill is mid-flight (synthesis done, decomposition not started). Running `/build` against an un-decomposed sprint fails. `/architect` resumes decomposition until phase auto-advances to `sprinting`. Same pattern applied to new `decomposing: /architect` mapping.

### New

- **`references/phase-command-map.yaml`** — canonical phase→command source. Consumed by `next-runner.js` (with hardcoded fallback). Mirrors essense-autopilot's flow map. Cross-check tests in `tests/phase-command-map.test.js` enforce parity with `transitions.yaml` and (when reachable) with the autopilot source — preventing future map divergence.
- **SessionStart drift surface** — `hooks/scripts/session-orient.js` now invokes `runDriftCheck` after orientation. Surfaces drift findings (e.g., unknown phase) as a visible banner so corrupt state is caught before any skill consumes it.

### Notes

- Issues observed in autopilot pairing (project A: `architecture` + empty tasks; project B: `triaged` phase) are addressed by the combined fixes — phase-enum guard prevents new corruption, drift surface makes existing corruption visible, autopilot's flow map (separate plugin, see `essense-autopilot` 0.2.0) maps `architecture` to `/architect` instead of `/build`.

## 0.4.0 (2026-04-26)

Major redesign focused on **verification discipline and propagating contracts**. The pipeline now enforces six design principles in code, not just in documentation: scope-adaptive depth, auto-advance, phase-aware context, artifact contracts, importance declared at production, deterministic-before-LLM gates.

### New — Foundation

- **Context map** (`lib/constants.js` `PHASE_INPUTS`, `skills/context/scripts/context-manager.js` `deriveContextMap`/`writeContextMap`/`readContextMap`/`formatPhaseInputsForInjection`). `session-orient` writes a fresh `.pipeline/context_map.yaml` on SessionStart by scanning actual `.pipeline/` state — never maintained, always derived. `context-inject` reads the map and injects only `phase_inputs[currentPhase]` — replaces full state dump with phase-relevant slice. Missing artifacts surfaced as `[missing: ...]` rather than silently dropped.
- **Canonical path constants** (`SPEC_PATH`, `REQ_PATH`, `ARCH_PATH`, `CONTEXT_MAP_FILE`) replace hardcoded path strings across architect-runner, elicit-runner, research-runner, next-runner.
- **`AUTO_ADVANCE_DESCRIPTIONS`** co-located with `AUTO_ADVANCE_MAP`. Parity assertion at module load — a new auto-advance phase without a description fails fast.
- **`reviewing → /triage`** added to `AUTO_ADVANCE_MAP`. The review-complete handoff is now mechanical.

### New — Quality gates

- **`lib/importance.js`** — `shouldBlockAdvance(severity, verdict)` rule, named and grep-able. Replaces post-hoc keyword inference.
- **`lib/deterministic-gate.js`** — `runGate(projectRoot, options)` runs `npm test` + `npm run lint` via `spawnSync` with timeout/error/signal handling. `failuresToFindings(failures, sprint)` converts gate failures into `blocks_advance: yes` findings. Never throws — structured result.
- **`preReviewGate(projectRoot, pipelineDir, sprintNumber)`** in `review-runner.js` — runs the gate, writes a minimal QA-REPORT directly when failed, returns `{ ok: false, qaReportPath }`. SKILL.md "Step 0" mandates this before any QA agent dispatch.
- **`preBuildGate(projectRoot)`** in `build-runner.js` — equivalent for the build phase. Tests fail before build → halt sprint.
- **`blocks_advance` field** declared at production in `categorizeFindings` via `importance.blocksAdvanceLabel`. QA-REPORT frontmatter now includes `blocks_advance_count` and `findings_total`. Schema bumped to v2.
- **`routeFinal(qaReportPath, categorized)`** in `triage-runner.js` — primary triage entry point. Reads `blocks_advance_count` as deterministic primary signal; falls back to `determineRoute(categorized)` for category-based routing when count > 0 or the field is missing. Returns `{ route, signal }` with provenance.

### New — Adaptive depth

- **`complexity` frontmatter block** in SPEC.md (`assessment` ∈ {bug-fix, new-feature, partial-rewrite, new-project}; `touch_surface` ∈ {narrow, moderate, broad}; `unknown_count`; `notes`). Validated by `elicit-runner.parseComplexityBlock` / `validateComplexityBlock`.
- **`recommendDecompositionDepth(complexity)`** in `architect-runner.js` — derives depth label (flat / standard / high-care / full) and notes. Logged at planning time and **injected into every perspective-agent brief** as a "Scope Context" section so each agent adapts to scale.
- **`convergenceCheckWaveFor(complexity)`** — adaptive wave threshold per assessment (3 / 7 / 10 / 15, +3 for broad surface). Replaces the hardcoded `CONVERGENCE_CHECK_WAVE = 10` for callers with the signal.

### New — Artifact contracts

- **Templates with full contract sections** — every output template now includes: required inputs, must-not-contain, per-section purpose/PASS/FAIL/if-stuck, size signal, completion check.
- New: `skills/build/templates/build-report.md`, `skills/elicit/templates/spec.md`, `skills/triage/templates/triage-report.md`.
- Extended: `skills/review/templates/qa-report.md` (moved from architect), `skills/architect/templates/task-spec.md`, `skills/architect/templates/architecture.md`, `skills/architect/templates/decision-record.md`, `skills/research/templates/requirements.md`.

### New — Behavioral contract

- **`Operating Contract` preamble** in every SKILL.md. Skill-specific surfacing language: review verifies on-disk quotes; triage routes by `blocks_advance_count`; elicit confirms user approval; etc. Propagation principle — rules live in artifacts, not just the builder's head.

### Hook architecture

- **`review-guard` moved from PostToolUse → PreToolUse**. Blocks bad writes before they happen instead of detecting after.

### Cleanup

- Removed dead code: `caveman/`, `edge-test*.js`, `audit-replay/` skill cluster (`lib/audit-ledger.js`, `scripts/audit-harness.js`, `scripts/audit-summarize.js`, `commands/audit-replay.md`, related test files), `lib/lockfile-heartbeat.js` and its Test 6 block in `tests/lock.test.js`.
- `.gitignore` updated: `.pipeline-archive/`, `tests/__tmp_*/`.

### Tests

- 33 test files; 538 tests passing. Coverage extended for: gate behavior, context map round-trip, blocks_advance computation, complexity parsing, AUTO_ADVANCE parity assertion, route determination.

## 0.3.4 (2026-04-21)

### Fixes

- **triage SKILL.md**: algorithm step 7 and state-transitions section incorrectly said `triaging → complete` for all-acceptable findings. Corrected to `triaging → verifying` — matches `determineRoute()` behavior and the transitions table. Agents following the doc were skipping spec compliance verification and closing the pipeline prematurely.
- **commands/next.md**: `complete` phase now checks `state.sprints` for non-complete entries before reporting "pipeline done". If stale sprints found, outputs recovery warning with exact fix instructions.
- **references/transitions.yaml**: explicit comment blocking `triaging → complete` — the path is not registered and was never valid.

## 0.3.3 (2026-04-21)

Caveman pass across all 33 skill and command prompt files — drops articles, filler, verbose phrasing. All behavioral logic, constraints, tool names, and file paths preserved exactly. Also trims hook injection strings in `context-manager.js`.

## 0.3.2 (2026-04-20)

Optimization and clarity sweep across hooks, lib, and skills. No new commands or skills.

### Packaging fix
- `skills/build/` (SKILL.md, `build-runner.js`, `execute.md`) was silently gitignored in the marketplace repo by a generic Python-distribution `build/` rule and never shipped in prior releases. The marketplace plugin `.gitignore` now adds `!skills/build/` to override it. Users on 0.3.1 and earlier did not receive the build skill files alongside the `/build` command — 0.3.2 is the first release that actually ships the build skill.

### Fixes
- `review-guard` path check now prefix-rooted against the pipeline parent directory — prevents a substring-traversal hole where an allowed filename fragment appearing mid-path would incorrectly permit writes.
- `verify-merge.worstVerdict` validates all input verdicts upfront so single-element arrays (which skip reduce's callback) also surface unknown verdicts with a clear error.
- Auto-advance banner trimmed to `[auto-advance]` — the long prose was redundant noise in every injected context.

### Build runner
- New `extractOrchestratorTaskFlag(spec)` — detects `orchestrator_task: true` in task frontmatter. Tasks flagged this way are recorded as `deferred` instead of dispatched, because they invoke `/essense-flow:*` commands that a sub-agent cannot reach.
- `recordCompletion` / `getSprintSummary` accept and tally a new `deferred` status alongside `complete`, `blocked`, `failed`.
- Build workflow classifies each task as `inline` (single file, small diff, verifiable-by-diff) or `dispatch` (multi-file or logic requiring runtime verification) and records the choice in the completion record.

### Waste removal
- `lib/transform.js` no longer embeds ARCH.md into each task brief; briefs now reference `.pipeline/architecture/ARCH.md` by path. Agents have Read — the re-embedded copy was duplicated context, burning tokens per task.
- Redundant hardcoded "Completion" checklist removed from every task brief — acceptance criteria already live in the task spec.
- Per-file 4-criteria audits across architect, build, context, elicit, research, review, triage, verify skills: trimmed repeated preambles, tightened workflow steps, consolidated duplicate guidance.

### Tests
- `tests/sprint-05-regressions.test.js` pins fixes for QA findings C-1..C-3, H-1..H-5 so future refactors can't reintroduce them.
- `tests/build-runner-orchestrator-task.test.js` covers the new orchestrator_task flag end-to-end.

## 0.3.1 (2026-04-16)

- Verify is now a prompted step — triage transitions to `verifying` but stops for user to run `/verify`
- Context injection no longer marks verifying as auto-advance
- `/next` command lists `/verify` as the recommended action when in verifying phase
- Elicit skill enforces `AskUserQuestion` for all choices — no inline A/B/C text options

## 0.3.0 (2026-04-16)

- Added verify phase — top-down spec compliance checking
- Verify extracts discrete items from SPEC.md, dispatches parallel verification agents
- Verdicts: MATCH, PARTIAL, GAP, DEVIATED, SKIPPED with confidence tiers
- Gate mode (state-changing) and on-demand mode (diagnostic)
- `/verify` command added

## 0.2.0 (2026-04-15)

Full implementation of the design specification. All 3 increments complete.

### Increment 1: Functional End-to-End Pipeline
- Created build skill (SKILL.md, build-runner.js, execute workflow)
- Created review skill (adversarial auditor with finding quality tiers)
- Created triage skill (gap/finding categorization and routing)
- Wired SPEC.md consumption into research (loadSpec, adaptive budget)
- Added transition() validation function to state-machine.js
- Added adaptiveBriefCeiling() to tokens.js with max_brief_ceiling config
- Extended architect to accept SPEC.md as primary input alongside REQ.md
- Rewrote transitions.yaml: removed reassessment, added triaging state, added auto_advance field
- Added /triage and /help commands
- Updated context-manager and drift-check for new state machine
- Fixed self-test CRLF regex handling

### Increment 2: Differentiating Features
- lib/exchange-log.js: shared exchange persistence for elicit + architect
- Adaptive research perspectives: 7-domain classifier, 28 domain-specific lenses
- Two-pass agent briefing: gap-finding + depth analysis XML sections
- Research re-run modes: targeted (gap re-evaluation) vs. full
- Full triage categorization: SPEC.md cross-referencing, 6 category types
- DECOMPOSITION-STATE tracking: node state machine, wave records, convergence
- Auto-advance wiring: autonomous phases chain, interactive phases stop
- Interactive wave-based architect: decomposition loop, design questions, spec gap detection
- Refactored elicit-runner to delegate to exchange-log

### Increment 3: Hardening and Advanced Features
- lib/artifact-integrity.js: SHA-256 hashing, staleness detection, hashOnWrite/verifyHash
- lib/lockfile.js: session locking with heartbeat, stale detection (5-min threshold)
- lib/errors.js: 10 error codes with message templates and recovery guidance
- lib/progress.js: live progress files for autonomous phases
- lib/completion.js: summary report, archive to .pipeline-archive/, clean slate reset
- SUSPECTED finding cap: 2x CONFIRMED ratio, severity-sorted truncation
- Adversarial review sandbox: PostToolUse hook (review-guard.js) blocks writes outside sandbox
- Positive control validation: findings without positive controls downgraded
- Drift-check repair mode: 6 repair actions, --repair CLI flag
- Wave confirmation: formatConvergenceSummary with 3-way user prompt
- Review cycle counter: MAX_REVIEW_CYCLES = 3, checkReviewCycleLimit/incrementReviewCycle
- Heartbeat updates via UserPromptSubmit hook
- Wired artifact-integrity, progress, errors into runners
- Fixed injection_ceiling from 5000 to 10000 per spec

### Spec Compliance Fixes
- Added `architecture-to-sprinting` transition for simple projects that skip multi-wave decomposition
- Triage now loads and merges queued findings from prior passes (carry-forward per spec)
- Research `loadSpec()` now blocks on stale SPEC.md instead of just warning
- Fixed context SKILL.md stale "reassessment" references (now "triaging")
- Removed vestigial `fitness_functions` and `elicitation.coverage_dimensions` from config
- Fixed config-schema: `injection_ceiling` default 5000 → 10000, added `max_brief_ceiling`

### Plugin Stats
- 7 skills: elicit, research, architect, build, review, triage, context
- 10 commands: init, elicit, research, architect, build, review, triage, status, next, help
- 17 lib modules
- 4 hooks (context-inject, yaml-validate, session-orient, review-guard)
- 11 states, 19 transitions
- Self-test: 43/43

## 0.1.0 (2026-04-10)

Initial release.

- Multi-phase AI development pipeline: Research, Architecture, Build, Review, Context
- State machine with phase transitions and validation
- Context injection hook (UserPromptSubmit)
- YAML validation hook (PostToolUse)
- Session orientation hook (Notification)
- Slash commands: /init, /research, /architect, /build, /review, /status, /next
- Skills: research, architect, build, context
- Brief assembly, synthesis, consistency checking, and dispatch utilities
- Self-test and plugin validation scripts
