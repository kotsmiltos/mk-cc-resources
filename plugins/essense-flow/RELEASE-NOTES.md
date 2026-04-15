# essense-flow Release Notes

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

### Plugin Stats
- 7 skills: elicit, research, architect, build, review, triage, context
- 10 commands: init, elicit, research, architect, build, review, triage, status, next, help
- 16 lib modules
- 4 hooks (context-inject, yaml-validate, session-orient, review-guard)
- 11 states, 18 transitions
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
