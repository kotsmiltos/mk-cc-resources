# essense-flow Release Notes

## 0.3.2 (2026-04-20)

Optimization and clarity sweep across hooks, lib, and skills. No new commands or skills.

### Packaging fix
- `skills/build/` (SKILL.md, `build-runner.js`, `execute.md`) was silently gitignored in the marketplace repo by a generic Python-distribution `build/` rule and never shipped in prior releases. Plugin `.gitignore` now adds `!skills/build/` to override it. Users on 0.3.1 and earlier did not receive the build skill files alongside the `/build` command — 0.3.2 is the first release that actually ships the build skill.

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
