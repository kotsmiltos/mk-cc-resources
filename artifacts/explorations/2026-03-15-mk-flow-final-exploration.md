# Exploration: mk-flow — Unified Workflow System

> **TL;DR:** A new plugin with 2 skills (intake + state) plus a project-scoped UserPromptSubmit hook for intent classification. Intake decomposes messy, multi-issue input into structured items with an assumption table. State tracks where you are across sessions with lightweight STATE.md updated inside workflows (not hooks). The intent classifier is extensible per-project — you pick which intents to enable, add new ones with natural language, and corrections improve it over time. No phases — miltiaze decomposes into plans with milestones, ladder-build executes them. Note-tracker is an optional context source, not a universal tracker. No Stop hooks, no cross-project auto-sync, no magic — just good routing, state in workflows, and CLAUDE.md conventions.

---

### Key Terms

- **Intake parsing:** Decomposing messy, free-form user input into structured, actionable items (bugs, features, questions, constraints) with explicit assumptions.
- **Assumption table:** The system states what it understood and lets you correct, rather than asking 10 clarifying questions.
- **Intent classifier:** A lightweight Haiku API call in a UserPromptSubmit hook that tags each message with intent (action, question, context, thought, frustration) + temporal target (current work, past work, future work).
- **Goal-backward verification:** Checking that goals are actually achieved, not just that tasks were completed. "Does it work?" not "Did we do the steps?"
- **Deviation rules:** Pre-defined rules for what the system can auto-fix during execution vs. what requires user approval.
- **Context amendment:** When new context touches completed work, it's tracked as an amendment needing verification — not mixed into current work.
- **Temporal routing:** Classifying context by WHEN it applies — current work, past/completed work, future planned work, or general.

---

## 1. How You Actually Work

Patterns extracted from Auto-chessed, BinanceRepo, cc-marketplace, and blender-explo:

| What You Do | What It Means for mk-flow |
|-------------|---------------------------|
| Write in dense stream-of-consciousness bursts with 5+ items in one message | Intake must decompose without friction |
| Reference things by feel ("highlights are bad") not by class names | Intake must map vague descriptions to codebase locations |
| Jump between building, asking questions, adding context seamlessly | Mode detection must be invisible — no explicit mode switching |
| Need explanations mid-build ("what does X mean?") without losing direction | Questions don't change state or task direction |
| Get frustrated when re-explaining context or when tools lose track | State must persist reliably, session start must be fast |
| Drop thoughts mid-conversation that matter later ("oh and this should also...") | Thoughts must be captured without breaking flow |
| Repeat frustration about the same issue across sessions when it's not addressed | System should ask what the recurring issue is, then scope it properly |
| Work across 4+ projects simultaneously in different domains | Per-project state, no cross-project automation complexity |
| Hate god-objects — split a 4,898-line monolith, flagged 2000-line RunManager | No single skill does everything |
| Architecture before features, enforce patterns mechanically | Plugin architecture, clean skill boundaries |
| Phase-based planning with milestone decomposition | miltiaze decomposes into plans with milestones, ladder-build executes |

---

## 2. Intent Classification — The UserPromptSubmit Hook

### How it works

Every message you send goes through a hook that calls Haiku (~$0.0001/call, 0.5-1.5s) to classify:

```
You type anything
    ↓
Hook runs intent-classifier.py
    ↓
Haiku reads: your message + project's intent config + plan list from STATE.md
    ↓
Returns: { intent, temporal_target, target_hint }
    ↓
Claude sees your message + classification hint
    ↓
CLAUDE.md instructions tell Claude how to handle each intent
```

**Optimization:** Messages under 10 characters skip the classifier (confirmations like "yes", "ok", "continue").

### Default intents

| Intent | What It Detects | What Claude Does |
|--------|----------------|-----------------|
| `action` | "fix", "build", "implement", "add" | Route to execution — ladder-build or direct implementation |
| `question` | "what is", "how does", "explain", "why" | Explain without changing state or task direction |
| `context_addition` | "it should", "remember that", "also", "I want this to" | Classify temporal target, capture to the right place |
| `thought_capture` | "oh and", "idea:", mid-sentence observations | Capture via background agent without interrupting current work |
| `frustration_signal` | "this again", "we talked about", "still broken", "not again" | Ask user to clarify specifically, then add to scoped concerns |
| `status_query` | "where am I", "what's next", "what did we do" | Read STATE.md, show summary |
| `bug_report` | "broken", "doesn't work", "crash", custom signals | Route to note-tracker if available, otherwise STATE.md |

### Extensible per-project

Intents live in `.claude/mk-flow/intents.yaml`:

```yaml
intents:
  action:
    description: "User wants something built, fixed, or implemented"
    signals: ["fix", "build", "implement", "add", "create"]
    route: "execution"
    enabled: true
  bug_report:
    description: "User reporting broken behavior"
    signals: ["broken", "doesn't work", "bug", "messed up"]
    route: "note_tracker_bug"
    enabled: true  # turn off for projects that don't use note-tracker
  # ...

corrections:  # classifier learns from mistakes
  - text: "can't move pieces from inventory"
    was: "feature"
    should_be: "bug_report"
    reason: "functionality exists but is broken"
```

**When starting a new project (`/mk-flow init`):**

```
"What does this project need? Here's what you've used before:

 [x] action          — build/fix/implement requests
 [x] question        — explanations without state change
 [x] context_addition — requirements, forward notes, amendments
 [x] thought_capture  — mid-conversation ideas
 [x] frustration      — repeated complaint escalation
 [x] status           — "where am I?" queries
 [ ] bug_report       — route bugs to note-tracker (used in: Auto-chessed)
 [ ] trade_setup      — trading scenarios (used in: BinanceRepo)

 Select which to enable, or describe a new one."
```

**Architecture engagement — also asked during init:**

```
"Architecture engagement — how involved do you want to be
in architecture decisions?

  ○ High — walk me through decisions with tradeoffs before building
  ○ Medium — flag decisions briefly, quick confirm
  ○ Low — decide silently, document in reports"
```

Stored in `.claude/mk-flow/config.yaml` as `architecture_engagement: high|medium|low`. Changeable anytime.

History comes from a global intent library at `~/.claude/mk-flow/intent-library.yaml` — every intent created in any project is saved there.

**Adding intents naturally:**
```
You: "add an intent for when I'm describing a trade setup"
Claude: "New intent — trade_setup:
  Description: User describing a trading scenario
  Signals: entries, exits, positions, pairs, timeframes
  Route: capture to context/trade-notes/
  Look right?"
You: "yeah"
Claude: *saves to project config + global library*
```

**Modifying intents:**
```
You: "add 'this is wrong' to the frustration intent"
Claude: *updates signals, done*
```

### Classifier correction mechanism

When the classifier gets it wrong:

```
You: "I can't move pieces from the inventory roster"
Claude: *classified as feature* "New feature request..."
You: "no, that's a bug — it's supposed to work"
Claude:
  1. Reclassifies item → bug, re-routes to note-tracker
  2. Records correction in intents.yaml
  3. Haiku sees corrections as few-shot examples next time
```

### Temporal routing for context

When the intent is `context_addition`, the classifier also determines WHERE it belongs:

| Temporal Target | Example | What Happens |
|---|---|---|
| **current_work** | "Make the icons bigger" | Update current milestone requirements |
| **past_work** | "Stat breakdown should also show armor %" | Amendment created, marked NEEDS_AMENDMENT, surfaced at status check |
| **future_work** | "When we get to battle indicators, make them pulse" | Forward-note attached to that plan's context, loaded when work starts |
| **decision_override** | "Forget 2-click, do drag-and-drop" | Original reasoning surfaced ("you chose 2-click because X"). Confirm or reconsider |
| **general** | "Unity 6 has a new UI toolkit" | Saved to memory as reference |

Amendments tracked in STATE.md:

```markdown
## Amendments
| ID | Target | What Changed | Status | Added |
|----|--------|-------------|--------|-------|
| A1 | Stat Foundation (completed) | Add armor reduction % | NEEDS_AMENDMENT | 2026-03-15 |
| A2 | Decision: 2-click swap | User wants drag-and-drop | NEEDS_VERIFICATION | 2026-03-15 |
| A3 | Battle Indicators (future) | Icons should pulse | NOTED | 2026-03-15 |
```

### Verification check on action completion

When Claude completes a milestone, it scans pending items (STATE.md amendments + note-tracker if present):

```
Claude completes: "Grid lines added to inventory board"
Scans: A1 mentions grid lines → "This may address amendment A1.
  Marking NEEDS_VERIFICATION — confirm it's fixed?"
```

Not DONE — NEEDS_VERIFICATION. You confirm or say "still broken."

---

## 3. What to Steal from GSD, What to Skip

### Steal

| Pattern | Adaptation |
|---------|------------|
| STATE.md (living state) | Adopt but lighter — current focus, done, blocked, next, decisions, amendments. Under 50 lines. Updated inside workflows, not via hooks |
| Goal-backward verification | Build into ladder-build: "Does it WORK?" not "Did we DO the steps?" |
| Deviation rules (1-3 auto, 4 stop) | Adopt exactly — auto-fix bugs, auto-add critical missing functionality, STOP for architecture changes |
| .continue-here.md (snapshot) | Adopt as explicit pause format. Written by state skill's pause workflow |
| Locked decisions (CONTEXT.md) | After intake confirmation, decisions are locked. Claude can't freelance on them |
| Atomic commits per task | Formalize the commit format in ladder-build |

### Skip

| Pattern | Why |
|---------|-----|
| 34 commands | 2 skills + hook is enough |
| gsd-tools.cjs (Node.js CLI) | No external runtime. Pure SKILL.md + markdown + Python where needed |
| 12 specialized agent types | 2-3 agent types max: researcher, executor, verifier |
| Stop hook for state capture | **Unreliable** — sessions don't always end cleanly (terminal close, laptop sleep, context overflow). State updates happen inside workflows instead |
| Cross-project auto-sync | **Not worth the complexity.** Manual note in global CLAUDE.md if you want it |
| Nyquist verification | Fold into goal-backward check |
| Model profiles | Manual model selection is fine |
| Numbered phase directories | Use plan slugs |
| Wave-based parallel execution | Sequential with parallel subagents where obvious |

---

## 4. No Phases — miltiaze Decomposes Into Plans With Milestones

**Your hierarchy (simpler than GSD):**

```
miltiaze explores the idea
    ↓
produces exploration report with structured Build Plans section:

| Plan | Goal | Milestones | Depends On |
|------|------|------------|------------|
| Stat Foundation | Inspect any piece's stat breakdown | 4 (M) | None |
| Inventory UI | Rearrange pieces between encounters | 3 (M) | None |
| Battle Indicators | See buffs/debuffs during battle | 3 (S) | Stat Foundation |

Recommended order: Stat Foundation → Inventory UI → Battle Indicators
    ↓
ladder-build kickoff reads this directly as plan structure
    ↓
executes milestone by milestone
```

**What changes:**
- **miltiaze** — exploration report's "Next Steps" becomes a structured Build Plans section when the exploration is build-ready
- **ladder-build kickoff** — accepts either free-form description (current) or structured plans from miltiaze (new). No decomposition from scratch when miltiaze already did it

For larger projects: multiple plans with dependencies, not phases. Each plan has its own milestones. Dependencies tracked in a simple table. Same capability as GSD phases, flatter structure.

---

## 5. State & Session Continuity — No Hooks, In-Workflow

### Why not hooks

Stop hooks don't fire reliably (terminal close, laptop sleep, context overflow, disconnection). GSD had this problem. Instead:

**State updates happen as part of the work:**
- ladder-build's milestone completion step includes "update STATE.md" — it's a line in the workflow, not an afterthought
- miltiaze writes exploration outcomes to STATE.md after saving the report
- intake writes amendments and pending items to STATE.md after confirmation

**Stale state detection at session start:**
- State skill (or CLAUDE.md instruction) checks STATE.md age on first interaction
- If stale: "STATE.md is 3 days old. Last session you were on Phase 9 Battle Status Indicators. Still accurate?" — one question, 5 seconds
- You confirm or correct, then proceed

### STATE.md format

```markdown
# Project State: [project-name]
> Last updated: 2026-03-15

## Current Focus
What I'm actively working on (1-2 sentences)

## Done (Recent)
- [x] Milestone/plan completed — key outcome
- [x] Milestone/plan completed — key outcome

## Blocked / Open Questions
- [ ] Blocker description — what's needed to unblock

## Next Up
- [ ] Next milestone — brief description

## Decisions Made
| Decision | Reasoning | Date |
|----------|-----------|------|
| 2-click swap model | OnGUI drag unreliable across scroll views | 2026-03-12 |

## Amendments
| ID | Target | What Changed | Status | Added |
|----|--------|-------------|--------|-------|
| A1 | Stat Foundation | Add armor reduction % | NEEDS_AMENDMENT | 2026-03-15 |

## Context for Future Me
Anything that would take 5+ minutes to re-derive.
```

Under 50 lines. Updated inside workflows. Git-tracked.

### Note-tracker as optional context source

If the project has note-tracker set up:
- Intake routes bugs/questions there
- Session start pulls open items ("you have 3 open bugs, 2 pending questions")
- Verification checks scan it for items that may have been addressed

If no note-tracker: everything stays in STATE.md and memory. mk-flow works either way.

### Cross-project

No automatic sync. If you want cross-project awareness, manually maintain a line in `~/.claude/CLAUDE.md`. Or just switch projects when you need context. The automatic version adds complexity for marginal value.

---

## 6. Mode Detection — Seamless Switching

This is CLAUDE.md instructions + intent classifier, not a skill:

```
You: "build the status indicators"     → action, execution mode
You: "wait what's a billboard shader"  → question, explain without state change
You: "oh also health bars should pulse" → thought_capture, background capture
You: "ok continue"                     → action, resume execution
You: "where are we"                    → status, read STATE.md
You: "this again with the highlights"  → frustration, ask to clarify then scope
```

No explicit mode switching. No `/intake` or `/state status` needed. You just talk. The hook + CLAUDE.md instructions route correctly.

**Free discussion:** When you need explanations mid-build, the system explains without changing state, losing direction, or treating it as a new task. Questions are pauses, not redirects.

**Auto-save rule (CLAUDE.md instruction):** "If you generate analysis longer than ~50 lines, save it to `context/notes/` before continuing." Prevents losing significant explanations to context compaction.

---

## 7. Architecture

```
mk-flow plugin (NEW)
├── .claude-plugin/plugin.json
├── scripts/
│   ├── intent-classifier.py        ← Haiku classifier for UserPromptSubmit hook
│   ├── init.py                     ← Project setup: creates .claude/, STATE.md, intents.yaml
│   └── intent-library.py           ← Global intent library management
├── skills/
│   ├── intake/
│   │   ├── SKILL.md                ← Decompose any input → structured items
│   │   ├── references/
│   │   │   └── parsing-rules.md    ← Type extraction, assumption surfacing, temporal routing
│   │   └── templates/
│   │       └── assumption-table.md
│   └── state/
│       ├── SKILL.md                ← Per-project state management + session continuity
│       ├── workflows/
│       │   ├── status.md           ← "Where am I?" — read STATE.md + note-tracker, show summary
│       │   ├── pause.md            ← Write .continue-here.md snapshot
│       │   └── resume.md           ← Read snapshot, restore context, route to next action
│       └── templates/
│           ├── state.md            ← STATE.md format
│           └── continue-here.md    ← Handoff format
├── hooks/                          ← Hook configs for project setup
│   └── settings-template.json      ← UserPromptSubmit hook config
└── intent-library/
    └── defaults.yaml               ← Default intents shipped with mk-flow
```

**Enhancements to existing skills:**

| Skill | Change | Why |
|-------|--------|-----|
| miltiaze | Structured "Build Plans" output in exploration report | Feeds directly into ladder-build kickoff |
| ladder-build kickoff | Accept miltiaze's structured plans | No re-decomposition |
| ladder-build build-milestone | STATE.md update step + deviation rules + goal-backward verification + amendment scan | Core execution improvements |
| ladder-build continue | Read STATE.md and .continue-here.md for context | Session resume |
| note-tracker | Bulk item acceptance from intake | Multiple bugs/questions in one call |

---

## 8. Build Sequence

| Order | What | Value | Effort |
|-------|------|-------|--------|
| 1 | **Intake skill** — assumption table, multi-issue decomposition, routing | Immediate — handles your dense input today | M |
| 2 | **Intent classifier hook** — Haiku-based, extensible intents.yaml, project init | Automatic mode detection, no explicit invocation needed | M |
| 3 | **State skill** — STATE.md management, status/pause/resume workflows | Session continuity | M |
| 4 | **Ladder-build enhancements** — deviation rules, STATE.md, goal-backward verification, amendment scan | Execution quality | M |
| 5 | **miltiaze → ladder-build handoff** — structured Build Plans output, kickoff accepts it | End-to-end flow from exploration to execution | S |
| 6 | **Note-tracker integration** — bulk item acceptance, context source for session start | Full ecosystem connection | S |
| 7 | **Classifier correction + learning** — "no that was a bug" updates intents.yaml | Improves over time | S |

**MVP = Steps 1-3.** Intake + hook + state. Everything else builds on that foundation.

---

## 9. Tooltips — Contextual Discoverability

Single-line `💡` hints appear at relevant moments to teach what's available. They fade after 3 appearances per tooltip (tracked in config). "show tips again" resets all.

Tooltip moments: first session, after assumption table, after routing, during quiet build stretches, when amendments pile up, first thought capture, first frustration detection, architecture engagement reminders.

Rules: one line max, never blocks flow, only at the moment it's relevant, fade out after user has learned it.

Full examples in `artifacts/explorations/2026-03-15-mk-flow-ux-reference.md`.

---

## 10. Context Handoff — Fresh Start With Zero Loss

When context gets heavy or a natural checkpoint is reached (milestone complete, plan boundary), the system proactively suggests clearing context and gives an exact command to resume:

```
"Good stopping point — Milestone 3 complete. Context is
getting heavy. I recommend starting fresh. Run:

  /ladder-build continue mk-flow — just finished Milestone 3
  (intent classifier hook). Next: Milestone 4 (State skill).
  Read BUILD-PLAN.md at artifacts/builds/mk-flow/ and
  milestone reports 1-3 for full context.

  STATE.md and BUILD-PLAN.md are up to date."
```

**When this triggers:**
- After completing a milestone when context usage is high (~70%+)
- At plan boundaries (finishing one plan, starting the next)
- When the user says "pause" or ends a session
- When the system detects it's repeating itself or losing precision

**What the command includes:**
- Which skill to invoke and how
- What was just completed
- What's next
- Which files to read for full context
- Confirmation that state files are current

**The key:** STATE.md + BUILD-PLAN.md + milestone reports contain everything. The fresh session reads those files and has full context without needing the previous conversation. The command is copy-paste ready — no manual assembly.

---

## 11. Explicit Commands (Always Available)

These work anytime, regardless of what mode you're in:

| Command | What It Does |
|---------|-------------|
| "what can I do?" | Show all available actions for current project context |
| "show amendments" | List all pending amendments with status |
| "show notes" | List captured thoughts and forward-notes |
| "show status" / "where am I?" | Full STATE.md summary + note-tracker open items |
| "set architecture engagement to X" | Change engagement level (high/medium/low) |
| "add intent for X" | Create new intent type |
| "add X to Y intent" | Add signals to existing intent |
| "show tips again" | Reset tooltip fade counters |
| "remember that X" | Save to Claude Code memory (user/feedback/project/reference type auto-detected) |
| "pause" | Write .continue-here.md snapshot for session break |

These are not skills or slash commands — they're natural language that the intent classifier + CLAUDE.md instructions recognize. No syntax to memorize.

---

## 11. Future-Proofing — How This Grows

The system is designed to extend without restructuring:

| Want to add... | How |
|---|---|
| New intent type | "add an intent for X" → saved to project + global library |
| New signals to existing intent | "add X to Y intent" → updates intents.yaml |
| New skill entirely | Add a skill folder to mk-flow plugin (P1 pattern). Hook + CLAUDE.md reference it |
| Note-tracker to a project that didn't have it | Install note-tracker plugin, enable `bug_report` intent, intake auto-routes |
| New project | `/mk-flow init` — pick from history, configure, done |
| Different architecture engagement per phase | "set architecture engagement to high for this plan" |

The extensibility comes from three layers:
1. **Intent config (YAML)** — add/modify/remove intents without touching code
2. **Plugin architecture (P1 pattern)** — add skills by adding folders
3. **CLAUDE.md conventions** — add behavioral rules by adding lines

Nothing is hardcoded. Everything is configurable.

---

## 12. Handling Previous Explorations — miltiaze Context Awareness

When miltiaze starts a new exploration, it should check:

1. **`artifacts/explorations/`** — has this topic been explored before? If so, load the previous exploration as context. "You explored a similar topic on 2026-03-14. Want to build on that or start fresh?"
2. **STATE.md** — is there active work related to this exploration topic? If so, surface it.
3. **Note-tracker** (if present) — are there open questions or bugs related to this topic?

This prevents the "gsd finds no context for stuff already discussed" problem. miltiaze checks before exploring, not after.

---

## 13. Larger Project Scaling

For projects that need more structure than a single plan with milestones:

**Multiple plans with explicit dependencies:**

```markdown
## Build Plans (from miltiaze exploration)

| Plan | Goal | Milestones | Depends On | Status |
|------|------|------------|------------|--------|
| Auth System | Users can log in and manage accounts | 5 (L) | None | Not Started |
| Data Layer | API endpoints for all CRUD operations | 4 (M) | Auth System | Not Started |
| Frontend | User-facing pages and interactions | 6 (L) | Data Layer | Not Started |
| Integration | End-to-end flows work correctly | 3 (M) | Frontend | Not Started |
```

**ladder-build handles this by:**
- Reading the dependency table before starting each plan
- Refusing to start a plan whose dependencies aren't complete
- Updating STATE.md with plan-level progress (not just milestone-level)
- Each plan gets its own BUILD-PLAN.md in `artifacts/builds/[project]/[plan-slug]/`

This scales to any project size without introducing "phases" as a separate concept. Plans ARE the units. Milestones are the steps within each plan.

---

## 14. Init — What Gets Created

`/mk-flow init` creates exactly these files:

```
your-project/
├── .claude/
│   ├── settings.json              ← UserPromptSubmit hook config
│   └── mk-flow/
│       ├── config.yaml            ← architecture_engagement, tooltip counters
│       └── intents.yaml           ← selected intents + corrections log
├── context/
│   ├── STATE.md                   ← initial template (empty sections)
│   └── notes/                     ← auto-saved analysis, forward-notes
└── .gitignore                     ← adds .claude/mk-flow/config.yaml (local prefs)
```

**What gets git-tracked:**
- `context/STATE.md` — shared state, visible in history
- `context/notes/` — captured thoughts and analysis
- `.claude/settings.json` — hook config (team members get the same hooks)
- `.claude/mk-flow/intents.yaml` — intent definitions (shared across collaborators)

**What stays local (gitignored):**
- `.claude/mk-flow/config.yaml` — personal preferences (engagement level, tooltip counts)

---

## 15. What This Does NOT Do

Being explicit about scope:

- **Does not replace GSD** for projects already using it. Use GSD for big projects where it's working, mk-flow for everything else or alongside GSD for intake/intent features
- **Does not auto-sync across projects.** Each project is independent. Cross-project awareness is manual
- **Does not use Stop hooks for state capture.** Unreliable. State updates are in workflows
- **Does not make note-tracker mandatory.** It's an optional context source. mk-flow works without it
- **Does not have phases.** Plans with milestones. Flatter is better
- **Does not add external runtime dependencies.** Pure SKILL.md + markdown + Python scripts (Haiku API call in classifier is the only external dependency)
- **Is not magic.** The "passive" detection is a hook + CLAUDE.md instructions. It works because Claude follows instructions consistently, not because of background processes

---

## Sources

- [7 Prompt UX Patterns — Assumption Surfacing (Mario Hayashi)](https://blog.mariohayashi.com/p/7-prompt-ux-patterns-to-help-you) — accessed 2026-03-14
- [Intent Preview Pattern (aiuxdesign.guide)](https://www.aiuxdesign.guide/patterns/intent-preview) — accessed 2026-03-14
- [Designing for Agentic AI (Smashing Magazine)](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/) — accessed 2026-03-14
- [Augment Code: Automating Feedback with AI Agents](https://www.augmentcode.com/blog/automating-customer-feedback-and-support-with-ai-agents) — accessed 2026-03-14
- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory) — accessed 2026-03-14
- [Claude Code Common Workflows](https://code.claude.com/docs/en/common-workflows) — accessed 2026-03-14
- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — accessed 2026-03-14
- [PatternFly Conversation Design Guidelines](https://www.patternfly.org/patternfly-ai/conversation-design/) — accessed 2026-03-14
- [Prompt Augmentation (Jakob Nielsen)](https://jakobnielsenphd.substack.com/p/prompt-augmentation) — accessed 2026-03-14
- [Continuous Claude v3 — Session Continuity Framework](https://github.com/parcadei/Continuous-Claude-v3) — accessed 2026-03-14
- [Claude GitHub Triage Bot](https://github.com/chhoumann/claude-github-triage) — accessed 2026-03-14
- [Mother CLAUDE: Session Handoffs](https://dev.to/dorothyjb/session-handoffs-giving-your-ai-assistant-memory-that-actually-persists-je9) — accessed 2026-03-14
