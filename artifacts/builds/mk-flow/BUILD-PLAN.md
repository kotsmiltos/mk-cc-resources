# Build Plan: mk-flow

> **End Goal:** mk-flow is a plugin in cc-marketplace that makes working with Claude Code seamless across sessions and projects. When installed via `/mk-flow init`, it adds automatic intent detection (via a Haiku-powered UserPromptSubmit hook), an intake skill that decomposes dense multi-issue input into structured assumption tables with temporal routing, and a state skill that tracks where you are with status/pause/resume. It's extensible (add/modify intents per project), learns from corrections, shows contextual tooltips, gives copy-paste handoff commands, and connects your existing skills (miltiaze, ladder-build, note-tracker) into a unified flow.

> **Source:** artifacts/explorations/2026-03-15-mk-flow-final-exploration.md + artifacts/explorations/2026-03-15-mk-flow-ux-reference.md

---

## Status

- **Current milestone:** 2 — Intent classifier hook
- **Completed:** 1 of 7 milestones
- **Last updated:** 2026-03-15

---

## Milestones

### Milestone 1: Plugin scaffold + init (M) *(current)*
**Goal:** Create the mk-flow plugin directory structure following P1 pattern, with an init skill that sets up any project for mk-flow usage.
**Done when:**
- Plugin directory follows P1 pattern (plugin.json, skills/, scripts/)
- Default intents.yaml has all 7 default intents with descriptions, signals, routes
- config.yaml template has architecture_engagement and tooltip_seen fields
- settings-template.json has UserPromptSubmit hook config
- STATE.md template matches the format from the exploration (under 50 lines)
- continue-here.md template has structured sections
- Init skill SKILL.md exists and routes to init workflow
- Marketplace registration updated
**Status:** completed | 2026-03-15 — 17 files created, full plugin scaffold with 3 skills, templates, defaults, marketplace registered

### Milestone 2: Intent classifier hook (M) *(current)*
**Goal:** Python script that calls Haiku to classify user messages by intent and temporal target, reading from project intents.yaml.
**Done when:**
- intent-classifier.py reads intents.yaml, sends message + intents to Haiku, returns JSON
- Returns {intent, temporal_target, target_hint} structure
- Messages under 10 chars are skipped (returns empty/passthrough)
- Handles missing intents.yaml gracefully (uses built-in defaults)
- Correctly classifies 10+ test messages across all intent types
- Latency is under 2 seconds per classification
**Status:** pending

### Milestone 3: Intake skill (M)
**Goal:** Skill that decomposes any user input into structured items with an assumption table, temporal routing, and amendment tracking.
**Done when:**
- SKILL.md with routing (decompose vs. single-item passthrough)
- parsing-rules.md reference covers: type extraction, assumption surfacing, temporal routing, amendment format
- assumption-table.md template with columns: #, Type, Item, Where, Assumption
- Auto-chessed bug dump test case produces correct 6+ item assumption table
- Simple input ("fix the button") skips assumption table, routes directly
- Temporal routing correctly identifies current/past/future/decision_override/general
- Amendments for past work create entries with NEEDS_AMENDMENT status
**Status:** pending

### Milestone 4: State skill (M)
**Goal:** Skill with three workflows — status, pause, resume — for per-project state management and session continuity.
**Done when:**
- SKILL.md routes to status/pause/resume workflows
- status.md reads STATE.md + note-tracker (if present), shows summary with current focus, done, blocked, amendments, next
- pause.md writes .continue-here.md with structured snapshot + generates copy-paste resume command
- resume.md reads .continue-here.md, shows summary, routes to next action
- Stale state detection: if STATE.md is older than 24h, prompts confirmation
- Context handoff: generates copy-paste command at milestone boundaries
**Status:** pending
**Depends on:** Milestone 1 (templates)

### Milestone 5: Extensibility + learning (S)
**Goal:** Extensible intent system with global library, natural language add/modify, and classifier correction mechanism.
**Done when:**
- Global intent library at ~/.claude/mk-flow/intent-library.yaml
- intent-library.py manages read/write/merge of global library
- "add an intent for X" creates new intent in project + global library
- "add X to Y intent" updates signals list
- "no, that was a bug" records correction in intents.yaml corrections section
- Haiku classifier reads corrections as few-shot examples
- /mk-flow init shows intents from global library with project usage history
**Status:** pending
**Depends on:** Milestone 2 (classifier)

### Milestone 6: Tooltips + commands + context handoff (S)
**Goal:** Contextual tooltip system, explicit commands, architecture engagement, and proactive context handoff.
**Done when:**
- Tooltip specs defined in intake and state skill references (moment, text, fade-after count)
- config.yaml tracks tooltips_seen counters
- Explicit commands documented in SKILL.md routing tables (what can I do?, show amendments, show notes, remember X, pause, set engagement)
- Context handoff generates copy-paste resume command with: skill, what's done, what's next, files to read
- Architecture engagement level (high/medium/low) in config.yaml, referenced in CLAUDE.md conventions
- "show tips again" resets counters
**Status:** pending
**Depends on:** Milestones 3, 4

### Milestone 7: Existing skill enhancements (M)
**Goal:** Connect mk-flow to miltiaze, ladder-build, and note-tracker for end-to-end workflow.
**Done when:**
- miltiaze exploration report has structured "Build Plans" section (plan, goal, milestones, depends_on)
- miltiaze checks artifacts/explorations/ for previous explorations on similar topics
- ladder-build build-milestone workflow includes: STATE.md update step, deviation rules (1-3 auto, 4 stop), goal-backward verification, amendment scan on completion
- ladder-build continue workflow reads STATE.md and .continue-here.md
- note-tracker accepts bulk items from intake (multiple bugs/questions in one call)
- End-to-end flow: miltiaze explore → structured plans → ladder-build kickoff → builds with state → note-tracker receives bugs
**Status:** pending
**Depends on:** Milestones 3, 4

---

## Discovered Work
_(Items found during building that weren't in the original plan.)_

---

## Refinement Queue
_(Polish items for after core milestones.)_

---

## Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-03-15 | No Stop hooks for state capture | Unreliable — sessions don't always end cleanly. State updates inside workflows instead |
| 2026-03-15 | No phases — plans with milestones | Flatter hierarchy, miltiaze decomposes, ladder-build executes |
| 2026-03-15 | No cross-project auto-sync | Adds complexity for marginal value. Manual is fine |
| 2026-03-15 | Note-tracker optional, not mandatory | mk-flow works without it. Enhances when present |
| 2026-03-15 | Haiku for classification, not local regex only | Intents evolve, LLM adapts. Cost negligible ($0.0001/call) |
| 2026-03-15 | Architecture engagement as init question | User wants control over how much architecture discussion happens |
| 2026-03-15 | Tooltips fade after 3 shows | Teach without nagging. Resettable with "show tips again" |
| 2026-03-15 | Context handoff with copy-paste commands | From GSD — proactive fresh-start suggestion with exact resume command |
