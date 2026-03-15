# Exploration: Unified Workflow System — Your Flavor

> **TL;DR:** You already have 80% of the pieces — miltiaze for research, ladder-build for incremental delivery, note-tracker for persistence, repo-audit for governance. The missing 20% is the glue: an **intake layer** that understands messy, multi-issue input without friction, a **state layer** that tracks where you are across sessions and projects, and **connective wiring** so context flows between skills without you re-explaining. The recommended path is a new `mk-flow` plugin with two focused skills (intake + state) plus targeted enhancements to your existing skills — stealing GSD's best patterns (STATE.md, goal-backward verification, deviation rules, atomic commits) while keeping your plugin architecture and avoiding GSD's 34-command sprawl.

---

### Key Terms

- **Intake parsing:** Decomposing messy, free-form user input into structured, actionable items (bugs, features, questions, constraints) with explicit assumptions.
- **Assumption table:** A UX pattern where the system states what it understood and lets the user correct, rather than asking 10 clarifying questions.
- **Goal-backward verification:** Checking that goals are actually achieved, not just that tasks were completed. "Does it work?" not "Did we do the steps?"
- **Deviation rules:** Pre-defined rules for what the system can auto-fix during execution vs. what requires user approval.
- **Living document:** A state file updated after every significant action (always current, but write-heavy).
- **Snapshot handoff:** A state file written at pause points (lighter weight, but stale between snapshots).
- **Context decay:** Loss of working memory across sessions, context compaction, or project switches.

---

## 1. How You Actually Work: Patterns Across 4 Projects

Research across cc-marketplace, BinanceRepo, blender-explo, and Auto-chessed reveals a consistent working identity:

**You are an architecture-first systems builder** who works across wildly different domains simultaneously (ML trading, 3D game dev, plugin ecosystems, portfolio sites) with a common methodology:

| Pattern | Evidence | Implication for Workflow System |
|---------|----------|---------------------------------|
| Phase-based planning | All projects use milestone/phase decomposition | System must support phases natively |
| Dense, multi-issue communication | Auto-chessed bug report with 8+ items in one message | Intake parsing is non-negotiable |
| Cross-cutting integrity | repo-audit enforcement, CLAUDE.md change-impact maps | System must prevent inconsistency across skills |
| State tracking obsession | STATE.md in BinanceRepo + Auto-chessed, CONTEXT.md per phase | Session continuity must be first-class |
| Architecture before features | 3-layer separation in Auto-chessed, pipeline ABCs in BinanceRepo | System architecture must be clean or you won't trust it |
| God-object allergies | Split 4,898-line monolith, RunManager at 2000 LOC flagged as risk | No single-skill-does-everything approach |
| Named constants, no magic | Enforced across all projects | System conventions must be explicit, not implicit |
| Atomic commits per task | Conventional commit format with phase/plan scope | Execution model should produce traceable commits |
| Decision logging | Key Decisions tables in PROJECT.md, amendment records | Decisions must be persisted, not lost in chat |

**Communication style:** You write in **stream-of-consciousness bursts** that pack multiple concerns (bugs, features, constraints, context) into a single message. You expect the system to decompose this, not ask you to restructure it. You reference things by how they look and feel ("highlights are bad", "pieces rotate on their own"), not by class names.

**What frustrates you:** Having to re-explain context. Having tools that don't understand the difference between "in a battle" and "not in a battle." Systems that ask too many questions before doing anything.

**Bottom line:** Your workflow system must handle dense input, maintain state obsessively, enforce consistency, and stay modular — because that's how YOU work.

---

## 2. User Intent & Context Parsing: The Hardest Problem

Your example message is the perfect test case. It contains:

```
"animations don't work"                    → BUG (vague — which animations?)
"highlights are bad"                       → BUG (subjective — needs clarification)
"pieces rotate on their own"              → BUG (specific behavior)
"many don't reset"                        → BUG (partial — "many" implies some do)
"highlights stay open after game finishes" → BUG (specific lifecycle issue)
"can't move pieces from inventory roster"  → FEATURE REQUEST
"missing grid lines and board colors"      → MISSING UI
"keep them the way i set them"            → FEATURE (persistence requirement)
"if in battle, save for future"           → CONSTRAINT (conditional behavior)
```

That's **5 bugs, 1 feature request, 1 UI gap, and 1 behavioral constraint** — all in one message. The system needs to handle this without friction.

### What the research found works

**The Assumption Table pattern** (Mario Hayashi) is the winner for your style. Instead of asking 8 questions, the system decomposes and presents:

```
Here's what I understood. Correct anything that's wrong:

| # | Type       | Item                              | Where               | Assumption                          |
|---|------------|-----------------------------------|----------------------|-------------------------------------|
| 1 | Bug        | Animations broken                 | Board/battle view    | All piece animations, not specific  |
| 2 | Bug        | Highlights rendering poorly       | Board cells          | Selection/hover highlights          |
| 3 | Bug        | Pieces auto-rotate                | Board during battle  | Should only rotate on manual action |
| 4 | Bug        | Pieces don't reset                | Between encounters   | State should clear between battles  |
| 5 | Bug        | Highlights persist after game end | Post-battle cleanup  | Should clear on GameOver state      |
| 6 | Feature    | Move pieces from inventory roster | Inventory/Roster tab | Drag or click-to-place              |
| 7 | Missing UI | Grid lines + board colors         | Inventory mini-board | Should match main board style       |
| 8 | Feature    | Persist inventory layout          | Across encounters    | Save piece positions for future     |
| 9 | Constraint | Battle vs non-battle context      | State management     | Non-battle: apply now. Battle: save |
```

One round-trip for the happy path. The user scans, says "3 is wrong — rotation should happen on placement, not during combat" or "looks good," and the system proceeds.

### Why this beats alternatives

| Approach | Friction | Accuracy | Your Fit |
|----------|----------|----------|----------|
| Ask 8 questions sequentially | High — you'll abandon it | High | Terrible — goes against your stream-of-consciousness style |
| Free-form parse and just start working | None | Low — will miss nuance | Risky — wastes time on wrong assumptions |
| **Assumption table (decompose + confirm)** | **One round-trip** | **High — user corrects only what's wrong** | **Perfect — matches your "dense input, quick correction" pattern** |
| Inline annotation (echo original with tags) | Low | Medium | Good but cluttered for 8+ items |

### Implementation insight

The decomposition should happen as a **structured extraction step** before any routing. The skill reads the user's message, identifies the project context (which project? which screen? what state?), and extracts items with types, locations, and assumptions. If it CAN'T determine the project/screen context, it shows its assumptions AND asks — but it asks smart, not dumb ("I'm assuming this is about the Auto-chessed board view during battle — correct?" not "What project are you working on?").

**Bottom line:** The assumption table pattern is non-negotiable for your workflow. One decompose, one confirm, then route to the right skills.

---

## 3. Prior Art & Lessons from GSD: What to Steal, What to Skip

GSD (v1.22.4, installed in your environment) is a 34-command, 12-agent orchestration framework. It does some things brilliantly and some things at enterprise scale you don't need.

### Steal These

| GSD Pattern | Why It's Good | Your Adaptation |
|-------------|---------------|-----------------|
| **STATE.md** (living state file) | Single source of truth for "where am I" — updated after every action | Adopt but lighter: current work, done, blocked, next, recent decisions. Skip velocity metrics and progress bars |
| **Goal-backward verification** | "Does it WORK?" not "Did we DO the steps?" — catches stubs and half-implementations | Build into ladder-build's verification step. After each milestone, check observable behavior |
| **Deviation rules (1-3 auto, 4 stop)** | Clear decision tree: auto-fix bugs, auto-add missing critical stuff, STOP for architecture changes | Adopt exactly. Reduces "should I ask?" paralysis during execution |
| **.continue-here.md** (snapshot handoff) | Structured pause point with current state, completed work, remaining, blockers, mental context | Adopt as your session continuity format. Write on pause, read on resume |
| **Atomic commits per task** | `feat(phase-plan): description` — traceable, rollable, clean history | You already do this. Formalize the format |
| **CONTEXT.md** (locked decisions) | User says "use library X" → task MUST use X. Prevents Claude from freelancing | Adopt for ladder-build. After intake, lock decisions before building |
| **Requirement traceability** | Every requirement maps to exactly one phase — enables coverage validation | Adopt lightly. Your note-tracker could track which items are addressed by which milestones |

### Skip These

| GSD Pattern | Why You Don't Need It | What to Do Instead |
|-------------|----------------------|-------------------|
| 34 commands | Cognitive overload. You won't remember `/gsd:plan-milestone-gaps` vs `/gsd:validate-phase` | 4-6 entry points max. Let routing handle the rest |
| 12 specialized agent types | Overkill for solo dev. Spawning gsd-planner, gsd-plan-checker, gsd-verifier for a 3-task plan is wasteful | 2-3 agent types: researcher, executor, verifier |
| gsd-tools.cjs (Node.js CLI) | External runtime dependency. Fragile. You use Python | State management in pure markdown + Python scripts if needed |
| Nyquist verification (read-only audit) | Interesting concept but adds a whole verification pass | Fold into goal-backward check at milestone completion |
| Model profiles (quality/balanced/budget) | You already know when to use Opus vs Sonnet | Skip entirely — manual model selection is fine |
| Wave-based parallel execution | Useful for large teams, overkill for solo | Sequential plans with parallel subagents where obvious |
| Numbered phase directories (01-phase-name/) | Rigid. Inserting/removing phases requires renumbering | Use slugs or flexible identifiers |

### The Sweet Spot

GSD's core insight is right: **plans are prompts, not documents.** A well-structured plan file IS the execution context. Your ladder-build already does this with BUILD-PLAN.md and milestone reports. The gap is that ladder-build doesn't have STATE.md for cross-session continuity or deviation rules for autonomous execution.

**Bottom line:** Steal STATE.md, goal-backward verification, deviation rules, .continue-here.md, and locked decisions. Skip the 34-command sprawl, the Node.js tooling, and the verification ceremony.

---

## 4. Integration: Connecting Your Existing Skills

Your current skill ecosystem has strong individual pieces with weak connections:

```
miltiaze ──explores──> exploration report ──manual handoff──> ladder-build
                                                                    │
                                                              builds milestones
                                                                    │
note-tracker ──tracks──> project-notes/tracker.xlsx    ◄────── no connection
                                                                    │
repo-audit ──enforces──> amendment records              ◄────── no connection
                                                                    │
schema-scout ──analyzes──> data files                   ◄────── standalone
```

### The Gaps

1. **miltiaze → ladder-build handoff** exists conceptually (miltiaze's workflow mentions it) but there's no structured handoff format. The exploration report is a markdown file that ladder-build doesn't know how to consume.

2. **note-tracker is isolated.** Bugs found during ladder-build execution don't automatically land in note-tracker. Questions that arise during miltiaze exploration don't get tracked. It's a silo.

3. **No project-level state.** Each skill operates in its own context. There's no "what's the current project status across all skills?" view.

4. **No intake layer.** Every skill has its own `<intake>` section that handles input differently. There's no unified "understand what the user wants, then route" layer.

5. **repo-audit is governance, not workflow.** It enforces change protocols but doesn't participate in the planning/execution lifecycle.

### What the Glue Looks Like

```
USER INPUT (messy, multi-issue, any format)
        │
    ┌───▼───┐
    │ INTAKE │ ← Decompose, extract, show assumptions, confirm
    └───┬───┘
        │ structured items (bugs, features, ideas, questions)
        ├──── bugs/questions ──────────> note-tracker (track + research)
        ├──── ideas/exploration ───────> miltiaze (explore dimensions)
        ├──── build requests ──────────> ladder-build (plan + execute)
        └──── state queries ───────────> state skill (where am I?)
                                              │
                                        ┌─────▼─────┐
                                        │  STATE.md  │ ← Per-project, cross-skill
                                        └───────────┘
```

The key principle: **intake normalizes, skills specialize, state persists.**

**Bottom line:** The connective tissue is an intake layer that routes to existing skills + a state layer that all skills read/write.

---

## 5. State & Session Continuity: Never Lose Context

### The Problem Across Your Projects

| Project | Current State Tracking | Gap |
|---------|----------------------|-----|
| cc-marketplace | CLAUDE.md + amendment records | No "what am I working on" state |
| BinanceRepo | GSD STATE.md + .planning/ directory | Best of the four — full GSD integration |
| blender-explo | chess-piece-workflow.md (manual notes) | No structured state at all |
| Auto-chessed | GSD STATE.md + .planning/ directory | Good but GSD-dependent |

### What the Research Found

All major tools (Claude Code, Cursor, Windsurf, Aider) struggle with this. The emerging consensus is a **three-tier model**:

| Tier | What | Updated When | Loaded When |
|------|------|-------------|-------------|
| **Hot** (always loaded) | CLAUDE.md — project rules, architecture, conventions | Rarely (on architectural changes) | Every session start |
| **Warm** (living state) | STATE.md — current work, done, blocked, next, decisions | After significant events | Every session start |
| **Cold** (snapshots) | .continue-here.md — full context dump at pause points | At pause/switch/end-of-day | On explicit resume |

This maps perfectly to what GSD does, but GSD updates STATE.md too aggressively (after every single action). For your style, updating after **completed milestones, significant decisions, and blockers** is enough.

### Your State File Format

Based on how you actually work, a STATE.md should contain:

```markdown
# Project State: [project-name]
> Last updated: 2026-03-14

## Current Focus
What I'm actively working on (1-2 sentences)

## Done (Recent)
- [x] Phase/milestone completed — key outcome
- [x] Phase/milestone completed — key outcome

## Blocked / Open Questions
- [ ] Blocker description — what's needed to unblock
- [ ] Open question — who/what can answer

## Next Up
- [ ] Next milestone/task — brief description
- [ ] After that — brief description

## Decisions Made
| Decision | Reasoning | Date |
|----------|-----------|------|
| Used X instead of Y | Because Z | 2026-03-14 |

## Context for Future Me
Anything that would take 5+ minutes to re-derive.
Architecture constraints, gotchas found, approaches tried and rejected.
```

### Cross-Project State

You work on 4 projects. When you open Claude Code, the system should know which project you're in (from cwd) and load that project's state. But you also need a **cross-project view** — something in your global Claude Code memory that tracks:

```
Active projects:
- Auto-chessed: Phase 9 (Battle Status Indicators) — ready to execute
- BinanceRepo: v1.0 complete, Phase 6 blocked on regression target decision
- cc-marketplace: building workflow system (this exploration)
- blender-explo: chess piece set — Bronze/Iron/Steel skins in progress
```

This lives in Claude Code's auto memory (`~/.claude/projects/*/memory/`), not in any project repo.

**Bottom line:** Three-tier state (hot/warm/cold) with project-level STATE.md and cross-project tracking in Claude Code memory.

---

## 6. Architecture & Design Decisions

### The Core Question: How Many New Skills?

| Approach | Pros | Cons | Your Fit |
|----------|------|------|----------|
| One god-skill that does everything | Maximum integration | Violates your anti-god-object principle. Hard to maintain | Bad — you split a 4,898-line monolith for a reason |
| 5 new skills (intake, state, execute, verify, route) | Maximum separation | Too many moving parts. Recreates GSD's 34-command problem | Bad — cognitive overload |
| **2 new skills (intake + state) + enhanced existing** | Clean boundaries, minimal new surface | Requires coordinating enhancements across existing skills | **Good — matches your plugin architecture** |
| 0 new skills (conventions only) | Fastest to ship | No enforcement, relies on discipline, no real intake parsing | Medium — works short-term but won't scale |

### Recommended Architecture

```
mk-flow plugin (NEW)
├── .claude-plugin/plugin.json
├── skills/
│   ├── intake/
│   │   └── SKILL.md          ← Decompose any input → structured items
│   │   └── references/
│   │       └── parsing-rules.md   ← How to extract types, assumptions, context
│   │   └── templates/
│   │       └── assumption-table.md
│   └── state/
│       └── SKILL.md          ← Per-project state management + session continuity
│       └── workflows/
│           ├── status.md     ← "Where am I?" — read STATE.md, show summary
│           ├── pause.md      ← Write .continue-here.md snapshot
│           └── resume.md     ← Read snapshot, restore context, route to next action
│       └── templates/
│           ├── state.md      ← STATE.md format
│           └── continue-here.md  ← Handoff format
```

### Key Design Decisions

| Decision | Recommendation | Reasoning |
|----------|---------------|-----------|
| Intake as separate skill vs built into each skill | **Separate skill** | One place to maintain parsing logic. Skills receive clean, structured input |
| State per-project vs global | **Per-project** (STATE.md in project root or .claude/) | Projects have different lifecycles. Global state would be noisy |
| State format: YAML frontmatter vs pure markdown | **Pure markdown with consistent headers** | Readable by humans, parseable by Claude, no tooling needed |
| Where state lives: `.planning/` vs `.claude/` vs project root | **`context/` directory in project root** | Visible, git-trackable, not hidden. `.planning/` is GSD-specific |
| How intake routes: explicit routing table vs LLM judgment | **LLM judgment with routing hints** | Your input is too varied for a static routing table |
| Note-tracker integration: merge into intake or keep separate | **Keep separate, intake routes TO it** | Note-tracker has its own persistence (Excel). Intake handles decomposition only |

### What Changes in Existing Skills

| Skill | Enhancement | Effort |
|-------|-------------|--------|
| **miltiaze** | Accept structured items from intake (not just free text). Write exploration summary to STATE.md | S |
| **ladder-build** | Read STATE.md on continue. Write milestone completions to STATE.md. Add deviation rules to build-milestone workflow | M |
| **note-tracker** | Accept bulk items from intake (multiple bugs/questions at once). Add status sync with STATE.md | M |
| **repo-audit** | No changes needed — it's governance, not workflow | - |
| **schema-scout** | No changes needed — standalone utility | - |

**Bottom line:** Two new skills in a new plugin, targeted enhancements to 3 existing skills. No god-skills, no sprawl.

---

## 7. Implementation Approach: What to Build First

### Build Sequence (Value-First)

**Phase 1: Intake Skill** (delivers value immediately)
- Build the assumption table pattern
- Handle multi-issue decomposition
- Show understanding back to user before acting
- Route to existing skills
- This is the highest-friction gap today

**Phase 2: State Skill** (enables continuity)
- STATE.md format and read/write logic
- `status` workflow — "where am I?"
- `pause` workflow — write .continue-here.md
- `resume` workflow — read snapshot, restore context

**Phase 3: Skill Enhancements** (connects everything)
- ladder-build reads/writes STATE.md
- note-tracker accepts bulk items from intake
- miltiaze writes exploration outcomes to STATE.md

**Phase 4: Deviation Rules + Goal-Backward Verification** (quality layer)
- Add deviation rules to ladder-build execution
- Add goal-backward check at milestone completion
- Add locked decisions from intake confirmation

### What the MVP Looks Like

The MVP is **Phase 1 alone** — the intake skill. Even without state management, having a skill that decomposes "you've messed shit up, animations don't work, highlights are bad..." into a structured assumption table and routes to the right skills is immediately valuable. You can manually track state until Phase 2.

**Bottom line:** Intake first (highest pain, immediate value), state second (enables continuity), enhancements third (connects everything).

---

## 8. Edge Cases & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **System that manages systems trap** — spending more time maintaining workflow tools than doing actual work | High | MVP mindset. Intake + state, nothing more. If a feature doesn't save time in the first week, cut it |
| **Context window bloat** — STATE.md + intake output + skill content eating tokens | Medium | Keep STATE.md under 50 lines. Intake output is consumed and discarded after routing. Use progressive disclosure |
| **State file staleness** — forgetting to update STATE.md, then resuming from stale state | Medium | Timestamp everything. On resume, compare STATE.md timestamp against last git commit. If stale, warn |
| **Over-parsing user input** — decomposing a simple "fix the button" into 5 structured items | Low | Intake skill should detect simple vs complex input. Simple input skips the assumption table |
| **Plugin sprawl** — mk-flow becomes another plugin to maintain across the marketplace | Low | Keep it in the same repo. It's a tool for you, not a product for others (yet) |
| **Skill coordination failures** — intake routes to note-tracker but note-tracker doesn't understand the format | Medium | Define a shared item schema (type, title, description, context, assumptions) that all skills accept |
| **GSD conflict** — two state management systems fighting (GSD STATE.md vs mk-flow STATE.md) | Medium | For projects using GSD, mk-flow defers to GSD's state. mk-flow is for projects WITHOUT GSD |

**Bottom line:** The biggest risk is over-engineering. Start with intake, prove value, then expand.

---

## Solutions

### Solution A: "mk-flow" — New Plugin with Intake + State Skills

**What it is:** A new plugin (`mk-flow`) with two focused skills — `intake` (decompose any input into structured items with assumption surfacing) and `state` (per-project state tracking with pause/resume). Plus targeted enhancements to ladder-build, note-tracker, and miltiaze.

**Why it works:** Matches your plugin architecture pattern (P1). Clean separation of concerns (intake parses, state persists, existing skills execute). No god-skill. Each piece is independently useful.

**Key components:**
- `intake` skill — assumption table pattern, multi-issue decomposition, smart routing
- `state` skill — STATE.md management, pause/resume workflows, cross-project awareness
- Enhanced `ladder-build` — deviation rules, STATE.md integration, goal-backward verification
- Enhanced `note-tracker` — bulk item acceptance from intake, status sync
- Enhanced `miltiaze` — writes exploration outcomes to state

**Dependencies:** Your existing plugin marketplace infrastructure. No external tools or runtimes.

**Pitfalls:**
- Coordinating enhancements across 3 existing skills requires cross-cutting changes (amendment records needed)
- Intake routing accuracy depends on LLM judgment — may misroute edge cases
- Two-skill plugin may feel "not enough" but resist the urge to add more

**Hard limits:** Can't solve context window limits. Claude Code's ~200K effective window is the ceiling regardless. State files help but don't eliminate the constraint.

**Effort:** L — 2 new skills + 3 skill enhancements + testing across projects

---

### Solution B: "Enhanced Ecosystem" — No New Plugins, Convention-Driven

**What it is:** Add intake parsing and state awareness to existing skills through conventions and enhanced `<intake>` sections. No new plugins. A shared reference file (`references/shared-conventions.md`) defines the STATE.md format, item schema, and handoff format that all skills follow.

**Why it works:** Fastest to ship. Leverages existing skill infrastructure. No new installation or marketplace registration. Each skill independently evolves.

**Key components:**
- Shared `references/shared-conventions.md` — STATE.md format, item schema, handoff format
- Enhanced `<intake>` in each skill — adds assumption table logic per-skill
- `continue` workflow added to ladder-build — session resume
- `status` workflow added to ladder-build — "where am I?" using STATE.md
- note-tracker gets `bulk-import` workflow for multi-item intake

**Dependencies:** None beyond current infrastructure.

**Pitfalls:**
- Intake parsing logic duplicated across skills (each skill parses independently)
- Convention compliance is not enforced (no pre-commit hook for STATE.md format)
- "Where am I?" view is buried inside ladder-build rather than being a first-class concern
- Harder to maintain consistency as skills evolve independently

**Hard limits:** Without a unified intake layer, each skill will develop its own parsing quirks. Your dense, multi-issue messages will get interpreted differently by different skills.

**Effort:** M — enhancements to 4 existing skills + 1 shared reference file

---

### Solution C: "The Hybrid" — One New Skill + Enhanced Note-Tracker as Backbone

**What it is:** One new `intake` skill (standalone, not in a plugin) that handles all input decomposition and routing. Note-tracker evolves into the persistence backbone — all structured items (bugs, features, questions, decisions) land in tracker.xlsx. State tracking piggybacks on note-tracker's existing Excel infrastructure.

**Why it works:** Note-tracker already has persistence (Excel I/O), status tracking, and background research. Expanding it to handle state means one fewer new skill to build. Intake stays focused on parsing.

**Key components:**
- New `intake` skill — assumption table, decomposition, routing
- Enhanced `note-tracker` — becomes the "memory" layer: tracks items, state, decisions, milestones
- Enhanced tracker.py — new sheets for state tracking, decision log, milestone status
- ladder-build reads/writes state through note-tracker API

**Dependencies:** openpyxl (already a dependency), tracker.py script expansion.

**Pitfalls:**
- Excel as a state store is fragile for structured data (cell formatting, merge conflicts, corruption)
- note-tracker becomes a god-skill by absorbing state management
- Couples state to Excel format — harder to migrate later
- tracker.py becomes a bottleneck — every state read/write goes through it

**Hard limits:** Excel is not designed for rapid, frequent state updates. Opening/closing .xlsx files for every state write adds latency and corruption risk.

**Effort:** M — 1 new skill + significant note-tracker expansion

---

### Solutions Compared

| Aspect | A: mk-flow Plugin | B: Enhanced Ecosystem | C: Hybrid (Intake + Note-Tracker) |
|--------|-------------------|----------------------|----------------------------------|
| **Effort** | L | M | M |
| **Dependencies** | None new | None new | openpyxl (existing) |
| **Architecture** | Clean — 2 new skills, 3 enhancements | Convention-driven — no new skills | Mixed — 1 new skill + expanded existing |
| **Intake quality** | Best — dedicated skill, one parsing implementation | Weakest — duplicated across skills | Good — dedicated skill |
| **State robustness** | Best — markdown STATE.md, git-tracked | Medium — conventions only, no enforcement | Fragile — Excel as state store |
| **Maintainability** | High — clean boundaries | Medium — conventions drift | Low — note-tracker becomes overloaded |
| **God-skill risk** | None | None | High — note-tracker absorbs too much |
| **Biggest risk** | More work upfront | Conventions not followed | Excel corruption, note-tracker bloat |
| **Best when...** | You want it done right and are willing to invest in the foundation | You want something fast and are okay with manual discipline | Note-tracker is already central to your workflow and you want to consolidate |

**Recommendation:** **Solution A (mk-flow)** — and here's why it fits you specifically:

1. You're an architecture-first builder. You split monoliths, enforce patterns, and create clean boundaries. Solution B's convention-only approach would frustrate you within a month. Solution C would create the god-skill you actively avoid.

2. You already have the plugin infrastructure. Adding a new plugin is a known pattern (P1), not new complexity.

3. The intake skill is independently valuable. Even if you never build the state skill, having a dedicated input decomposition layer pays for itself immediately with your communication style.

4. STATE.md as markdown (not Excel) is git-friendly, human-readable, tool-agnostic, and doesn't depend on openpyxl. It's the right persistence format for state.

---

## Next Steps — Toward the Full Solution

1. **Build the `intake` skill first** — Start with the assumption table pattern. Test it against your Auto-chessed bug report message as the benchmark. If it can decompose that message into 9 structured items with correct types, locations, and assumptions, it works. *(Starting now)*

2. **Design the STATE.md format** — Define the template based on the format in Section 5. Keep it under 50 lines. Test it by writing a STATE.md for Auto-chessed's current state and see if a fresh Claude session can resume from it.

3. **Build the `state` skill with pause/resume workflows** — Three workflows: status (read), pause (write snapshot), resume (load snapshot + route). Test by pausing mid-milestone in ladder-build and resuming in a new session.

4. **Enhance ladder-build with deviation rules** — Add GSD's Rules 1-3 (auto-fix bugs, auto-add critical missing functionality, auto-fix blocking issues) and Rule 4 (stop for architectural changes) to the build-milestone workflow.

5. **Wire note-tracker to intake** — Enable bulk item acceptance so intake can route 5 bugs + 1 feature + 1 UI gap to note-tracker in one call.

6. **Add goal-backward verification to ladder-build** — At milestone completion, check observable behavior, not task completion. "Can the user move pieces from inventory?" not "Did we implement the move function?"

7. **Save cross-project state to Claude Code memory** — Write a memory file per project tracking high-level status. Update on milestone completions and significant decisions.

**Recommended path:** Build `mk-flow` as a new plugin in this marketplace repo. Intake skill first (it's the highest-pain gap), state skill second, then targeted enhancements to ladder-build and note-tracker. The finished product is a workflow system where you dump any input — bugs, ideas, questions, dense rants — and it decomposes, confirms understanding, routes to the right skill, tracks state, and picks up where you left off across sessions. Your flavor, your architecture, GSD's best patterns.

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
- [Sample Response Pattern (Shape of AI)](https://www.shapeof.ai/patterns/sample-response) — accessed 2026-03-14
- [Continuous Claude v3 — Session Continuity Framework](https://github.com/parcadei/Continuous-Claude-v3) — accessed 2026-03-14
- [GitHub Copilot Plan Mode](https://docs.github.com/en/copilot/tutorials/plan-a-project) — accessed 2026-03-14
- [Plan Cascade Framework](https://github.com/Taoidle/plan-cascade) — accessed 2026-03-14
- [Claude GitHub Triage Bot](https://github.com/chhoumann/claude-github-triage) — accessed 2026-03-14
- [Armin Ronacher: What is Plan Mode](https://lucumr.pocoo.org/2025/12/17/what-is-plan-mode/) — accessed 2026-03-14
- [Pydantic for LLM Outputs](https://pydantic.dev/articles/llm-intro) — accessed 2026-03-14
- [Mother CLAUDE: Session Handoffs](https://dev.to/dorothyjb/session-handoffs-giving-your-ai-assistant-memory-that-actually-persists-je9) — accessed 2026-03-14
- [cli-continues](https://github.com/yigitkonur/cli-continues) — accessed 2026-03-14
- [Smart Handoff for Claude Code](https://blog.skinnyandbald.com/never-lose-your-flow-smart-handoff-for-claude-code/) — accessed 2026-03-14
- [Windsurf Cascade Documentation](https://docs.windsurf.com/windsurf/cascade/cascade) — accessed 2026-03-14
- [Aider Repo Map Documentation](https://aider.chat/docs/repomap.html) — accessed 2026-03-14
