---
name: mk-flow-init
description: Initialize mk-flow in any project — scans existing project context (GSD, ladder-build, miltiaze, note-tracker, git history), bootstraps state from what it finds, sets up intent definitions and config. Run once per project to enable automatic intent detection, seamless mode switching, and session continuity.
---

<objective>
Set up mk-flow in the current project directory. Scans for ALL existing project context — GSD planning files, ladder-build plans, miltiaze explorations, note-tracker, CLAUDE.md, git history — and bootstraps STATE.md from what it finds. No empty templates when there's real context to import. Intent classification is handled automatically by the mk-flow plugin's hook — no per-project hook setup needed.
</objective>

<quick_start>
If the user says "/mk-flow init" or "set up mk-flow" or "initialize mk-flow", run the init workflow directly.
</quick_start>

<essential_principles>
<core_rules>
1. Init is idempotent — running it twice doesn't break anything. Existing config is preserved, missing files are created.
2. Always scan for existing context BEFORE creating STATE.md — never start empty when there's history.
3. Always ask architecture engagement level and intent selection before creating files.
4. Use the global intent library to show what the user has used in other projects.
5. Never overwrite existing STATE.md — it may contain active project state.
6. Create context/ directory for state and notes. Git-track state, gitignore local preferences.
</core_rules>
</essential_principles>

<process>

<step_1_check_existing>
Check if mk-flow is already initialized in this project:
- Look for `.claude/mk-flow/intents.yaml`
- Look for `context/STATE.md`

If both exist: "mk-flow is already set up here. Want to reconfigure?"
If partially set up: fill in missing files only.
If not set up: proceed with full init.
</step_1_check_existing>

<step_2_scan_project_context>
Scan for ALL existing project context. Read everything you find — the goal is to understand where this project is right now, what's been done, what's in progress, and what's planned.

**GSD files** (check `.planning/` directory):
- `.planning/PROJECT.md` — project description, requirements, constraints, key decisions
- `.planning/STATE.md` — current position, phase status, blockers, accumulated context
- `.planning/ROADMAP.md` — phase breakdown, progress, dependencies
- `.planning/REQUIREMENTS.md` — requirement tracking and traceability
- `.planning/phases/*/` — scan all phase directories for:
  - `*-PLAN.md` files — what was planned
  - `*-SUMMARY.md` files — what was executed (most valuable — contains actual outcomes)
  - `*-VERIFICATION.md` files — what was verified
  - `*-CONTEXT.md` files — implementation decisions
  - `*-RESEARCH.md` files — pre-planning research
  - `deferred-items.md` — discovered issues that were out of scope
- `.planning/.continue-here.md` — checkpoint continuation context
- `.planning/todos/pending/` — captured ideas

**Ladder-build files** (check `artifacts/builds/`):
- `artifacts/builds/*/BUILD-PLAN.md` — build plans with milestones, decisions, discovered work
- `artifacts/builds/*/milestones/*.md` — milestone completion reports

**Miltiaze explorations** (check `artifacts/explorations/`):
- `artifacts/explorations/*.md` — exploration reports with solutions and build plans

**Note-tracker** (check `project-notes/`):
- `project-notes/tracker.xlsx` — if present, note that note-tracker is set up (don't read xlsx directly)

**Project instructions:**
- `CLAUDE.md` — project-level instructions, architecture, conventions
- `README.md` — project description and setup

**Git history:**
- Run `git log --oneline -20` to see recent work
- Run `git log --oneline --since="2 weeks ago"` for recent activity window

**Other context:**
- `context/` directory — any existing notes or state files
- `.continue-here.md` in project root — handoff from previous session

Present a summary of what was found:

```
Scanning project context...

Found:
  GSD: PROJECT.md, ROADMAP.md (6 phases, 3 completed)
       Phase 4 in progress — "API Integration"
       12 requirements tracked, 7 satisfied
  Ladder-build: 1 active build plan (mk-flow, milestone 2 of 7)
  Explorations: 3 reports in artifacts/explorations/
  Note-tracker: set up with 5 open bugs, 3 pending questions
  Git: 47 commits, last activity 2 hours ago
  CLAUDE.md: project instructions present

I'll use this to bootstrap your STATE.md.
Anything I should know that isn't in these files?
```

Wait for user response. If they add context, incorporate it. If they say "looks good" or similar, proceed.
</step_2_scan_project_context>

<step_3_architecture_engagement>
Ask using AskUserQuestion:

Question: "Architecture engagement — how involved do you want to be in architecture decisions?"

Options:
1. **High** — Walk me through decisions with tradeoffs before building
2. **Medium** — Flag decisions briefly, quick confirm
3. **Low** — Decide silently, document in reports
</step_3_architecture_engagement>

<step_4_select_intents>
Read the global intent library at `~/.claude/mk-flow/intent-library.yaml` if it exists. Merge with defaults from this plugin's `intent-library/defaults.yaml`.

Present available intents using AskUserQuestion (multiSelect: true):

Question: "Which intents should be active for this project?"

Show each intent with its description. Mark default_enabled intents as pre-selected. For intents that exist in the global library but not in defaults, show which projects used them (e.g., "used in: Auto-chessed, BinanceRepo").

If the project has note-tracker set up (found in step 2), pre-select `bug_report` intent.

Also offer: "Describe a new one" option for custom intents.

If the user describes a new intent:
1. Ask for: name, description, what it detects, what should happen
2. Create the intent entry
3. Save to both project intents.yaml and global library
</step_4_select_intents>

<step_5_create_files>
Create the following files. Use the Write tool for each:

**1. `.claude/mk-flow/config.yaml`**
```yaml
architecture_engagement: [selected level]
tooltips_seen: {}
```

**2. `.claude/mk-flow/intents.yaml`**
Selected intents from step 4, using the format from `intent-library/defaults.yaml`. Include empty corrections section:
```yaml
intents:
  [selected intents with descriptions, signals, routes]

corrections: []
```

**3. `context/vocabulary.yaml`** (if not exists)
Use the template from `skills/state/templates/vocabulary.yaml`. This maps user terms to domain-specific concepts — populated automatically when the user clarifies ambiguous terms during conversation.

**4. `context/STATE.md`** (if not exists)
**If context was found in step 2:** Populate STATE.md from the scan results. Synthesize across all sources:

- **Current Focus** — from GSD STATE.md current position, or ladder-build's current milestone, or the most recent git activity
- **Done (Recent)** — from GSD completed phases/summaries, ladder-build completed milestones, recent git history
- **Blocked / Open Questions** — from GSD blockers, note-tracker open bugs/questions, deferred items
- **Next Up** — from GSD roadmap next phase, ladder-build next milestone, or exploration recommendations
- **Decisions Made** — from GSD PROJECT.md key decisions, ladder-build decisions log, CLAUDE.md conventions
- **Amendments** — leave empty (no amendments yet in mk-flow)
- **Context for Future Me** — architecture constraints from CLAUDE.md, gotchas from GSD research/verification, rejected approaches from explorations

Keep it under 50 lines. Prioritize what's actionable NOW over historical completeness. Link to source files for details rather than duplicating content.

**If no context was found:** Use the template from `skills/state/templates/state.md`. Replace `[project-name]` with the actual project directory name. Set "Last updated" to today's date. Leave sections empty.

**5. `context/notes/`** (create directory if not exists)
Empty directory for auto-saved analysis and forward-notes.

**6. `.gitignore` additions**
Append to existing .gitignore (or create if not exists):
```
# mk-flow local preferences (not shared)
.claude/mk-flow/config.yaml
```

Do NOT gitignore:
- `.claude/mk-flow/intents.yaml` (intent definitions should be shared)
- `context/` (state and notes should be tracked)
</step_5_create_files>

<step_6_update_global_library>
If `~/.claude/mk-flow/intent-library.yaml` doesn't exist, create it.

Merge any new intents the user created into the global library. Update usage tracking (which projects use which intents).
</step_6_update_global_library>

<step_7_confirm>
Show the user what was created:

```
mk-flow initialized for [project-name].

Created:
  .claude/mk-flow/config.yaml  — engagement: [level]
  .claude/mk-flow/intents.yaml — [N] intents active
  context/STATE.md              — [bootstrapped from N sources | empty template]
  context/vocabulary.yaml       — term disambiguation (auto-populated)
  context/notes/                — for captured thoughts

Architecture engagement: [level]
Active intents: [list]
[If context imported: 'State bootstrapped from: GSD (6 phases), ladder-build (1 plan), note-tracker (8 items)']

Intent classification is automatic — the mk-flow plugin
handles it. You can talk naturally and I'll detect if
you're asking a question, reporting a bug, or adding
context. Say 'what can I do?' anytime for options.
```
</step_7_confirm>

</process>

<success_criteria>
- All existing project context scanned (GSD, ladder-build, miltiaze, note-tracker, git, CLAUDE.md)
- User shown summary of what was found and given chance to add context
- Architecture engagement level selected and saved
- Intents selected (with history from global library shown, note-tracker auto-enables bug_report)
- STATE.md bootstrapped from scan results (not empty when context exists)
- All files created without overwriting existing state
- Global intent library updated
- User sees confirmation with context import summary
</success_criteria>
