# Build Plan: mk-flow

> **End Goal:** mk-flow is a plugin in cc-marketplace that makes working with Claude Code seamless across sessions and projects. When installed via `/mk-flow init`, it adds automatic intent detection (via a UserPromptSubmit hook that injects context for inline classification), an intake skill that decomposes dense multi-issue input into structured assumption tables with temporal routing, and a state skill that tracks where you are with status/pause/resume. It's extensible (add/modify intents per project), learns from corrections, gives copy-paste handoff commands, and connects your existing skills (miltiaze, ladder-build, note-tracker) into a unified flow.

> **Source:** artifacts/explorations/2026-03-15-mk-flow-final-exploration.md + artifacts/explorations/2026-03-15-mk-flow-ux-reference.md

---

## Status

- **Current milestone:** 7 — Tooltips + commands + context handoff
- **Completed:** 6 of 7 milestones
- **Last updated:** 2026-03-15

---

## Milestones

### Milestone 1: Plugin scaffold + init (M)
**Goal:** Create the mk-flow plugin directory structure, with an init skill that sets up any project for mk-flow usage.
**Done when:**
- Plugin directory follows pattern (plugin.json, skills/, hooks/)
- Default intents.yaml has all 7 default intents with descriptions, signals, routes
- config.yaml template has architecture_engagement and tooltip_seen fields
- STATE.md template matches the format from the exploration (under 50 lines)
- continue-here.md template has structured sections
- Init skill SKILL.md exists with verification protocol
- Marketplace registration updated
**Status:** completed | 2026-03-15 — 17 files created, full plugin scaffold with 3 skills, templates, defaults, marketplace registered

### Milestone 2: Intent classification hook (M)
**Goal:** UserPromptSubmit hook that injects project context (intents, state, vocabulary, cross-references) so the main Claude classifies intent inline.
**Done when:**
- intent-inject.sh reads stdin JSON, extracts .prompt field
- Auto-detects JSON parser (jq > python3 > python), graceful fallback
- Messages under 10 chars are skipped
- Slash commands are skipped
- Injects intents.yaml, STATE.md, vocabulary.yaml, cross-references.yaml as tagged context
- Classification instructions output as stdout (picked up as system-reminder)
- Handles missing context files gracefully (exits with 0 if none exist)
**Status:** completed | 2026-03-15 — bash script with multi-parser detection, stdin JSON input, verified working (commit 8fd6cb3)

### Milestone 3: Intake skill (M)
**Goal:** Skill that decomposes any user input into structured items with an assumption table, temporal routing, and amendment tracking.
**Done when:**
- SKILL.md with routing (decompose vs. single-item passthrough)
- parsing-rules.md reference covers: type extraction, assumption surfacing, temporal routing, amendment format, frustration escalation, classifier correction, vocabulary capture
- assumption-table.md template with columns: #, Type, Item, Where, Assumption
- Simple input skips assumption table, routes directly
- Temporal routing classifies: current_work, past_work, future_work, decision_override, general
- Amendments for past work create entries with NEEDS_AMENDMENT status
**Status:** completed | 2026-03-15 — SKILL.md + parsing-rules.md + assumption-table.md all complete

### Milestone 4: State skill (M)
**Goal:** Skill with three workflows — status, pause, resume — for per-project state management and session continuity.
**Done when:**
- SKILL.md routes to status/pause/resume workflows
- status.md reads STATE.md + note-tracker (if present) + build plans, shows summary
- pause.md writes .continue-here.md with structured snapshot + generates copy-paste resume command
- resume.md reads .continue-here.md, shows summary, routes to next action, cleans up
- Stale state detection: if STATE.md is older than 24h, prompts confirmation
- Context handoff: generates copy-paste command at milestone boundaries
- State verification step: checks "pending" milestones against actual deliverables before reporting
- Templates: state.md, continue-here.md, vocabulary.yaml, cross-references.yaml
**Status:** completed | 2026-03-15 — SKILL.md + 3 workflows + 4 templates all complete. Verification step added to status workflow.

### Milestone 5: Extensibility + learning (S)
**Goal:** Extensible intent system with global library, natural language add/modify, and cross-project intent sharing.
**Done when:**
- Global intent library at ~/.claude/mk-flow/intent-library.yaml (init creates/updates it)
- "add an intent for X" creates new intent in project intents.yaml + global library
- "add X to Y intent" updates signals list in project intents.yaml
- /mk-flow init shows intents from global library with project usage history
- Corrections in intents.yaml corrections section are injected and visible to classifier
**Status:** completed | 2026-03-15 — Global library exists with usage tracking. Corrections mechanism works via context injection. Intent add/modify instructions added to hook output. Init handles library creation (step 6) and shows cross-project usage (step 4).

### Milestone 6: Existing skill enhancements (M)
**Goal:** Connect mk-flow to miltiaze, ladder-build, and note-tracker for end-to-end workflow.
**Done when:**
- miltiaze exploration report has structured "Build Plans" section (exploration-report.md:103-110)
- miltiaze checks artifacts/explorations/ for previous explorations (full-exploration.md:18)
- ladder-build build-milestone workflow includes: STATE.md update step (step_6), deviation rules (step_3), goal-backward verification (step_4), amendment scan on completion (step_6)
- ladder-build continue workflow reads STATE.md and .continue-here.md (continue.md:24-28)
- note-tracker accepts items from intake (intake routing table routes bugs/questions to note-tracker)
- End-to-end flow: miltiaze → Build Plans → ladder-build kickoff → builds with state → note-tracker receives bugs
**Status:** completed | 2026-03-15 — All integrations were built into the skill scaffolds during M1-M4. Verified against actual file contents.

### Milestone 7: Tooltips + commands + context handoff (S)
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

---

## Discovered Work
- Hook used nonexistent CLAUDE_USER_PROMPT env var — stdin JSON is the correct input method (fixed in commit 8fd6cb3)
- jq not available on all systems — added multi-parser detection (jq > python3 > python)
- Status workflow needed verification step — build plan status fields can drift from reality. Added step_4_verify_state to status.md workflow.

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
| 2026-03-15 | Inline classification instead of Haiku API call | Original plan called Haiku via Python. Bash context injection is simpler — no API key dependency, no latency, no cost, and the main Claude has full context for better classification |
| 2026-03-15 | Architecture engagement as init question | User wants control over how much architecture discussion happens |
| 2026-03-15 | Context handoff with copy-paste commands | From GSD — proactive fresh-start suggestion with exact resume command |
| 2026-03-15 | State verification before status reporting | Build plan status fields can drift from codebase reality. Status workflow now verifies deliverables exist before reporting |
