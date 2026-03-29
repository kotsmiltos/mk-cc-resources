# Exploration: Workflow Clarity Across Sessions

> **TL;DR:** mk-flow tracks state via STATE.md, drift-check, and Pipeline Position, but the *presentation* and *handoff* layers are weak. Fresh sessions get injected context but no actionable orientation — Claude knows *what's on record* but not *what to do next*. The proposed fix is three-layered: (1) enrich Pipeline Position so skills self-orient without asking, (2) add explicit consumption contracts between skills so handoffs are explicit, (3) introduce user-facing ceremony moments that separate "status for the user" from "context for Claude." None of the 7 tools we surveyed have fully solved this — but the landscape moves fast and our survey is limited. The proposed solutions address the symptoms we've identified, but may introduce new problems (complexity, maintenance burden, context bloat) that need adversarial testing.

---

### Key Terms

- **Pipeline Position:** A machine-readable section in STATE.md tracking the current stage (idle, research, sprint-N, etc.), plan path, and current sprint. Injected every message via hook.
- **Hook injection:** The mk-flow UserPromptSubmit hook (`intent-inject.sh`) that reads context files and injects them into every conversation message.
- **Consumption contract:** An explicit agreement between a producing skill and a consuming skill about what output format, location, and metadata the consumer expects.
- **Ceremony moment:** A structured user-facing output at a key workflow boundary (session start, milestone completion, pipeline transition) that orients the user.
- **drift-check:** A bash script that verifies STATE.md claims against filesystem evidence (COMPLETION.md files, milestone reports).

---

## Current Failure Points: Seven Specific Gaps

The system has sophisticated state tracking but no *active orientation layer* that translates state into actionable next steps.

### 1. Hook Injects Context Passively, Not Actively

**Where:** Every fresh session, every message after `/clear`

The hook injects STATE.md, rules, vocabulary, and cross-references as reference material — but it doesn't extract or highlight the actionable next step. Claude receives a data dump and must infer what to do. If the user just types "hi" after `/clear`, Claude has no signal that says "you were executing Sprint 2, Task 3 of the state-consolidation plan."

The hook's routing rules (lines 172-183 of intent-inject.sh) only fire when the user's intent is clear. Bare skill invocations like `/ladder-build` with no prompt produce no routing suggestion.

### 2. No Resume Snapshot for Unplanned Interruptions

**Where:** After `/clear` or terminal close (vs. explicit `/state pause`)

If work is paused explicitly via `/state pause`, a rich `.continue-here.md` is created. But if the session is interrupted by `/clear`, terminal close, or the user just leaving — no snapshot is created. The resume workflow falls back to STATE.md, which is a status record, not a session transcript. There's no field for "Milestone N is 60% complete, the classifier was just added, next step is writing tests."

### 3. Pipeline Routing Rules Don't Cover All Stages

**Where:** intent-inject.sh pipeline routing section

The routing handles `requirements-complete`, `audit-complete`, `sprint-N-complete`, and explicit user requests. But there's no routing for:
- `stage: idle` (what should Claude suggest?)
- `stage: research` (miltiaze is in progress — no rule to resume it)
- `stage: reassessment` (no routing rule exists)
- `stage: sprint-N` without `-complete` (mid-sprint, no suggestion)
- Skill-stage mismatch (user runs `/architect` during `stage: sprint-2`)

### 4. Skill Intakes Assume User Provides Clarity

**Where:** Every skill's `<intake>` section

Each skill checks Pipeline Position first (good), but then falls through to "ask the user" if no direct description is provided. If STATE.md says `plan: artifacts/designs/audit-remediation/PLAN.md` and the user types `/ladder-build` with no prompt, the skill still asks "which project?" instead of using the Pipeline Position path.

### 5. Pipeline Position Path Fields Are Optional

**Where:** STATE.md template

The template says "if applicable" for Requirements, Audit, Plan, and Current Sprint fields. This means `stage: sprint-2` can exist without a Plan path. Skills trust these fields but the template doesn't enforce them. Result: a skill checks Pipeline Position, doesn't find the path, falls back to manual detection.

### 6. "Current Focus" Is Status, Not Next-Action

**Where:** STATE.md Current Focus section

The current STATE.md says: "State consolidation pipeline complete. All sprints executed and reviewed." This describes *state* (what's done), not *next action* (what to do now). A fresh session reads this and can't determine whether to continue working, start something new, or wait for user input.

### 7. No Context Handoff Between Workflow Steps

**Where:** When one workflow completes and the next starts (especially across sessions)

Each workflow is self-contained. When architect completes a sprint plan, it produces PLAN.md and task specs but no "here's the 30-second summary for the next agent." A fresh session resuming mid-pipeline must re-read the full PLAN.md from scratch.

More critically: **sprint boundaries don't explain why they exist.** When a sprint ends, the output says "Sprint 1 done, run /architect for review" — but not *why* the work was split here. The user doesn't know: was this an arbitrary process boundary, or is there a real decision gate? Sprint completion must include:
1. What was built
2. **Why we're stopping here** (the decision gate or context reason that necessitated the break)
3. What needs to happen before Sprint 2 can be planned (review findings? user decision? test results?)
4. How to continue (exact command + what files to read)

**Bottom line:** The system has context *injection* but no context *translation*. Raw state goes in; actionable guidance doesn't come out. Whether this is a fundamental design gap or an acceptable tradeoff (keeping the hook simple) is a design decision, not a given.

---

## State Architecture: The Shape Problem

The current STATE.md is well-structured for tracking (what's done, what's blocked, what's next) but underspecified for orientation (what to do now, where to find things, what's verified).

### What a Fresh Session Actually Needs

| Question | Current Answer | Quality |
|----------|---------------|---------|
| What am I working on? | Current Focus (prose) | Readable, not navigable — no file paths |
| What just finished? | Done (Recent) with checkmarks | Readable, unverified — no COMPLETION.md links |
| What's next? | Next Up (prose list) | Readable but vague — no skill routing or explicit action |
| What stage are we in? | Pipeline Position (stage enum) | Machine-readable but minimal — no build plan, no task specs |
| Are there blockers? | Blocked/Open Questions | Could be empty — fine when it is |
| What decisions guide this? | "See BUILD-PLAN.md Decisions Log" | Deferred — requires context-switching |
| Is this information fresh? | Last updated date | Requires manual judgment — no explicit staleness check |
| What should I read first? | Not specified | Missing entirely |

### Pipeline Position Is Too Minimal

Current:
```yaml
stage: sprint-1
plan: artifacts/designs/.../PLAN.md
current_sprint: 1
```

Missing:
- `build_plan:` — path to ladder-build BUILD-PLAN.md (forces manual inference)
- `task_specs:` — path to current sprint's task specs (forces filesystem search)
- `completion_evidence:` — path to most recent COMPLETION.md (forces drift-check to validate)
- `last_verified:` — when drift-check last passed (staleness without running a script)

### Two-File Pause/Resume Creates Ambiguity

`.continue-here.md` is for explicit pauses. STATE.md is the living document. The resume workflow checks both, in priority order. But:
- The hook doesn't inject `.continue-here.md` (only STATE.md)
- A user typing "resume" as a normal message gets injected STATE.md but no handoff context
- After resume, `.continue-here.md` is deleted — single-use artifact

### "Context for Future Me" Needs Structure

Free-text "Context for Future Me" is noise-prone. It mixes gotchas, architecture decisions, and approaches tried. A fresh session can't distinguish between "this is a constraint" and "this is historical context." Suggested structure:

```markdown
## Context for Future Me

### Constraints & Gotchas
- [2-3 bullet points of things that will bite you]

### Key Decisions (Inline)
- [Decision] — [Why] — [Date]

### Read First
- [Path to most relevant artifact]
- [Path to current task specs]
```

**Bottom line:** STATE.md shape is sound but Pipeline Position needs enrichment, evidence links should be explicit, and "Context for Future Me" needs structure. 50 lines is fine if every line earns its place.

---

## Output Design: Outputs Built for Origination, Not Consumption

Each skill's output template is optimized for the producing skill's purposes, not the consuming skill's needs. The missing piece is explicit **consumption contracts**.

### Handoff Quality by Pipeline Stage

| Handoff | What Works | What's Missing |
|---------|-----------|---------------|
| miltiaze -> architect | Build Plans table feeds sprint structure; recommended solution is clear | No file path contract (architect must search artifacts/explorations/); no `type: exploration \| requirements` metadata; acceptance criteria only in requirements mode, not exploration |
| architect -> ladder-build | PLAN.md structure is solid; task specs have pseudocode + AC | No task manifest per sprint (executor must infer file paths from naming convention); no parallel-safe file partition; interface contracts reference task IDs, not file paths |
| ladder-build -> architect (review) | Milestone reports exist with discoveries + files changed | No link back to originating task specs; verification is prose, not AC checklist; discoveries don't classify impact (minor adjustment vs. plan restructuring) |
| architect review -> next sprint | PLAN.md gets updated with change log | No QA-REPORT.md template; new refactor requests not surfaced explicitly; fitness function status not communicated to executor |

### The Missing Consumption Section

No template has a section like:

```markdown
## For [Next Skill]

**You need from this output:**
- [Data X] at [location]
- [Data Y] format [specification]

**If you're resuming mid-work:**
- Check [path] for status
- Run [command] to validate
```

### Pipeline State Machine Is Implicit

Valid stages, transitions, and triggers are scattered across 6+ files. No single document says: "These are the stages. These are the valid transitions. This is who triggers each. This is what must be true for each transition."

**Bottom line:** The outputs *can* be consumed, but they require reverse engineering. Adding explicit consumption contracts to each template would cut handoff friction by 80%.

---

## Session Handoff: Two Parallel Paths That Don't Converge

### The Information Flow Problem

The system has two parallel context paths:

1. **Hook Path** (every message): Injects STATE.md + rules + vocabulary + cross-references + intents. Fast, cheap, always-on.
2. **Skill Path** (on-demand): Reads BUILD-PLAN.md, PLAN.md, .continue-here.md, milestone reports. Slow, comprehensive, requires explicit invocation.

**The gap:** The hook doesn't know about `.continue-here.md`, so "resume" typed as a normal message gets STATE.md (potentially stale) but no handoff context. The resume skill must discover it via file I/O.

### What Claude Knows at Each Moment

| Moment | Injected (Free) | Requires File I/O | Orientation Quality |
|--------|-----------------|-------------------|-------------------|
| Fresh session, first message | STATE.md, rules, vocab, intents | Everything else | Medium — has stage, needs file reads to act |
| `/architect` invoked | STATE.md Pipeline Position | PLAN.md, explorations, audits | Medium-High — stage tells workflow, details need I/O |
| `/ladder-build` invoked | STATE.md Pipeline Position | BUILD-PLAN.md, task specs | Medium-High — stage tells workflow, details need I/O |
| "resume" typed | STATE.md (not .continue-here.md) | .continue-here.md, BUILD-PLAN.md | Low — hook doesn't know handoff exists |
| `/clear` mid-build | STATE.md still injected | Everything (conversation gone) | Low — in-progress context lost |

### System Assumes Discipline

The handoff system works perfectly for:
- Users who explicitly pause/resume
- Users who invoke the right skills
- Users who notice stale warnings
- Users who remember to run drift-check

It breaks for:
- Implicit closes (no explicit pause)
- Bare skill invocations (no prompt)
- Missed or dismissed stale warnings
- Expecting status to be auto-verified

**Bottom line:** The hook should also inject `.continue-here.md` if present. Stale warnings should be preamble, not postamble. The gap between "injected context" and "sufficient context to act" needs to close.

---

## User-Facing Clarity: Status for the User != Context for Claude

The current system conflates two fundamentally different outputs.

| Status for User | Context for Claude |
|----------------|-------------------|
| "You're 60% done, next is X" | "Drift-check verified M1-M3, pending M4-M5" |
| "Here's what changed since last time" | "Read files A, B, C for full context" |
| "One blocker: P0 highlight bug" | "Route to note-tracker or ladder-build skill" |
| "Next action: fix bug or continue build?" | "Run drift-check, then route appropriately" |
| Oriented toward **understanding** | Oriented toward **function** |

### Key Moments That Need Ceremony

**Session Start (the critical gap):**
Current: drift-check runs, table gets printed, user sees data dump.
Should be: "Welcome back. You're in Sprint 2 of 3, task 3/5. Last session you finished the classifier hook. Next: write tests for it. Ready?"

**Skill Completion:**
Current: "Done" message, wait for next command.
Should be: "Milestone 3 complete. Overall: 42% of plan (3/7 milestones). Next: M4 (State skill). Continue or pause?"

**Pipeline Transition:**
Current: miltiaze outputs exploration, user manually invokes architect.
Should be: "Exploration complete. 5 dimensions, 3 solutions compared. Moving to planning with /architect. Here's what carries forward."

**Mid-Work:**
Current: no periodic check-in.
Should be: "Working on task 2/3 of this milestone. 7 actions today. No blockers."

### Progressive Disclosure (Not Implemented)

| Tier | What User Sees | When |
|------|---------------|------|
| Quick glance | "Sprint 2/3, task 3/5, 60%" | Session start, after completion |
| Medium | Done, current, next, blockers | On `/state status` or resume |
| Full | All artifacts, decisions, history | Explicit "show full status" |
| Claude-internal | drift-check, file paths, routing | Never shown to user |

**Bottom line:** mk-flow's intent classification and routing handles the cases it covers, but has gaps (7 failure points identified above). More fundamentally, the system conflates "context for Claude" with "status for the user." The fix is to explicitly separate verification logic from presentation logic — but this adds another layer of abstraction that needs its own maintenance.

---

## Prior Art: What the Industry Does

### Tool Comparison

| Tool | Session Persistence | Plan Tracking | Resumption UX |
|------|-------------------|---------------|---------------|
| **Cursor** | Rules files only; memories removed in v2.1.x | None native | No "welcome back" — clean slate each session |
| **Windsurf** | Auto-memories (retrieved selectively) + Rules | None native | Memories retrieved contextually, no explicit resume |
| **Devin** | Knowledge entries + notes.txt + scheduled sessions | Planner/Coder/Critic architecture | Scheduled sessions pick up where last left off |
| **Claude Code** | CLAUDE.md + MEMORY.md + Tasks (v2.1.16) | Tasks with dependencies and blockers | CLAUDE.md/MEMORY.md re-injected, no explicit "here's where you left off" |
| **SWE-agent** | None — single-shot design | None | N/A |
| **Aider** | Git as state + repo map (rebuilt each session) | None | Git diff is implicit state |
| **OpenHands** | Event sourcing (immutable log + deterministic replay) | None beyond conversation state | Full replay from event log |
| **Google Conductor** | plan.md as single source of truth | Tasks checked off in plan.md inline | Plan file survives everything |

### Industry Convergences

1. **Markdown is the universal format** — every tool uses markdown for persistence
2. **Agent context files are becoming standard** (CLAUDE.md, AGENTS.md, Rules) — though ETH Zurich research shows they should be minimal and focused on non-inferable details
3. **No tool has solved "resumption UX" well** — none present a clear "here's where you left off" on session start
4. **Plan tracking is the newest frontier** — only Conductor (Dec 2025) and Claude Code Tasks (Jan 2026) have native plan-as-file persistence
5. **Auto-memory trends toward consolidation + pruning** — Claude Code's AutoDream and community memory banks recognize that memory accumulates debt
6. **Precision over volume** — the shift is from "load everything" to "load what's relevant"

### How mk-flow Compares (Honestly)

mk-flow combines intent detection, vocabulary disambiguation, cross-reference enforcement, rules injection, and drift-checked state tracking in one hook. We didn't find another tool that does all of these together — but our survey covered only 7 tools, and community projects (Cursor Memory Bank, Cascade Memory Bank, Conductor) are evolving rapidly. Google Conductor's plan.md approach is simpler and may be more robust for plan tracking specifically. Claude Code's native Tasks feature (Jan 2026) may make some of mk-flow's state tracking redundant if it matures.

**Where mk-flow falls short compared to prior art:**
- **Windsurf's selective memory retrieval** — mk-flow injects everything every time; Windsurf only retrieves what's relevant. mk-flow's approach doesn't scale if context files grow.
- **OpenHands' event sourcing** — deterministic replay from event log is architecturally cleaner than STATE.md + drift-check for state recovery. mk-flow's approach is more fragile (STATE.md can be manually edited, drift between updates).
- **Aider's repo map** — structural understanding rebuilt from source each session. mk-flow doesn't have anything equivalent for codebase orientation.
- **Devin's compound architecture** — separate Planner/Coder/Critic models. mk-flow uses one Claude instance for everything, which means context competition between planning and execution.

**Bottom line:** mk-flow has a state tracking mechanism that other tools lack, but it also has gaps they've solved. The presentation and handoff problems identified here may be symptoms of a deeper issue: trying to do too much in a single hook + markdown file system.

---

## Solutions

### Solution A: Active Orientation Layer

**What it is:** Enhance the hook and STATE.md so fresh sessions self-orient without asking clarifying questions. Pipeline Position becomes the single navigation hub.

**Why it works:** Instead of injecting raw state and hoping Claude infers what to do, the hook extracts and presents the actionable next step. Skills use enriched Pipeline Position to auto-find their artifacts without fallback questions.

**Key components:**
- **Enriched Pipeline Position** — add `build_plan`, `task_specs`, `completion_evidence`, `last_verified` fields
- **Hook injects `.continue-here.md`** on first session message only (not every message), with staleness check
- **Mandatory path fields** when corresponding stages are active — validated by drift-check, not by skills
- **No free-text `next_action` field** — next action is *derived* from Pipeline Position fields by skills and hook routing (avoids creating a new drift source)
- **Stale warning as preamble** — before Claude responds, not after
- **Prerequisite:** verify what Claude Code Tasks provides natively before building — if Tasks handles pipeline state, use it instead

**Dependencies:** Changes to intent-inject.sh, STATE.md template, drift-check script, all workflow completion steps that update Pipeline Position.

**Pitfalls:**
- Hook becomes slower if injecting .continue-here.md (mitigated: first-message-only injection via session flag)
- Mandatory fields create write friction (mitigated: validated in drift-check, not every skill — single enforcement point)
- Skills may act confidently on stale Pipeline Position (mitigated: skills run drift-check before acting, not just before reporting)

**Hard limits:** Cannot eliminate all file I/O — detailed context (PLAN.md, task specs) will always require skill-level reads. This layer provides routing, not full context.

**Effort:** M — changes touch hook, template, and all workflow completion steps, but each change is small.

---

### Solution B: Consumption Contracts

**What it is:** Define explicit handoff contracts between skills. Each skill's output includes a "For [Next Skill]" section specifying what data, format, and location the consumer expects.

**Why it works:** Instead of the receiving skill reverse-engineering what was produced, the producing skill packages its output for consumption. Handoffs become seamless because the contract is explicit.

**Key components:**
- **Standardized output metadata** — every skill output includes: `type`, `output_path`, `key_decisions`, `open_questions` in front matter. No "For [Next Skill]" sections — the consumer defines what it expects in its own intake (inverted contract, avoids coupling-as-documentation)
- **Promote existing pipeline stage comment block** — the STATE.md template already has a canonical stage list in an HTML comment (lines 27-42). Promote this to a referenced spec, don't create a separate document that will drift
- **Task manifest per sprint** — explicit list of task spec file paths in PLAN.md (no filename inference)
- **Dual verification in milestone reports** — AC checklist (structured, scannable) AND "Verification Notes" prose (captures nuance checklists miss)
- **Type metadata in miltiaze output** — `type: exploration | requirements` in front matter
- **Discovery impact classification** — "minor adjustment" vs. "plan restructuring" in milestone reports

**Dependencies:** Changes to all skill templates (miltiaze, architect, ladder-build). Promotion of STATE.md comment block.

**Pitfalls:**
- Template changes require updating existing artifacts (mitigated: only future outputs follow new contracts)
- Standardized metadata adds overhead to every skill output (mitigated: 4 front-matter fields, ~30 seconds per output)
- Checklist verification can become mechanical (mitigated: QA flags any checklist without verification prose)

**Hard limits:** Cannot prevent all handoff confusion — human-authored prose sections will always have some ambiguity. Contracts reduce but don't eliminate interpretation.

**Effort:** M — many small template changes across 3 skills, plus one new state machine document.

---

### Solution C: Session Ceremony Protocol

**What it is:** Introduce structured user-facing moments at key workflow boundaries that separate "status for the user" from "context for Claude." Progressive disclosure for status queries.

**Why it works:** The user always knows where they are, what just happened, and what's next — without needing to parse raw state or run drift-check themselves.

**Key components:**
- **Event-driven ceremony** — fires on state change (milestone complete, pipeline transition, session resume), not on every completion. If nothing changed, no ceremony.
- **Milestone completion ceremony** — "M3 complete. Overall: 42% (3/7). Options: continue / pause / address blocker"
- **Pipeline transition marker** — "Exploration complete. Moving to planning. Here's what carries forward."
- **Progressive status with blocker bubbling** — quick glance always includes blockers: "[progress] | BLOCKED: [issue]". Blockers are never hidden by progressive disclosure.
- **Separate verify-status (internal) from present-status (user-facing)** in the state skill
- **Configurable ceremony level** — default minimal (one-liner + blockers), user opts into full ceremony via config. No assumption about what the user wants.
- **Resume detection** — if `.continue-here.md` exists and isn't stale, mention it briefly: "Resume context available from [date]. Use it?" One line, not a ritual.

**Dependencies:** Changes to state skill (status workflow split), all skill completion steps, ceremony config option.

**Pitfalls:**
- Event detection logic adds complexity to skill completion steps (mitigated: simple check — "did state change?")
- Config option adds another setting to maintain (mitigated: single flag in rules.yaml, default is minimal)
- Resume detection needs staleness check against STATE.md (mitigated: compare .continue-here.md date vs STATE.md last-updated)

**Hard limits:** Cannot provide a persistent visual status bar — Claude Code's output model is conversational, not dashboard. The best we can do is structured text at key moments.

**Effort:** M — status workflow split is the biggest change; ceremony moments are small additions to each skill's completion step.

---

### Solutions Compared

| Aspect | A: Active Orientation | B: Consumption Contracts | C: Session Ceremony |
|--------|----------------------|-------------------------|-------------------|
| Effort | M | M | M |
| Dependencies | Hook, STATE.md template, workflow completions | All skill templates, new state machine doc | State skill, all completion steps, hook |
| Performance | Slightly slower hook (inject .continue-here.md) | No runtime cost (template-time only) | Slightly more output per ceremony moment |
| Maintainability | Pipeline Position is already maintained | Templates need discipline | Presentation specs need central reference |
| Biggest risk | Next Action field drifts from reality | Contracts feel bureaucratic | Ceremony feels patronizing |
| Best when... | Fresh sessions need to act immediately | Skills hand off to each other across sessions | User needs to understand where they are |

**Recommendation:** All three, phased. They address different layers of the same problem:

- **A** fixes the *machine layer* — Claude orients immediately
- **B** fixes the *skill layer* — handoffs are explicit
- **C** fixes the *human layer* — the user always knows where they are

They're complementary, not competing. The recommended build order is A -> B -> C because A unblocks the most common frustration (fresh session asks "what do you want to do?"), B reduces the most friction (cross-session handoffs), and C polishes the UX.

---

## Next Steps — Toward the Full Solution

0. **Coherence audit first** — Before planning the build, run `/architect audit` in a fresh session. The audit must cross-reference all existing skill instructions, templates, references, and the 10 decisions from this exploration (D1-D10) to find ambiguities, duplications, and opposing statements. This is a prerequisite — building on inconsistent foundations creates more inconsistency. The architect audit workflow needs to include instruction-level coherence checking, not just code quality.

1. **Enrich Pipeline Position** — Add `build_plan`, `task_specs`, `completion_evidence`, `last_verified` to the STATE.md template and update all workflow completion steps to fill them.

2. **Inject .continue-here.md in hook** — Add a 5-line block to intent-inject.sh that reads and injects `.continue-here.md` if it exists (first message only, with staleness check). Stale warning moves to preamble.

3. **Promote pipeline stage spec** — Strengthen the existing STATE.md comment block as the canonical stage definition. Reference it from each skill's routing section. No separate document.

4. **Add standardized output metadata** — Each skill output includes `type`, `output_path`, `key_decisions`, `open_questions` in front matter. Consumer skills define what they expect in their own intake (inverted contract).

5. **Split status workflow** — Separate verify-status (internal, runs drift-check) from present-status (user-facing, formats output). Progressive disclosure with blocker bubbling.

6. **Add event-driven ceremony moments** — Fires on state change only. Session resume detection (one-line, not ritual). Milestone completion with sprint boundary rationale. Pipeline transition markers. Configurable ceremony level.

7. **Sprint boundary rationale** — Sprint completion outputs must explain WHY the break exists (decision gate? context health? genuine parallelism?) and what needs to happen before the next sprint can be planned. If the next sprint needs to be thought through, tell the user what specifically needs review and how to trigger it.

**Recommended path:** Step 0 (audit) first in a fresh session. Then build Active Orientation (Steps 1-2), Consumption Contracts (Steps 3-4, can parallel), Session Ceremony (Steps 5-7, needs enriched state).

### Build Plans

| Plan | Goal | Milestones | Effort | Depends On |
|------|------|------------|--------|------------|
| Active Orientation | Fresh sessions self-orient via enriched Pipeline Position + .continue-here.md injection | 3 | M | None |
| Consumption Contracts | Explicit handoff contracts between all pipeline skills + state machine document | 4 | M | None (can parallel with Active Orientation) |
| Session Ceremony | User-facing ceremony moments + progressive status + presentation split | 3 | M | Active Orientation (needs enriched state to present) |

**Recommended order:** Active Orientation -> Consumption Contracts (can start in parallel) -> Session Ceremony

---

## Design Decisions Made During This Exploration

These decisions emerged from the research and adversarial pass. They should carry forward into the architect plan.

| # | Decision | Rationale | Alternatives Rejected |
|---|----------|-----------|----------------------|
| D1 | No free-text `next_action` field — derive action from structured Pipeline Position fields | Avoids creating a new drift source (we just fixed this in state consolidation) | Free-text `next_action` in Current Focus (rejected: drifts) |
| D2 | Inverted consumption contract — consumer defines expectations, producer provides standardized metadata | Avoids coupling between skills disguised as documentation | "For [Next Skill]" sections in producer templates (rejected: tight coupling) |
| D3 | No separate state machine document — promote existing STATE.md comment block to referenced spec | A separate doc will drift from the code; the canonical definition already exists | New pipeline.yaml or pipeline-state-machine.md (rejected: drift risk) |
| D4 | Dual verification: AC checklist + verification prose | Checklists alone become mechanical; prose alone isn't scannable | Checklist only (rejected: false precision) or prose only (rejected: not scannable) |
| D5 | Ceremony is event-driven, not automatic — fires on state change only | Avoids ceremony fatigue; if nothing changed, no ceremony | Ceremony on every skill completion (rejected: noise) |
| D6 | Blockers always bubble to Tier 1 of progressive disclosure | Quick glance must never hide critical information | Blockers only visible at Tier 3 (rejected: misleading) |
| D7 | Hard limit: if >15 "things that must update on state change," architecture is wrong | Prevents meta-tracking from exceeding actual work | No limit (rejected: unbounded complexity) |
| D8 | Sprint boundaries must explain WHY they exist | User needs to know: is this a decision gate or an arbitrary process break? | Sprint completion with just "done, next command" (rejected: no rationale) |
| D9 | Sprints serve the product, not the process — break only at decision gates or context limits | Arbitrary boundaries slow production and increase error. Full implementation is the goal. | Fixed sprint sizing (S/M/L with task ceilings) as the primary grouping principle (rejected: process-first) |
| D10 | Adversarial self-assessment is a core product principle, not a style choice | Must be ingrained into miltiaze, architect, and any skill that produces assessments or designs | Adversarial section as optional presentation element (rejected: it's the thinking process, not just output) |
| D11 | Coherence audit before planning — run /architect audit in fresh session first | Building on inconsistent foundations creates more inconsistency. Audit must check instruction-level contradictions, not just code quality. | Skip audit and go straight to /architect plan (rejected: risk of building on conflicting instructions) |
| D12 | Sprint completion must include boundary rationale | User needs to know WHY the sprint breaks here and what needs to happen before the next sprint. If next sprint needs review, say what specifically and how. | Sprint completion with just "done, next command" (rejected: no context for the break) |

---

## Where This Can Fail — Adversarial Assessment

We attacked each solution from the enemy's standpoint: bad code, logic errors, undetermined outputs, unjustified decisions. For each hole found, we either patched it (resolution below) or flagged it as an open problem that needs a decision before building.

### Solution A: Active Orientation — Holes Found

**Hole 1: Next Action field becomes another drift source.**
We just spent 2 sprints on state consolidation because multiple files tracked status independently. Adding `next_action` to STATE.md is adding another field that can drift from reality.
**Resolution:** Don't add a free-text `next_action` field. Instead, make the next action *derivable* from Pipeline Position fields. If `stage: sprint-2` and `task_specs: [path]`, the next action is "execute those task specs." No new field to maintain — the routing logic in skills and the hook derives the action from existing structured fields. This is a design constraint: **no new free-text state fields**.

**Hole 2: Mandatory path fields make the system brittle.**
If one workflow forgets to fill `build_plan` or `task_specs`, skills break silently.
**Resolution:** drift-check should validate Pipeline Position field completeness. If `stage: sprint-2` but `task_specs` is empty, drift-check flags it. This keeps the validation in one place (the script that already validates state) rather than in every skill's intake. Add this as a build requirement: drift-check must validate Pipeline Position field consistency.

**Hole 3: Injecting .continue-here.md adds context bloat.**
The hook runs on every message. Injecting another file means every message is bigger, even when the user isn't resuming.
**Resolution:** Only inject `.continue-here.md` on the *first message of a session*, not every message. The hook can track this with a session flag file (similar to the stale nudge flag). After the first message, the resume context is in conversation history — no need to re-inject.
**Open problem:** Detecting "first message of a session" in a stateless hook is tricky. The flag file approach works but adds filesystem I/O. Need to verify the performance cost during build.

**Hole 4: Self-orienting skills proceed confidently in the wrong direction.**
If STATE.md says `sprint-2` but the actual state is different (manual edit, stale), skills act on bad data.
**Resolution:** This is exactly what drift-check solves. The rule already exists: "NEVER report status without drift-check verification." The same principle should apply to skill orientation: skills should run drift-check (or at minimum read completion evidence) before acting on Pipeline Position. Add this as a skill design principle: **verify before acting, not just before reporting**.
**Open problem:** Running drift-check on every skill invocation adds latency. Need to decide: is the tradeoff worth it? Or do we only run it once per session?

### Solution B: Consumption Contracts — Holes Found

**Hole 1: "For [Next Skill]" sections are coupling disguised as documentation.**
When architect changes what it needs from miltiaze, miltiaze's template must also change. This is tight coupling between skills that are supposed to be independent.
**Resolution:** Invert the contract. Instead of the producer saying "here's what you need," the *consumer* defines what it expects in its own intake/routing section (which it already does). The producer just needs to include standardized metadata (type, file paths, key decisions) — not consumer-specific instructions. The contract lives in one place: the consumer's intake. Drop the "For [Next Skill]" section from templates. Instead, standardize the metadata every skill output must include: `type`, `output_path`, `key_decisions`, `open_questions`.

**Hole 2: State machine document goes stale.**
A document describing valid pipeline transitions will drift from the actual routing code in intent-inject.sh and each skill's routing section.
**Resolution:** Don't create a separate document. Instead, the canonical pipeline stages are already defined in the STATE.md template (the HTML comment block, lines 27-42 in the current template). The consumer list is there too. Strengthen this: make the comment block the authoritative definition, and have each skill's routing reference it. The "document" already exists — it just needs to be promoted from a comment to a referenced spec.
**Open problem:** A comment block in a template isn't easily machine-readable. If we want drift-check to validate transitions, it needs the stages in a parseable format. YAML in cross-references.yaml? Or a dedicated `pipeline.yaml`? This is a design decision.

**Hole 3: AC checklists become mechanical checkbox-ticking.**
Structured verification sounds better but can produce false confidence.
**Resolution:** Keep both. Milestone reports include an AC checklist (structured, scannable) AND a "Verification Notes" prose section for nuance the checklist can't capture. The checklist is the minimum bar; the prose adds context. QA in the review workflow should flag any checklist where all items are checked but no prose explains how they were verified.

### Solution C: Session Ceremony — Holes Found

**Hole 1: Ceremony fatigue.**
Users will ignore formatted status blocks the way they ignore cookie banners.
**Resolution:** Don't produce ceremony blocks automatically. Produce them only when *the situation has changed since last time Claude spoke*. If the user is mid-build and nothing significant happened, no ceremony. If a milestone just completed or a new session started, ceremony fires. The trigger is state-change, not "every completion." This needs to be a design principle: **ceremony is event-driven, not time-driven**.

**Hole 2: Progressive disclosure Tier 1 can mislead.**
"60% done" hides a critical blocker visible only at Tier 3.
**Resolution:** Tier 1 must always surface blockers. The quick glance format should be: "[progress] | [blockers if any]". Example: "Sprint 2/3, task 3/5 | BLOCKED: P0 bug #3 unresolved". A blocker always bubbles up to the top tier. This is a hard rule: **blockers are never hidden by progressive disclosure**.

**Hole 3: "Welcome back" on /clear is patronizing.**
The user typed /clear to free context, not to end a session. A resume ritual wastes their time.
**Resolution:** The hook already skips slash commands (`/*) exit 0 ;;`). After /clear, the first *user* message triggers the hook. At that point, the hook doesn't know if this is a resume or a context cleanup. But: if `.continue-here.md` doesn't exist, there's nothing to resume from — skip the ritual. If it does exist, mention it briefly: "Resume context available from [date]. Use it?" One line, not a ceremony.
**Open problem:** What if the user /cleared mid-build and `.continue-here.md` is stale from a previous pause? The hook injects it, but it's misleading. Need a staleness check on `.continue-here.md` age — if it's older than STATE.md's last-updated, it's stale and should be ignored.

### Systemic Holes

**Hole: We're adding layers to fix a layering problem.**
More structure = more maintenance = more drift surface.
**Resolution:** This is the most important hole and we can't fully patch it. The mitigation is: measure the drift surface before and after. Currently we have: STATE.md (1 file, ~10 updateable fields), hook (1 script), 3 skill templates, 3 skill routing sections. The proposed changes add: ~4 new Pipeline Position fields, .continue-here.md injection toggle, standardized metadata in outputs. That's incremental, not exponential. But if during build we find ourselves adding more fields/files/checks, we stop and reassess. **Hard rule: if the total number of "things that must be updated on state change" exceeds 15, the architecture is wrong.**

**Hole: Only tested on one project.**
All findings come from cc-marketplace. Other projects may not have these problems or may have different ones.
**Resolution (partial):** After building, test on at least one other project before declaring the design stable. The mk-flow M7 milestone (paused) was about "context handoff" — this exploration should inform M7's scope. But the solutions should be designed as opt-in enhancements, not mandatory. Projects that don't use the full pipeline shouldn't be burdened by pipeline-specific fields.
**Open problem:** We genuinely don't know if this generalizes. This is a risk we accept and monitor.

**Hole: Claude Code native features may overtake this.**
Tasks, AutoDream, and future features may make this redundant.
**Resolution:** Check before building. Verify what Claude Code Tasks actually provides as of today — does it handle pipeline tracking? Sprint state? If it does, we should use it instead of building our own. If it doesn't, build ours but keep the interface minimal so migration is easy.
**Open problem:** We haven't actually checked what Tasks provides. This is a prerequisite research step before committing to Solution A.

**Hole: Ceremony assumes we know what matters to the user.**
**Resolution:** Don't assume. The ceremony format should be configurable — users opt into the level of structure they want. Default to minimal (one-liner + blockers), let users escalate to full ceremony if they find it useful. Configuration lives in context/rules.yaml or a mk-flow config.

---

## Sources

- Codebase analysis: context/STATE.md, plugins/mk-flow/hooks/intent-inject.sh, all skill SKILL.md files, all workflow and template files (accessed 2026-03-29)
- Blockchain Council: Cursor memory tracking — https://www.blockchain-council.org/ai/cursor-ai-track-memory-across-conversations/ — accessed 2026-03-29
- Windsurf Cascade Memories docs — https://docs.windsurf.com/windsurf/cascade/memories — accessed 2026-03-29
- Cognition blog: Scheduled Devins — https://cognition.ai/blog/devin-can-now-schedule-devins — accessed 2026-03-29
- Devin Session Tools docs — https://docs.devin.ai/work-with-devin/devin-session-tools — accessed 2026-03-29
- Claude Code Memory docs — https://code.claude.com/docs/en/memory — accessed 2026-03-29
- Claude Code Task Management — https://claudefa.st/blog/guide/development/task-management — accessed 2026-03-29
- SWE-agent GitHub — https://github.com/SWE-agent/SWE-agent — accessed 2026-03-29
- Aider repo map docs — https://aider.chat/docs/repomap.html — accessed 2026-03-29
- OpenHands persistence docs — https://docs.openhands.dev/sdk/guides/convo-persistence — accessed 2026-03-29
- Google Developers Blog: Conductor — https://developers.googleblog.com/conductor-introducing-context-driven-development-for-gemini-cli/ — accessed 2026-03-29
- MemU blog: OpenHands memory analysis — https://memu.pro/blog/openhands-open-source-coding-agent-memory — accessed 2026-03-29
