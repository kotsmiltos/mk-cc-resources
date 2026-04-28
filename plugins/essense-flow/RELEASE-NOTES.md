# essense-flow Release Notes

## 0.5.0 (2026-04-28)

Architectural change. The `/architect` slash command becomes a **dispatcher** that routes between two genuine flows based on SPEC.md complexity. Closes the last B-class split surface (lightweight architect flow). Wires the heavyweight wave-based decomposition flow live for the first time — it had been documented but dormant since v0.2. Adds an injection-seam runner (`runArchitectPlan`) that lets us test the orchestrator-driven dispatch + AskUserQuestion loops deterministically, mirroring the `verify-runner.runVerify` pattern. Adds static-analysis tests over the architect workflow markdown so the orchestrator-instruction text can't silently drift. Surfaces and fixes a latent bug in `NODE_STATES` that left every design-keyword node stuck at `in-progress` because `pending-user-decision` was missing from the `in-progress` allowed-transition list.

### `runArchitectPlan` (new — orchestrator with injection seams)

- **`architect-runner.runArchitectPlan({pipelineDir, pluginRoot, config, dispatchFn, askFn, sprintNumber, taskSpecBuilder, maxWaves})`** — composes `planArchitecture` → perspective dispatch → `synthesizeArchitecture` → `finalizeArchitecture` → wave loop (`decomposeWave` / `applyAnswer` / `detectSpecGap`) → `finalizeDecompose`. Multi-status return: `phase-rejected | missing-input | briefs-pending | parse-failed | synthesis-ready | questions-pending | spec-gap | max-waves-reached | complete | missing-decomposition-state | finalize-arch-failed | finalize-decompose-failed | wave-failed | task-specs-failed | transition-failed | plan-failed | synthesis-failed`.
- **Production mode** (`dispatchFn=null`): runner returns `briefs-pending` with the 4 perspective briefs. SKILL.md drives the actual Agent-tool dispatch + AskUserQuestion loop.
- **Test/automation mode** (`dispatchFn` provided): runner dispatches all 4 briefs in parallel via `Promise.all`, parses outputs via `lib/agent-output.parseOutput`, runs synthesis end-to-end. If `askFn` is also provided, the heavyweight wave loop runs to completion (or hits `max-waves-reached`, `spec-gap`, etc.). If `askFn=null`, runner pauses at `questions-pending` and persists state so caller can apply answers and re-invoke.
- The runner is **opt-in** — existing /architect orchestrator-driven flow in `commands/architect.md` keeps working without it. The runner exists as a deterministic test harness for the dispatch + question loops, and as a foundation for future full-automation use cases.

### `parseComplexityBlock` extended for classification override

- **`elicit-runner.parseComplexityBlock(specContent)`** now extracts `complexity.classification` from SPEC.md frontmatter (alongside existing `assessment`, `touch_surface`, `unknown_count`, `notes`). Without this, the dispatcher's mechanical override was theoretical — the field never made it from SPEC.md to `chooseArchitectFlow`. Now wired end-to-end: setting `classification: "mechanical"` in SPEC.md frontmatter forces the lightweight /architect flow regardless of depth.

### `NODE_STATES` bug fix

- **`in-progress` node state now allows transition to `pending-user-decision`.** Previously the allowed-list was `["resolved", "leaf", "blocked"]` only. `decomposeWave` always moves a node into `in-progress` first, then re-classifies based on `evaluateNode`. When `evaluateNode` returned `hasDesignChoice: true`, `decomposeWave` called `updateNodeState("in-progress" → "pending-user-decision")` — which the state machine silently rejected (return value unchecked). Result: every design-keyword node stayed at `in-progress` forever, and convergence checks counted them as in-flight rather than awaiting user input. **Verifiable check:** the new `runArchitectPlan` "questions-pending" test now passes; previously it asserted `actual: "in-progress"` against `expected: "pending-user-decision"`. Existing `decomposition-state.test.js` unit tests remain green because they tested updateNodeState directly without going through decomposeWave's full sequence.

### essense-flow's own SPEC.md complexity declaration

- `.pipeline/elicitation/SPEC.md` frontmatter now declares `complexity: { assessment: "partial-rewrite", touch_surface: "broad", unknown_count: 0 }`. Routes essense-flow's next /architect runs to **heavyweight** by default (depth=high-care). For pure fix sprints, add `classification: "mechanical"` to the same block to override; remove after the fix sprint completes.
- **Verifiable check:** `node -e "const {chooseArchitectFlow}=require('./skills/architect/scripts/architect-runner'); const yaml=require('js-yaml'); const fs=require('fs'); const m=fs.readFileSync('.pipeline/elicitation/SPEC.md','utf8').match(/^---\n([\s\S]*?)\n---/); console.log(chooseArchitectFlow(yaml.load(m[1]).complexity))"` returns `{flow: "heavyweight", depth: "high-care", reason: "depth=high-care — wave-based decomposition (no classification override)"}`.

### Static-analysis tests on workflow markdown

- **`tests/architect-workflow-text.test.js`** — asserts that load-bearing instruction phrases ("4 agents", "in parallel", "Agent tool", "AskUserQuestion", "applyAnswer", "detectSpecGap", "MANDATORY single call", "finalizeArchitecture", "finalizeDecompose", "phase_requires: decomposing", etc.) are present in `commands/architect.md`, `plan.md`, `decompose.md`, `SKILL.md`. Catches text drift that would silently change orchestrator behaviour without breaking any code test. Pairs with `runArchitectPlan` tests for behavioural validation.

### Two architect flows, deterministic routing

The dispatcher reads SPEC.md `complexity` block and calls `architect-runner.chooseArchitectFlow(complexity)`:

- **Lightweight inline flow** — `complexity.assessment === "bug-fix"` (depth=flat) OR `complexity.classification === "mechanical"`. Skips the `decomposing` phase entirely. Perspective swarm → DAG-based wave construction (`decomposeIntoSprints`) → `finalizeArchitecture(sprinting)`. Used for fix sprints, cited-bug patches, re-plans of pre-specced tasks. Cheap; no LLM-driven design discussion.
- **Heavyweight workflow** — anything else (incl. missing complexity block — heavyweight is the safe default). Follows `skills/architect/workflows/plan.md` end-to-end. Perspective swarm → `finalizeArchitecture(decomposing)` → wave-based decomposition with `AskUserQuestion` design questions → `finalizeDecompose(sprinting)`. Used for new features, partial rewrites, new projects. Larger, meatier sprints with surfaced design decisions.

Routing decision cites `depth` + `classification` + `reason` so the user can override via SPEC.md edit if the heuristic chose wrong.

### `finalizeArchitecture` (new — closes lightweight B-class hazard)

- **`architect-runner.finalizeArchitecture(pipelineDir, archDoc, synthDoc, route, sprintMeta)`** — atomic helper covering both architecture exits.
  - `route="sprinting"`: writes ARCH.md + synthesis.md + every TASK-NNN.md/.agent.md pair AND transitions `architecture → sprinting`. Required `sprintMeta = { sprintNumber, specs }`. Used by lightweight flow.
  - `route="decomposing"`: writes prelim ARCH.md + synthesis.md AND transitions `architecture → decomposing`. Used by heavyweight flow at the architecture/decomposing boundary.

Closes the failure mode where `commands/architect.md` previously ran `writeArchitectureArtifacts` + `writeTaskSpecs` + manual phase transition as three separate side effects. Orchestrator stop between any pair left phase=architecture with artifacts on disk; autopilot then ran `/architect` which fell into the no-op "report current phase" branch and **stalled the pipeline**. Same B2 family addressed in v0.4.4 (review), v0.4.7 (triage), v0.4.8 (research/decompose/build/verify).

### `chooseArchitectFlow` (new — deterministic dispatcher decision)

- **`architect-runner.chooseArchitectFlow(complexity) → { flow, depth, classification, reason }`** — pure function, no I/O. Returns `flow ∈ {lightweight, heavyweight}` per the routing rules above. Tested across all complexity assessments, mechanical override, missing-complexity default. Reason field is non-empty for every input — used by the dispatcher to log the chosen flow with rationale.

### Heavyweight flow now live

- `commands/architect.md` rewritten as dispatcher. Lightweight inline flow now calls `finalizeArchitecture(sprinting)` instead of three split steps. Heavyweight branch instructs the orchestrator to follow `plan.md` end-to-end.
- `skills/architect/workflows/plan.md` step 9 updated to call `finalizeArchitecture(decomposing)` instead of plain `lib/state-machine.transition`.
- `skills/architect/workflows/decompose.md` frontmatter bug fixed: `phase_requires: architecture` → `phase_requires: decomposing` (matches the workflow content and `phase_transitions: decomposing → decomposing | decomposing → sprinting`).
- `skills/architect/SKILL.md` workflow + transition lists updated to reflect dispatcher routing.

### Tests

- `tests/architecture-finalize.test.js` — 23 assertions across both routes (sprinting + decomposing), invalid route, sprintMeta validation, archDoc required, phase guard, exports check.
- `tests/architect-flow-router.test.js` — 11 assertions for `chooseArchitectFlow`: mechanical override priority, depth=flat shortcut, non-flat assessments, missing-complexity default, non-empty reason field.
- `tests/architect-heavyweight-e2e.test.js` — 14 assertions stepping through the full heavyweight flow: dispatcher → architecture transition → synthesizeArchitecture (stubbed perspective outputs) → finalizeArchitecture(decomposing) → initDecompositionState → addNode (leaf-indicator nodes) → decomposeWave (no questions surfaced) → isDecompositionComplete → generateTreeMd → createTaskSpecs → finalizeDecompose(sprinting). Asserts state.yaml progression `requirements-ready → architecture → decomposing → sprinting` and that ARCH.md, synthesis.md, TREE.md, DECOMPOSITION-STATE.yaml, TASK-NNN.md/.agent.md pairs all land on disk. Does **not** exercise real perspective-agent dispatch or the AskUserQuestion design-question loop — those are orchestrator-driven and require live LLM execution.
- Full suite: 798/798 pass (788 v0.5.0 baseline + 10 from the audit-fix sweep below).

### Dormant-path audit fixes (post-wiring sweep)

Activating the heavyweight architect flow surfaced four latent bugs in code paths that had been dormant since v0.2 — they only fire when the heavyweight loop runs. All four were fixed in the same release; tests now pin the contracts.

- **G1 — `_runDecomposeLoop` checked the wrong field on `detectSpecGap`.** Code branched on `gap.detected` but `detectSpecGap` returns `{isSpecGap, reason}`. The spec-gap escalation path was effectively dead. Fixed: branch on `gap.isSpecGap`. `tests/runArchitectPlan.test.js` "spec-gap" assertion tightened from `status === "spec-gap" || "complete" || "max-waves-reached"` to `status === "spec-gap"` exact.
- **G2 — `decomposeWave` called `updateNodeState` four times with unchecked returns.** Same class as the NODE_STATES bug above: bad transitions silently corrupted state. All 4 calls now check `.ok` and bail with the error. `tests/decompose-wave-units.test.js` covers the rejection path.
- **G3 — `_runDecomposeLoop` called `applyAnswer` without checking the return.** Silent failure if a node was no longer in `pending-user-decision`. Now returns `{ok:false, status:"apply-answer-failed"}`.
- **G4 — `addNode` silently overwrote existing nodes.** Wave re-entry could stomp `parent.children` references. Now returns `{ok:false, error:"node \"X\" already exists"}`. Test asserts second add preserves the original.

Plus four contract-consistency fixes propagated across the rest of the pipeline:

- **G5 — `finalizeReview` now wraps `writeQAReport` in try/catch.** Was the only `finalize*` helper that escaped disk failures as raw exceptions instead of `{ok:false, error}`. Aligned with the pattern in `finalizeResearch`/`finalizeTriage`/`finalizeVerify`/`finalizeArchitecture`/`finalizeDecompose`.
- **G6 — `drift-check.js` null guard on `safeRead(defaultConfig)`.** Bundled config so corruption is unlikely, but the prior `config.pipeline...` access would NPE rather than report.
- **G7 — `state-machine.writeState` wraps `appendTransition` in try/catch.** Without the wrap, an audit-log write failure after the state.yaml had already landed escaped as a raw exception, breaking the `{ok, error}` contract. On failure now returns `{ok:false, stateWritten:true, error}` so the caller can decide whether to retry.
- **G8 — `completeSprintExecution` wraps `generateCompletionReport` in try/catch.** Disk failures during the completion-report write now surface as `{ok:false}` rather than escape.

`tests/decompose-wave-units.test.js` (10 assertions) was added to pin the four heavyweight contracts; `tests/runArchitectPlan.test.js` "spec-gap" case was tightened.

### Migration

essense-flow's own SPEC.md needs explicit complexity declaration to opt into lightweight. Without one, the dispatcher routes the next `/architect` run to heavyweight (per the missing-complexity default rule). Add to SPEC.md frontmatter:

```yaml
complexity:
  assessment: "bug-fix" | "new-feature" | "partial-rewrite" | "new-project"
  classification: "mechanical"   # optional — forces lightweight regardless of depth
  touch_surface: "narrow" | "broad"
```

## 0.4.8 (2026-04-28)

B-class atomic finalize pattern propagated across all skills. Closes the same auto-advance failure mode that B2 closed for /review (B2: phase persists after artifact has been produced → autopilot loops the skill against an existing report). Each phase-producing skill now has a single `finalize*` helper that performs artifact write + state transition atomically, with phase guards and route validation.

### Atomic finalize* helpers (new)

- **`research-runner.finalizeResearch(pipelineDir, requirements, synthesisDoc, syntheticGaps, route)`** — writes `REQ.md` (+ `synthesis.md`) AND transitions `research → triaging` (default) or `research → requirements-ready` (legacy shortcut) in one call. Phase-guard rejects when starting phase ≠ `research`; report still preserved on transition failure (work isn't lost).
- **`architect-runner.finalizeDecompose(pipelineDir, sprintNumber, specs, treeMd, archDoc, synthDoc, route)`** — writes task specs (+ `TREE.md` + final `ARCH.md`) AND transitions `decomposing → sprinting` in one call.
- **`build-runner.finalizeBuild(pipelineDir, sprintNumber, completions, config, projectRoot)`** — alias of `completeSprintExecution` under the canonical `finalize*` name. Refactored internally to use `state-machine.writeState` instead of raw `transition + safeWrite`, so `state-history.yaml` audit log is now appended atomically with `sprinting → sprint-complete`. Failed completions still short-circuit before any state mutation.
- **`verify-runner.finalizeVerify(pipelineDir, report, mode, target, gapItems, currentGapCount)`** — writes `VERIFICATION-REPORT.md` (or `-ondemand.md`) AND, in gate mode, transitions `verifying → complete | eliciting | architecture` via `state-machine.writeState`. On-demand mode writes the report only (NFR-004 — never touches state.yaml).

All five skills (review, triage, research, decompose, build, verify) now expose the same atomic write+transition contract. Workflow docs updated with **MANDATORY single call** language pointing at the finalize helper for the auto-advance step.

### Build runner audit-log fix

- **`completeSprintExecution` now appends to `state-history.yaml`.** Previously it bypassed `state-machine.writeState` and wrote `state.yaml` directly via `yamlIO.safeWrite`, which skipped the state-history audit append. Refactored to call `writeState` so the audit trail is consistent with every other phase transition. The legacy `nextAction` string `/architect review` is updated to `/review` to match the canonical post-sprint review skill.

### Tests

- `tests/research-finalize.test.js` — 15 assertions across each route, default route, invalid route, phase guard.
- `tests/decompose-finalize.test.js` — 12 assertions covering the same shape for `decomposing → sprinting`.
- `tests/build-finalize.test.js` — 7 assertions including failed-completion short-circuit and audit-log append.
- `tests/verify-finalize.test.js` — 22 assertions across each gate route, on-demand mode (NFR-004), invalid mode/route, phase guard.
- `tests/build.test.js` — updated `completeSprintExecution` tests to mirror `references/transitions.yaml` for `writeState`'s parent-of-pipelineDir lookup; expectation updated from `assert.throws` (legacy synchronous throw on invalid transition) to `assert.equal(result.ok, false)` (canonical `writeState` returns).
- `tests/e2e-pipeline.test.js` — same `references/transitions.yaml` mirror in setup so the build phase finalizes through the new atomic path.
- Full suite: 701/701 pass.

## 0.4.7 (2026-04-28)

Continued verification pass over historical sprint reviews (sprint-1, 4, 5, 6, 7, 8). Identifies and closes valid findings; documents verified-false claims. Companion to 0.4.5/0.4.6 verify-discipline work.

### Fix

- **Stale `commands/review.md` doc** — pointed at `architect-runner.runReview` (legacy sync impl) while the actual /review skill workflow uses `review-runner.runReview` (async, validator round). Sprint-7 review correctly identified the resulting "different clearing behavior creates state inconsistency" risk. Doc now points at the canonical path. `architect-runner.runReview` retains a header comment marking it legacy, scoped to /architect grounded review path only.
- **`writeTriage` transactional ordering.** Previously, drop-history.yaml was written first, then state.yaml `grounded_required` second; if the second write failed, drop-history persisted an entry but the durable signal never landed, and a re-run would write a duplicate entry. Reordered: state.yaml written first (the durable signal), drop-history.yaml second (audit log). On state.yaml failure, no work done — next /triage retries from unchanged input. On drop-history failure after state.yaml succeeds, behavior is correct (grounded-required is idempotent), audit lags one sprint. Test added asserting drop-history rollback on state.yaml failure.
- **`dispatchValidatorWithTimeout` sync-throw safety.** A validator function that threw synchronously, returned `undefined`, or returned a non-Promise plain value caused `.then()` to throw inside the executor — the timer was never cleared and leaked for the full 90s timeout window. Wrapped invocation in `Promise.resolve().then(() => validatorFn())` so all error modes funnel through the same reject path with `clearTimeout`. Tests added covering sync-throw and non-Promise-return.
- **YAML fence regex now accepts CRLF.** `parseValidatorOutput` (review-runner.js) and `agent-output.js` both used `/```yaml\n...```/` patterns that failed to match Windows-style CRLF agent output. Pattern now `\r?\n` so CRLF parses identically to LF. Test added with CRLF + LF parity.
- **`prior_find_id` orphan warning.** Re-review verdicts (FIXED / REGRESSED / STILL_CONFIRMED) referencing a `prior_find_id` not present in the ledger were silently skipped — losing the verdict signal and producing stale "CONFIRMED" status on the next gate evaluation. Now emits a stderr warning identifying the verdict + missing find_id.
- **`review-guard.js` symlink-aware path resolution.** When a Write/Edit target file did not yet exist, `realpathSync` threw and the fallback used `path.resolve` which does not follow symlinks. A symlink at the target path could bypass the `.pipeline/reviews/` containment check. Introduced `resolveSymlinkAware(p)` helper: tries `realpathSync(p)`; on failure, resolves the parent directory's realpath then appends basename; final fallback is `path.resolve`. Closes the symlink-bypass window for new file writes without changing behavior for existing files.

### Verified false / already-fixed during sweep

The verification sweep covered ~40 critical/high findings across sprint-1 / sprint-5 / sprint-7 / sprint-8. The vast majority were already fixed in subsequent sprints or were fabrications:

- sprint-1 critical: `groupItems infinite loop` (already guarded with `> 0` check); `.bak copyFileSync unhandled` (already wrapped in try/catch)
- sprint-1 high: `appendTransition no callers` (called in state-machine.js); `releaseLock(dir, undefined) hijack` (already rejected with `if (!sessionId)`); `corrupt lock unresolvable deadlock` (clear remediation diagnostic returned)
- sprint-5 critical: `bash-guard startsWith bypass` (uses `Set.has` exact match); `newline chain bypass` (`\r\n\0` in SHELL_CHAIN_PATTERN); `review-guard logic inversion` (current code uses `!isSafeCommand`)
- sprint-7 high: `checkMissingLedger never called` (called at L1469); `grounded_required never cleared` (cleared at L1611-1619); `dispatchValidatorWithTimeout no clearTimeout` (clearTimeout in both paths); `parseValidatorOutput accepts multi-block` (rejects); `readAcknowledgments accepts non-string find_id` (typeof check); `lock heartbeat process.cwd not normalized` (no process.cwd in lockfile.js)
- sprint-8 medium: `safeRead for state.yaml at L1207` (uses safeReadWithFallback); `applySuspectedCap zero-suppress` (explicit floor); `initLedger eager write` (in-memory only with explicit comment); `validated_at not enforced` (enforced at L1188)

The pattern is consistent with v0.4.5's empirical motivation: reviewers fabricate plausible-sounding bugs naming real functions, with wrong line numbers or claims contradicted by an actual code read. v0.4.5's tightened validator brief (mandatory pre-verdict file read + cited-line verification) is the upstream guard.

### Tests

- `tests/review-runner-units.test.js` — added sync-throw + non-Promise tests for `dispatchValidatorWithTimeout`; added CRLF + LF parity tests for `parseValidatorOutput`.
- `tests/triage-grounded.test.js` — augmented Part C transactional rollback test asserting drop-history.yaml does NOT receive new entry when state.yaml write fails.
- Full suite: 610/610 pass.

## 0.4.6 (2026-04-28)

Two bug fixes surfaced by the verification pass over historical sprint reviews. Of ~15 critical/high findings spot-checked across sprint-7 / sprint-8, the majority were fabrications (claims that the code already addressed, wrong line citations, or wrong type-check claims); these two were verified real bugs after reading the cited code.

### Fix

- **`lib/ledger.assignFindIds` now rejects invalid `currentNextId` input loudly.** Previously, an undefined or NaN `next_id` (from a corrupt persisted ledger) silently produced `FIND-NaN` IDs that propagated into `confirmed-findings.yaml`. The function now throws if `currentNextId` is not a positive finite integer, treating the invariant as a precondition contract. Callers are funneled through `readLedger` / `initLedger` which now establish that contract.
- **`lib/ledger.readLedger` recovers `next_id` when the persisted value is missing or non-finite.** Calls `recoverNextId(findings)` (already exported but previously unused) to derive the next ID from the maximum existing `FIND-NNN` id + 1. Closes the wiring gap where `recoverNextId` existed but no caller invoked it.
- **`review-runner.checkMissingLedger` throws `ERR_MISSING_LEDGER` instead of calling `process.exit(1)`.** The old `process.exit` bypassed the async `runReview` Promise chain, prevented caller try/catch from firing, and made the missing-ledger path untestable. Now throws an Error with `code: "ERR_MISSING_LEDGER"`. Behavior at the orchestrator level is unchanged — the rejection propagates up and surfaces the same diagnostic; tests can now exercise the path.

### Tests

- `tests/ledger.test.js` — 15 assertions across 4 suites: `readLedger` next_id recovery, `assignFindIds` input validation (undefined / NaN / 0 / negative all rejected), `checkMissingLedger` throw contract (no qa-output → no-op; ledger present → no-op; re-review without ledger → throws ERR_MISSING_LEDGER), `recoverNextId` derivation.
- `tests/review-runner-units.test.js` — FIX-039 test rewired to assert thrown `ERR_MISSING_LEDGER` instead of stubbing `process.exit`.
- Full suite: 606/606 pass.

### Verified false (no work)

The verification pass found these claims from sprint-7/8 reviews to be already-correct in current code:

- `checkMissingLedger never called` (FALSE — called at `review-runner.js:1469`)
- `grounded_required never cleared in review-runner.js` (FALSE — cleared at L1611-1619)
- `dispatchValidatorWithTimeout has no clearTimeout` (FALSE — clearTimeout in both resolve and reject paths)
- `parseValidatorOutput accepts multiple YAML blocks` (FALSE — explicitly rejects at L1146-1148)
- `readAcknowledgments accepts non-string find_id` (FALSE — `typeof a.find_id === "string"` check at L1395)
- `safeRead (throwing) used for state.yaml` (FALSE — `safeReadWithFallback` everywhere)
- `applySuspectedCap zero-suppresses on first pass` (FALSE — explicit floor at L552)

The pattern across these matches the empirical claim driving v0.4.5: reviewers fabricate plausible-sounding bugs at recognisable function names. v0.4.5's tightened validator brief (mandatory pre-verdict file read + cited-line verification) is the upstream guard against future occurrences.

## 0.4.5 (2026-04-28)

Review noise filter — drops fabrications, restatements, and fix-recommendations from QA reports before triage routes on them. Empirically validated against sprint-1..8 historical reports: 36% overall drop, 65% on sprint-4 critical tier, 57% on sprint-8 critical tier.

### Background

Sprint-6/7/8 review reports each declared 6–27 "critical" findings. Spot-check verification showed ~80% of those were noise:

- **Positive confirmations** classified as findings: `"FR-015 — met"`, `"569/569 tests passing"`, `"Module layering integrity preserved"` listed under `## Critical`
- **Fix recommendations** as findings: `"Add path.resolve containment check"`, `"Wrap validatorFn() in try/catch"` — actions, not bugs
- **Cross-perspective restatements** of one root cause: same `validatePathEvidence` claim cited 3× across qa-adversarial / qa-fitness-functions perspectives
- **Severity prefix mismatch**: bullets tagged `HIGH:` listed under `## Critical` section
- **Fabrications**: `path_evidence` quote present *somewhere* in the file but at a different line than cited (sprint-8 path-traversal claim cited L953-964; quote actually at L1046 — and the code at L1046 already contained the requested fix)

Triage routed on inflated counts → sprints bounced back to architecture/research for non-existent gaps. This release closes the upstream gap.

### Phase A — synthesis filter (`skills/review/scripts/review-runner.js`)

- **`extractSeverityPrefix(text)`** — leading `(critical|high|medium|low):` tag wins over keyword infer. Fixes severity inflation.
- **`isPositiveConfirmation(stripped)`** — bullet has positive keyword (`met`, `passing`, `verified`, `confirmed`, `preserved`, `implemented`) and no negative indicator (`not met`, `missing`, `absent`, `fail`, `must fix`, `should fix`, …). Drops "FR-015 met" style entries.
- **`isFixRecommendation(stripped)`** — bullet starts with imperative verb (`Add|Wrap|Replace|Plan|Extend|Fix|Update|...`). Drops fix-recs.
- **`findingDedupKey(stripped)`** — first camelCase identifier as primary key, file ref / snake_case as fallback. Rephrasing-invariant — two different phrasings of the same `validatePathEvidence` bug share a key.
- **`dedupFindings(items)`** — collapses cross-perspective restatements; first occurrence wins.
- **`filterFindings(rawItems)`** — full pipeline; returns `{ kept, dropped: { positives, fixRecs, dupes } }`.
- **`categorizeFindings`** refactored to collect raw items across all perspectives + sections, run filter once (cross-perspective dedup possible), then tier into confidence + severity buckets. Returns existing shape plus `droppedCounts` for observability.

### Phase B — verify gate

- **`validatePathEvidence` line-proximity check.** When `path_evidence` cites `file.js:42`, the verbatim quote must appear within ±`PATH_EVIDENCE_LINE_TOLERANCE` (default 10) lines of line 42. Quote present elsewhere in the file → `path-evidence-line-mismatch`. Catches the sprint-8 fabrication where the claim cited L953-964 but the quote was at L1046.
- **Regex bugfix.** Path-evidence parser regex previously treated hyphen as a separator (`[—-]`), so hyphenated filenames like `review-runner.js` were misparsed and the line check was never reached. Tightened to require em-dash with whitespace boundary (`\s+—\s+`).
- **`PATH_EVIDENCE_LINE_TOLERANCE`** added to `lib/constants.js` and exported.
- **Validator brief template** (`skills/review/templates/validator-brief.md`) gains a *Mandatory Pre-Verdict Checks* section. Validator agents must read the cited file, verify the cited line, verify the claim isn't already addressed in the code, and verify the cited function exists at the cited line — before emitting `verdict: CONFIRMED`. Covers the sprint-7-style failure mode where claims sound technical but cite wrong line numbers or request protections already present.

### Replay validation

- **`scripts/replay-qa-filter.js`** — replays the Phase A filter against historical `.pipeline/reviews/sprint-N/QA-REPORT.md` files. Emits per-tier before/after counts and drop breakdown to `.planning/qa-filter-replay.md`.
- Run: `node scripts/replay-qa-filter.js [--write]`
- Headline result: 134/371 bullets dropped overall (36%), with 65% drop at sprint-4 critical tier, 57% at sprint-8 critical, 48% at sprint-6 critical. Sprint-7 critical tier shows 0% Phase A drop — those findings were real-looking-but-false claims (e.g., `"checkMissingLedger never called"` when the function is called) — exactly the case Phase B's tightened validator brief is intended to catch on future reviews.

### Tests

- `tests/review-filter.test.js` — 31 assertions across 8 suites. Covers: severity prefix extraction, positive/fix-rec classification, dedup key stability across rephrasings, full filter pipeline, end-to-end `categorizeFindings`, and the `validatePathEvidence` line-proximity check (including sprint-8-style reproduction).
- Full suite: 591/591 pass.

## 0.4.4 (2026-04-27)

Atomic post-review hand-off — closes the structural root cause of the `reviewing` loop tracked in 0.4.3.

### Fix

- **`review-runner.finalizeReview(pipelineDir, sprintNumber, reportContent)`** — single call that writes `QA-REPORT.md` and transitions `reviewing → triaging` via `lib/state-machine.writeState`. Replaces the previous two-step contract (`writeQAReport` + separate transition step) where the orchestrator could legitimately stop between the write and the transition, leaving phase=reviewing with QA-REPORT.md present — which autopilot would then loop on (regression in 0.2.0). The transition is recorded in `state-history.yaml` with `trigger: review-skill` and the QA-REPORT path as `triggering_artifact`. Returns `{ ok, qaReportPath, transitioned, error? }`. On phase guard failure (starting phase ≠ `reviewing`), QA-REPORT is preserved so the user can recover manually.
- **`skills/review/workflows/audit.md` step 10** rewritten as MANDATORY single call to `finalizeReview`. Steps 9 + 11 of the prior workflow (write report, transition) are merged. The workflow narration now states explicitly: do not stop between writing the report and transitioning state — phase=reviewing must not persist after QA-REPORT.md has been produced.

### Tests

- `tests/review-finalize.test.js` — 7 assertions across happy path (returns `ok:true`, QA-REPORT on disk, phase=`triaging`, state-history records `reviewing → triaging` with QA-REPORT artifact) and phase guard (returns `ok:false` with error string when starting phase ≠ `reviewing`, QA-REPORT preserved on transition failure, phase unchanged).

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
