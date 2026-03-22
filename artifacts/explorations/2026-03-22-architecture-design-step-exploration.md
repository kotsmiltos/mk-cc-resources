# Exploration: Multi-Agent Development Team Workflow

> **TL;DR:** The current skill pipeline (miltiaze → ladder-build → mk-flow) is missing two things: an **architect role** that provides ongoing technical leadership between research and execution, and a **team workflow** that makes the whole pipeline feel like a unified, automated development process — not four separate tools. The vision: miltiaze becomes the BA team (multi-perspective research producing requirements), a new architect skill becomes the tech lead (technical planning, sprint task specs with pseudocode, ongoing reassessment), ladder-build becomes the dev team (parallel execution of well-defined tasks), automated QA runs adversarial verification after every sprint, and an **audit skill** provides the entry point for existing codebases — full technical assessment that feeds the architect with findings, risks, and recommended actions. Two entry points: new projects go miltiaze → architect → build; existing projects go audit → architect → build. The user is the client/executive — sees milestones, answers escalated questions, has final word. Everything else is automated, parallelized, and transparent.

---

### Key Terms

- **Fitness function:** A machine-checkable assertion about an architectural property — e.g., "module A never imports from module B internals." From Ford/Parsons/Kua's *Building Evolutionary Architectures*.
- **ADR (Architecture Decision Record):** A lightweight markdown document capturing one architecturally significant decision, its context, and consequences. Format by Michael Nygard (2011).
- **Bounded context:** A DDD concept — a boundary within which a specific domain model and vocabulary is valid. Used as a thinking tool for deciding module boundaries.
- **Strangler fig pattern:** Building the new system around the edges of the old, letting it grow until the old is replaced. From Martin Fowler.
- **PLAN.md:** The architect's living document — equivalent to a Jira board. Tracks sprints, tasks, decisions, refactors, risks, and change history. Single source of truth.
- **Sprint:** A set of tasks assigned by the architect, executed by ladder-build, verified by QA, then reassessed by the architect before the next sprint starts.
- **Pipeline position:** Where the project is in the workflow (research → design → sprint N → QA → reassessment). Tracked in STATE.md, injected by mk-flow.
- **Perspective agent:** A subagent spawned with a specific professional lens (infrastructure, UX, security, operations) to ensure multi-dimensional analysis.

---

## 1. Current Flow Gap Analysis: Strategy Without Architecture, Building Without Leadership

### What miltiaze outputs today

Exploration reports with dimension research, solutions with tradeoffs, and a Build Plans table (Plan | Goal | Milestones | Effort | Depends On). Strong strategic research — but no target architecture, no module boundaries, no interface contracts, no pseudocode. "Key components" are concept-level: "version field in every plugin.json" — not "a `merge.py` module with a `MergeStrategy` protocol."

### What ladder-build does today

Receives miltiaze's Build Plans table as milestones. Performs impact analysis on the existing codebase (dependency tracing, not design). Each milestone designs its own files locally. Works well when existing conventions constrain the design space. Degrades into patch-on-patch for novel work.

### What's actually missing

Not just an architecture design step — an entire **leadership and quality layer**:

| What exists | What's missing |
|-------------|---------------|
| Strategic research (miltiaze) | Requirements document framed for implementation |
| Per-milestone file decisions (ladder-build) | Technical planning that designs the whole before building pieces |
| Per-milestone self-verification (ladder-build) | Adversarial QA that tests to break, not just confirm |
| Internal replanning (ladder-build step_7) | Architect reassessment that reviews, amends, refactors between sprints |
| Manual skill invocation | Automated pipeline with the user as client, not operator |
| Single-perspective research | Multi-perspective parallel analysis from different professional lenses |
| Sequential milestone building | Parallel execution of independent tasks |

### The real-world process this should mirror

1. **Client** brings an idea
2. **BA team** researches — different perspectives, produces requirements doc, confirms with client
3. **Architect** plans — technical decisions, sprint tasks with pseudocode, presents for review
4. **Dev team** executes sprint — parallel where possible, sequential where dependent
5. **QA team** verifies — adversarial testing against requirements AND architect's spec
6. **Architect** reassesses — reviews QA, amends plan, requests refactors, assigns next sprint
7. **Client calls** throughout — anyone can escalate questions, uncertainty is normal and welcome
8. Repeat until done

**Bottom line:** The gap isn't just "design the architecture before building." It's "run a proper development process where research, planning, execution, and quality are distinct roles with distinct responsibilities, operating as a coordinated team."

---

## 2. Prior Art: Architecture Design Workflows

### Architecture Decision Records (ADRs)

Lightweight markdown documents capturing one architecturally significant decision. Michael Nygard's 2011 format: Title, Status, Context, Decision, Consequences. Tooling: adr-tools (CLI), MADR (most maintained template standard), Log4brains (management + static site). Adopted by AWS (200+ documented), Google Cloud, Microsoft Azure, UK Government Digital Service. Useful for the architect's decision capture — lightweight, version-controlled, fits in a git repo.

### C4 Model + Mermaid

Simon Brown's four-level approach (Context → Containers → Components → Code). Levels 1-2 sufficient for most work. Mermaid has architecture diagram support (v11.1.0+), LLMs generate it fluently, GitHub renders natively. Ideal for the architect's structural documentation — machine-readable, version-controllable, AI-friendly.

### Design Docs

Google's internal practice — "relatively informal documents created before coding." Emphasis on trade-offs and implementation strategy. For solo + AI: the "forcing function for clarity" remains valuable. An AI can serve as the reviewer. The architect's PLAN.md essentially IS a living design doc.

### Module Decomposition: DDD Bounded Contexts

Strategic DDD defines bounded contexts (module boundaries) and context mapping (inter-module communication). Key guidance: "make every module independent, keep interactions minimal." The mental model for deciding module boundaries. Full tactical DDD (aggregates, value objects) is overkill — but a context map is exactly what the architect needs.

### Evolutionary Architecture + Fitness Functions

Ford/Parsons/Kua: fitness functions are machine-checkable assertions about architectural properties. They verify the architecture is maintained during building. Bridge between "design it" and "keep it that way." Become the QA team's verification criteria.

### The AI-Native Gap

Addy Osmani's "How to Write a Good Spec for AI Agents" (2025-2026): "experienced LLM developers treat a robust spec/plan as the cornerstone." But current AI workflows emphasize specs (what) and plans (ordered tasks) while skipping architecture (how the code should be structured) and quality verification (did we actually build what was asked). No existing approach combines multi-perspective research, architecture planning, parallel execution, and adversarial QA into one automated workflow.

**Bottom line:** ADRs capture decisions, C4/Mermaid captures structure, DDD captures boundaries, evolutionary architecture captures verification. The opportunity is a synthesis — but more importantly, it's an ORCHESTRATION of these into a team workflow where different agents play different roles.

---

## 3. The Multi-Agent Team Architecture

### Roles and Responsibilities

```
┌─────────────────────────────────────────────────────┐
│  USER (Client / Executive)                          │
│  - Provides the idea                                │
│  - Confirms requirements                            │
│  - Reviews milestone completions                    │
│  - Final word on unclear/important decisions         │
│  - Injects thoughts anytime                         │
└──────────────────┬──────────────────────────────────┘
                   │
     ┌─────────────┴──────────────┐
     │  miltiaze (BA Team)        │
     │  Parallel perspective       │        ┌─────────────────────────┐
     │  agents:                    │        │  architect (Tech Lead)  │
     │  ├─ Technical feasibility   │───────▶│  Parallel perspective   │
     │  ├─ UX / end-user impact    │        │  agents:                │
     │  ├─ Operations/maintenance  │        │  ├─ Infrastructure      │
     │  └─ Domain-specific         │        │  ├─ Interface design    │
     │                             │        │  ├─ Testing strategy    │
     │  Output: REQUIREMENTS.md    │        │  └─ Security review     │
     └─────────────────────────────┘        │                         │
                                            │  Maintains: PLAN.md     │
                                            │  Output: sprint tasks   │
                                            │  with pseudocode        │
                                            └────────────┬────────────┘
                                                         │
                                  ┌──────────────────────┴───────────────────┐
                                  │  ladder-build (Dev Team)                 │
                                  │  Parallel agents for independent tasks:  │
                                  │  ├─ Agent: task-1 (module A)             │
                                  │  ├─ Agent: task-2 (module B)             │
                                  │  └─ Agent: task-3 (tests)               │
                                  │  Sequential for dependent tasks          │
                                  └──────────────────────┬───────────────────┘
                                                         │
                                  ┌──────────────────────┴───────────────────┐
                                  │  QA (Automated, Adversarial)             │
                                  │  Parallel verification agents:           │
                                  │  ├─ vs architect's task specs            │
                                  │  ├─ vs miltiaze's requirements           │
                                  │  ├─ fitness function assertions          │
                                  │  └─ adversarial edge case testing        │
                                  │  Tests to BREAK it, not just happy paths │
                                  │  Creates test paths if none exist        │
                                  │  QA-REPORT.md — can trigger corrective   │
                                  │  action autonomously                     │
                                  └──────────────────────┬───────────────────┘
                                                         │
                                            ┌────────────┴────────────┐
                                            │  architect (Reassess)   │
                                            │  Reviews QA report      │
                                            │  Updates PLAN.md        │
                                            │  Requests refactors     │
                                            │  Plans next sprint      │
                                            │  ────── LOOP ──────     │
                                            └─────────────────────────┘

  mk-flow (ambient throughout)
    - Tracks pipeline position
    - Routes intents based on where we are
    - Injects context every message
    - Auto-updates STATE.md
```

### Multi-Perspective Research (How "Different Kinds of BAs/Architects" Work)

Each phase spawns specialized agents with distinct professional lenses. They analyze the same problem but surface different concerns. The parent skill synthesizes — and explicitly flags where agents DISAGREE, because disagreements are where the important decisions live.

**miltiaze research agents (BA perspectives):**
- Technical feasibility agent: "Can we build this? Hard constraints?"
- UX/end-user agent: "How does this feel to use? Interaction flow?"
- Operations agent: "How do we maintain this? What breaks at scale?"
- Domain-specific agent(s): Security, compliance, performance — whatever the idea demands

**architect design agents (technical perspectives):**
- Infrastructure agent: "File structure, modules, deployment"
- Interface agent: "Contracts between modules, data flow, APIs"
- Testing agent: "Verification strategy, edge cases, testability"
- Security/quality agent: "What could go wrong, defensive patterns"

All agents think toward the final goal, even when their scope is narrow. The infrastructure agent doesn't just say "put it in this directory" — it considers how the directory choice affects testing, operations, and future extensibility. Good ideas come from any perspective.

### Communication: Transparent Channels

Every agent's findings are written to shared artifacts. Nothing is hidden:

| Channel | Medium | Who reads it |
|---------|--------|-------------|
| Requirements | `artifacts/explorations/REQUIREMENTS.md` | Architect, QA, user |
| Technical plan | `artifacts/designs/[slug]/PLAN.md` | Everyone |
| Sprint tasks | `artifacts/designs/[slug]/sprints/sprint-N/task-*.md` | Dev team, QA |
| QA reports | `artifacts/designs/[slug]/sprints/sprint-N/QA-REPORT.md` | Architect, user (if critical) |
| Decisions | `artifacts/designs/[slug]/decisions/*.md` or inline in PLAN.md | Everyone |
| State | `context/STATE.md` | Everyone (injected every message by mk-flow) |

Everyone is aligned because everyone reads the same source of truth. The PLAN.md IS the alignment artifact.

### The "Jira Board" — PLAN.md Structure

```
artifacts/designs/[slug]/
  PLAN.md                          ← Living master plan
  sprints/
    sprint-1/
      task-1-module-scaffold.md    ← Spec with pseudocode, interfaces, acceptance criteria
      task-2-core-logic.md
      task-3-tests.md
      QA-REPORT.md                 ← Auto-generated after sprint completion
    sprint-2/
      task-4-integration.md
      task-5-refactor-from-s1.md   ← Refactor requested by architect after sprint 1 QA
      QA-REPORT.md
  decisions/
    001-plugin-structure.md        ← ADR-style, grows over time
    002-interface-pattern.md
```

PLAN.md contents:

```markdown
# Plan: [Feature Name]
Source: artifacts/explorations/[requirements].md

## Vision
[From miltiaze — what we're building and why, in the client's terms]

## Architecture Overview
[Mermaid diagram — the big picture, updated as understanding evolves]

## Sprint Tracking
| Sprint | Status | Tasks | Completed | QA Result | Key Changes |
|--------|--------|-------|-----------|-----------|-------------|
| 1 | DONE | 3 | 3/3 | PASS (2 notes) | Naming issue flagged → sprint 2 refactor |
| 2 | IN PROGRESS | 3 | 1/3 | — | Includes refactor from sprint 1 |
| 3 | PLANNED | TBD | — | — | Scoped after sprint 2 review |

## Task Index
| Task | Sprint | Status | Depends On | Blocked By |
|------|--------|--------|-----------|------------|
| [Every task with full tracking] |

## Decisions Log
| # | Decision | Choice | Rationale | Alternatives | Date |
|---|----------|--------|-----------|-------------|------|
| [Captured as they're made, never deleted] |

## Refactor Requests
| From Sprint | What | Why | Scheduled In | Status |
|-------------|------|-----|-------------|--------|
| [Grows as QA and architect identify improvements] |

## Risk Register
| Risk | Likelihood | Impact | Mitigation | Status |
|------|-----------|--------|-----------|--------|

## Change Log
| Date | What Changed | Why | Impact on Remaining Work |
|------|-------------|-----|-------------------------|
| [Every amendment is tracked — nothing changes without a record] |
```

---

## 4. Operating Principles (Team Culture)

These are embedded in every agent prompt. They define HOW the team works, not just WHAT it works on.

**Work ethic:** Everyone is engaged and thorough. No agent is lazy, no agent hides findings, no agent takes shortcuts. Every agent applies itself fully regardless of scope — a testing agent thinks about architecture, an infrastructure agent thinks about UX. Work is not spared.

**Communication:** Direct and pointed. No pleasantries, no filler, no hedging. Open discussion where everyone advises toward the final goal. Everything is transparent — all work, findings, and concerns are written to shared artifacts for everyone to see.

**Decision-making:** Nothing changes on a whim — every change is tracked in the Change Log. Nothing is assumed or dropped. Nothing is too small to address or too big to attempt. Everything is possible and we find solutions for it. Always confirm with the user when uncertain. Never assume.

**Quality (QA is paramount):** Testing is adversarial — test to BREAK it, not just happy paths. Extensive, rigorous, covering every case the user asked about. If test paths don't exist, create them — never skip testing because infrastructure is missing. QA feedback can trigger corrective action autonomously. The QA team's findings carry weight — they can kick things back.

**Standards:** Aligned to the highest standards at every step. The user (client) is the final authority on unclear or important decisions. Best outcome is the only acceptable outcome. Modular, well-named, clearly separated code with no magic numbers, no silent failures, no hidden coupling.

---

## 5. Automation Model: What the User Sees vs. What Runs Automatically

| Action | Automated? | What the user sees |
|--------|------------|-------------------|
| miltiaze spawning parallel research agents | Yes | Nothing during research |
| miltiaze synthesizing requirements | Yes | REQUIREMENTS.md for confirmation: "Is this what you need?" |
| Architect spawning design agents | Yes | Nothing during design |
| Architect producing PLAN.md and sprint tasks | Yes | Plan summary: "Sprint 1 has 3 tasks, estimated M. Ready?" |
| Clear-cut technical decisions | Yes — architect decides | Entry in Decisions Log (user can review anytime) |
| Unclear/important decisions | No — escalated | "I'm unsure about X. Option A is simpler, B is more flexible. What matters more?" |
| Sprint execution (independent tasks in parallel) | Yes | Milestone completion: "Sprint 1 done." |
| QA verification | Yes — adversarial, parallel agents | Only failures/concerns surfaced. Pass = silent. |
| QA triggering corrective action | Yes — for clear fixes | "QA found X, auto-fixed. See QA-REPORT.md for details." |
| QA escalating critical issues | No — surfaced to user | "QA found a critical issue: [description]. How do you want to handle it?" |
| PLAN.md updates after sprint | Yes | User can read anytime, not forced to |
| STATE.md updates | Yes — mk-flow auto-updates | Injected as context every message |
| Architect reassessment between sprints | Yes | Summary: "Sprint 2 plan amended — added refactor task. Sprint 3 unchanged." |
| Refactor requests | Architect decides, executes next sprint | Only if refactor is large or changes scope |
| Next sprint planning | Yes | Summary shown, user confirms or adjusts |
| User dropping a thought mid-work | Captured by mk-flow | Acknowledged, routed to architect for plan consideration |

**The user's experience:**
1. "I want X" → miltiaze runs → "Here's what I understood. Is this right?"
2. Confirms → architect runs → "Here's the plan. Sprint 1: 3 tasks. Go?"
3. Confirms → sprint executes (automated, parallel) → "Sprint 1 done. QA passed. 1 note for sprint 2. Moving on."
4. Repeat. User drops thoughts anytime → captured → routed to architect.
5. Escalated only when genuinely unclear: "I'm not sure whether A or B here. My recommendation is A because [reason]. Your call."

---

## 6. What Changes in Each Tool

### miltiaze — shift from exploration report to requirements document

**Current:** Researches dimensions, presents solutions, Build Plans table.
**New:** Each research agent carries a professional perspective. Output is REQUIREMENTS.md — what the client needs, what it means for implementation, acceptance criteria, how the end result should look. Still presents genuine options where they exist, but frames them as recommendations. Explicitly surfaces disagreements between perspectives as decisions for the architect.

Key changes to SKILL.md and workflows:
- Research agents get perspective assignments in their prompts
- Exploration-report template becomes requirements-report template
- Build Plans table remains (architect uses it as input)
- Handoff: produces REQUIREMENTS.md + pipeline position update in STATE.md

### architect — NEW (the biggest piece)

**Sprint 0 workflow (plan.md):**
1. Read miltiaze's REQUIREMENTS.md
2. Read current codebase structure
3. Spawn perspective agents (infrastructure, interfaces, testing, security)
4. Synthesize into PLAN.md — architecture overview, module map, dependency rules
5. Break into sprint tasks with pseudocode, interface specs, acceptance criteria
6. Present plan to user for review
7. On confirmation: save PLAN.md, create sprint-1/ task specs, update STATE.md

**Sprint review workflow (review.md) — runs after QA:**
1. Read QA-REPORT.md for the completed sprint
2. Read the completed code/artifacts
3. Compare to PLAN.md expectations and REQUIREMENTS.md goals
4. Identify: what worked, what needs fixing, what we learned
5. Update PLAN.md sprint tracking, change log, risk register
6. Generate refactor requests if needed
7. Plan next sprint tasks
8. Present summary to user: "Sprint N done. Here's what changed. Sprint N+1 has X tasks."
9. On confirmation: create next sprint task specs, update STATE.md

**Escalation workflow (ask.md) — runs when uncertain:**
1. Identify the unclear decision
2. Present options with recommendation and rationale
3. Wait for user input
4. Record decision in Decisions Log
5. Update PLAN.md and affected task specs

### ladder-build — becomes executor, not planner

**Current:** Self-decomposes from miltiaze's Build Plans table, designs milestones, builds them.
**New:** Receives task specs from architect. Each task already has: goal, interface specs, pseudocode, acceptance criteria. Ladder-build's job is to BUILD what the architect specified.

Key changes:
- Kickoff reads from `artifacts/designs/[slug]/sprints/sprint-N/` instead of self-decomposing
- Parallelizes independent tasks via subagents (tasks without dependencies build simultaneously)
- Reports completion per task, not per self-defined milestone
- Does NOT replan — reports back to architect via sprint completion artifact
- Verification step checks against architect's task spec, not self-defined "done when"

### QA — NEW automated adversarial verification

Runs after every sprint. Not a separate skill — triggered by the architect's review workflow.

1. Spawns parallel verification agents:
   - Agent 1: Check each task output against architect's task spec (pseudocode followed? interfaces match?)
   - Agent 2: Check sprint output against miltiaze's REQUIREMENTS.md (does it serve the original need?)
   - Agent 3: Run fitness function assertions (architectural properties preserved?)
   - Agent 4: Adversarial edge case testing — try to break it, not just happy paths
2. If test paths don't exist, CREATE them — never skip
3. Produces QA-REPORT.md with: pass/fail per check, issues found, severity, recommended action
4. For clear fixes: can trigger corrective action autonomously (fix and note in QA report)
5. For critical issues: escalates to user via architect's escalation workflow

### audit — NEW (existing codebase entry point)

The audit skill is the entry point for existing codebases. Where miltiaze asks "what should we build?", audit asks "what do we have and where does it stand?"

**Audit workflow (audit.md):**
1. Read any existing goals, plans, requirements (STATE.md, BUILD-PLAN.md, REQUIREMENTS.md)
2. Spawn parallel perspective agents to assess the codebase:
   - Implementation quality agent: Modularity, naming, separation of concerns, code clarity, magic numbers, dead code, error handling
   - Risk & vulnerability agent: Security gaps, dependency health, failure modes, OWASP patterns, silent catches
   - Architecture coherence agent: Does the structure match the intent? Are modules actually separated? Dependency direction violations?
   - Future-proofing agent: Coupling that blocks change, hardcoded assumptions, extensibility, tech debt accumulation rate
   - Practice compliance agent: Does it follow its own CLAUDE.md? Its own conventions? Its own cross-references?
   - Goal alignment agent: Where are we on stated goals? What's done, what drifted, what was silently dropped?
3. Synthesize findings — surface disagreements between agents, prioritize by risk and impact
4. Produce AUDIT-REPORT.md with: findings (specific, not vague), risk ratings, and recommended actions for the architect
5. Each finding is actionable: specific file, specific line, specific issue, specific fix recommendation
6. Present summary to user for confirmation
7. Hand off to architect: "Audit complete. N findings across these areas. Recommend /architect to plan the improvements."

**Output:** `artifacts/audits/YYYY-MM-DD-[slug]-audit-report.md`

**Relationship to existing repo-audit:** The existing `plugins/repo-audit/` focuses on cross-cutting amendment tracking (audit snapshots + amendment records). This new audit is a full technical assessment feeding the architect. Different purpose — repo-audit is governance, this is assessment. Lives under the architect plugin as one of the architect's tools.

**Two entry points for the full pipeline:**
```
NEW project:      miltiaze → architect → ladder-build → QA → reassess → loop
EXISTING project: audit → architect → ladder-build → QA → reassess → loop
HYBRID:           audit + miltiaze (parallel) → architect (reads both) → build
```

### mk-flow — pipeline awareness

**Current:** Tracks state, classifies intents, injects context.
**New additions:**

Pipeline position in STATE.md:
```yaml
## Pipeline Position
stage: sprint-2          # research | audit | design | sprint-N | qa | reassessment
requirements: artifacts/explorations/2026-03-22-topic-requirements.md
audit: artifacts/audits/2026-03-22-codebase-audit-report.md
plan: artifacts/designs/topic/PLAN.md
current_sprint: 2
```

Intent routing becomes pipeline-aware:
- Post-exploration, no PLAN.md → suggest /architect
- Post-audit, no PLAN.md → suggest /architect
- Mid-sprint, action intent → route to current sprint tasks
- Post-sprint → trigger QA automatically
- User thought mid-sprint → capture, route to architect for plan consideration
- "Assess this codebase" / "where do we stand" → suggest /audit

---

## 7. Concrete Example: Building This on the cc-marketplace

User says: *"I want to add the architect skill to the marketplace."*

**miltiaze (BA team, parallel agents):**

Agent 1 (technical): Reads existing plugin structure, SKILL.md conventions, how miltiaze/ladder-build work. Returns technical requirements.

Agent 2 (UX): Analyzes the user's experience — invoke /architect after /miltiaze, see plan summary, confirm, sprints run, only asked about unclear things. Returns UX requirements.

Agent 3 (operations): Flags PLAN.md growth over many sprints — needs archival strategy. The architect skill reads both exploration AND build artifacts — cross-dependency risk. Returns ops requirements.

Agent 4 (integration): Maps current artifact flow. The architect sits between miltiaze and ladder-build. Contract: reads from artifacts/explorations/, writes to artifacts/designs/. Returns integration requirements.

miltiaze synthesizes REQUIREMENTS.md. Surfaces the disagreement: "Operations flagged PLAN.md size growth; integration wants simplicity. My recommendation: archive completed sprint details, keep summary rows. Does this match what you had in mind?"

User confirms.

**architect (tech lead, parallel agents):**

Agent 1 (infrastructure): "Plugin at `plugins/architect/`. SKILL.md + 3 workflows. Template for PLAN.md. Template for task specs."

Agent 2 (interfaces): "Architect reads `artifacts/explorations/*.md`. Writes `artifacts/designs/[slug]/PLAN.md`. Ladder-build reads `artifacts/designs/[slug]/sprints/sprint-N/*.md`. STATE.md gets pipeline position field."

Agent 3 (testing): "Fitness functions: PLAN.md always valid, task specs always have pseudocode section, architect never imports from ladder-build internals."

Agent 4 (security/quality): "Task spec template must enforce acceptance criteria — no task ships without verification criteria defined."

Architect synthesizes PLAN.md:
- Sprint 1 (S): Plugin scaffold — plugin.json, SKILL.md with routing, templates for PLAN.md and task specs
- Sprint 2 (M): Plan workflow — read requirements, spawn agents, synthesize, produce PLAN.md and sprint tasks
- Sprint 3 (M): Review + reassessment workflow — read QA, update PLAN.md, request refactors, plan next sprint
- Sprint 4 (S): Ladder-build integration — modify kickoff to read architect's task specs instead of self-decomposing
- Sprint 5 (S): QA automation — verification agents, adversarial testing, QA-REPORT.md generation
- Sprint 6 (S): mk-flow pipeline awareness — STATE.md pipeline position, intent routing updates

Presents to user: "6 sprints. Sprint 1 is the scaffold — 2 tasks, small. Sprint 2-3 are the core workflows. Sprint 4-6 integrate with existing tools. Ready to start?"

User confirms.

**Sprint 1 executes (ladder-build, parallel where possible):**
- Task 1: Create plugin scaffold (plugin.json, directory structure) — builds
- Task 2: Create SKILL.md with routing logic — builds (depends on task 1, sequential)
- Task 3: Create PLAN.md and task spec templates — builds (parallel with task 2)

**QA runs automatically:**
- Checks: plugin.json follows marketplace convention? SKILL.md has all required sections? Templates have all required fields?
- Adversarial: What happens if REQUIREMENTS.md doesn't exist? What if PLAN.md is malformed? What if a task spec is missing pseudocode?
- QA-REPORT.md: "PASS. 1 note: SKILL.md routing table doesn't cover the case where user invokes /architect with no prior exploration. Recommend adding a fallback path in sprint 2."

**Architect reassessment:**
- Reads QA report. Updates PLAN.md: Sprint 1 complete, sprint 2 amended to include QA's suggestion.
- "Sprint 1 done. QA passed with 1 note — adding a fallback routing case to sprint 2. No scope changes. Starting sprint 2."

**Repeat until sprint 6 is done.**

---

## Solutions

### Solution A: Incremental Enhancement (Build Architect, Adapt Existing)

**What it is:** Build the architect skill as a new plugin. Modify miltiaze's output format from exploration to requirements. Modify ladder-build to receive task specs from architect. Add QA as part of the architect's review workflow. Add pipeline tracking to mk-flow.

**Why it works:** Smallest scope that delivers the full workflow. Each existing skill gets targeted modifications. The architect skill is the main new piece. QA is embedded in the architect's sprint review, not a separate skill.

**Key components:**
- `plugins/architect/` — new plugin with SKILL.md, 4 workflows (plan, review, ask, audit), 3 templates (PLAN.md, task-spec.md, audit-report.md), 2 references (architecture-patterns.md, sprint-management.md)
- Audit workflow — parallel perspective agents assessing existing codebase, producing AUDIT-REPORT.md with actionable findings for the architect
- Modified miltiaze — output template shift, perspective agent prompts
- Modified ladder-build — receives task specs, parallelizes, reports to architect
- Modified mk-flow — pipeline position tracking, pipeline-aware routing
- QA embedded in architect's review workflow

**Dependencies:** Existing plugin infrastructure, all current skills

**Pitfalls:**
- QA embedded in architect may limit QA independence — mitigation: QA agents have their own prompts and don't answer to the architect's design assumptions
- Miltiaze output format change is a breaking change — mitigation: support both exploration and requirements formats, let the context determine which

**Hard limits:** Skill-to-skill invocation is still manual (user types /architect, /ladder-build). Automation happens WITHIN skills (subagents), not between them. mk-flow can suggest but not dispatch.

**Effort:** L — new skill (M) + modifications to 3 existing skills (S each) + QA integration (M)

---

### Solution B: Full Pipeline Skill (New Orchestrator)

**What it is:** A new meta-skill (`/pipeline` or `/build-team`) that orchestrates the entire flow. User invokes it once. It runs miltiaze, architect, ladder-build, and QA in sequence, handling all transitions automatically. Individual skills still exist and can be invoked standalone, but the pipeline skill is the "one package" experience.

**Why it works:** Solves the "four separate tools" problem directly. The user invokes one thing and the pipeline manages the rest. Transitions are automatic, not suggested.

**Key components:**
- Everything from Solution A
- `plugins/pipeline/` — orchestrator skill with SKILL.md and a pipeline.md workflow
- Pipeline skill reads miltiaze's output, invokes architect (as subagent), reads architect's output, invokes ladder-build (as subagent per sprint), runs QA (as subagent), invokes architect reassessment, loops

**Dependencies:** Everything from Solution A, plus the pipeline orchestrator

**Pitfalls:**
- Risk of becoming a god-object — mitigation: the orchestrator only sequences and passes context, it doesn't do research/design/building itself
- Context window pressure — the orchestrator maintains state across the full lifecycle, which is a lot of context. Mitigation: offload to disk artifacts aggressively, subagents carry their own context
- Harder to debug — if something goes wrong mid-pipeline, it's harder to diagnose than with manual invocation

**Hard limits:** Claude Code doesn't support automatic skill-to-skill invocation. The orchestrator would need to run everything as subagents, not as slash commands. This means the individual skills' SKILL.md behavior is duplicated as agent prompts.

**Effort:** XL — everything from Solution A (L) + orchestrator skill (M) + subagent-based execution (M)

---

### Solution C: Architect + Enhanced Automation (No Orchestrator)

**What it is:** Solution A plus aggressive automation within mk-flow's hook and intent routing — so transitions between skills are nearly automatic without a separate orchestrator. The hook detects pipeline state and automatically suggests (or triggers via Claude's instruction-following) the next skill.

**Why it works:** Gets close to Solution B's automation without the orchestrator's complexity. Each skill stays independent. mk-flow's hook becomes smarter about the pipeline.

**Key components:**
- Everything from Solution A
- Enhanced mk-flow hook: detects pipeline position, includes more specific routing instructions
- Intent corrections: "after exploration completes, action intents route to /architect" / "after sprint completes, auto-suggest QA review"
- Structured handoff blocks in each skill's completion step — formalized, parseable by the hook

**Dependencies:** Everything from Solution A, plus mk-flow hook enhancements

**Pitfalls:**
- Hook-based automation is advisory (tells Claude what to do), not deterministic — mitigation: the instructions are very specific about pipeline state, and Claude follows them reliably
- More complex hook logic — mitigation: pipeline position is a simple state machine, not complex branching

**Hard limits:** Same as Solution A — transitions are instruction-guided, not programmatic. But with pipeline state tracking and specific routing instructions, the user experience is close to automatic.

**Effort:** L — everything from Solution A (L) + mk-flow hook enhancements (S)

---

### Solutions Compared

| Aspect | A: Incremental | B: Orchestrator | C: Architect + Automation |
|--------|---------------|----------------|--------------------------|
| Effort | L | XL | L |
| Automation level | Good — within skills | Best — fully automatic | Very good — near-automatic via hook |
| Modularity | High | Medium (orchestrator risk) | High |
| User experience | Manual transitions, good suggestions | One invocation, fully automated | Near-automatic transitions |
| Debuggability | Best — each skill independent | Harder — pipeline state across skills | Good — each skill independent |
| Maintenance | Moderate — 1 new + 3 modified | High — 2 new + 3 modified + orchestration | Moderate — 1 new + 3 modified + hook |
| Best when... | Want the workflow now, iterate on automation later | Want full hands-off experience from day one | Want near-automatic flow without orchestrator complexity |

**Recommendation:** Solution C. It delivers the full workflow (architect, multi-perspective agents, adversarial QA, sprint loops) with near-automatic transitions via mk-flow's enhanced routing, without the complexity and maintenance burden of an orchestrator skill. The automation is "almost automatic" through intelligent hook routing — the user confirms key transitions rather than invoking each skill manually.

The build path: start with the architect skill core (plan + review + ask workflows), then modify miltiaze/ladder-build, then add QA, then enhance mk-flow routing. Each piece is independently useful, and the automation layers on top.

---

## Next Steps — Toward the Full Solution

1. **Build the architect skill** — SKILL.md, plan workflow (sprint 0), review workflow (sprint N), ask workflow (escalation), PLAN.md template, task-spec template, architecture-patterns reference, sprint-management reference. The core piece that fills the biggest gap. *(Starting now)*

2. **Build the audit workflow** — Parallel perspective agents (implementation quality, risk/vulnerability, architecture coherence, future-proofing, practice compliance, goal alignment). Produces AUDIT-REPORT.md with specific, actionable findings. Feeds the architect with improvement recommendations.

3. **Shift miltiaze output to requirements format** — Update exploration-report template to requirements-report template. Add perspective agent assignments to research agent prompts. Keep existing exploration format as a secondary workflow for pure research.

4. **Modify ladder-build to receive task specs** — Update kickoff to read from `artifacts/designs/[slug]/sprints/sprint-N/` instead of self-decomposing. Add parallel task execution via subagents. Change verification to check against architect's spec.

5. **Build QA into architect's review workflow** — Adversarial verification agents, fitness function checking, QA-REPORT.md generation, autonomous corrective action for clear fixes, escalation for critical issues.

6. **Add pipeline position to mk-flow** — STATE.md pipeline tracking field, hook reads and routes based on position, intent corrections for pipeline-aware routing. Support both entry points (miltiaze → architect and audit → architect).

7. **Embed team culture in all agent prompts** — The operating principles (thorough, direct, transparent, adversarial QA, no shortcuts, no assumptions) become part of every agent prompt template.

8. **Update cross-references and marketplace registry** — New plugin entry, skill aliases, CLAUDE.md updates.

**Recommended path:** The architect skill is the keystone. Once it exists, it can manage its own further development — the first sprint builds the core, then the architect plans the remaining sprints for audit, miltiaze modifications, ladder-build integration, QA automation, and mk-flow enhancements. The tool bootstraps itself.

### Build Plans

| Plan | Goal | Milestones | Effort | Depends On |
|------|------|------------|--------|------------|
| Architect skill core | New skill with plan, review, ask workflows + templates + references | 4 | M | None |
| Audit workflow | Parallel assessment agents, AUDIT-REPORT.md template, existing codebase entry point | 3 | M | Architect skill core (shares plugin) |
| miltiaze requirements shift | Output format change, perspective agent prompts, synthesis with disagreements | 2 | S | None (parallel-safe) |
| Ladder-build executor mode | Receives task specs, parallel execution, reports to architect | 3 | M | Architect skill core |
| QA automation | Adversarial verification agents, fitness functions, QA-REPORT.md, corrective action | 3 | M | Architect skill core |
| mk-flow pipeline awareness | Pipeline position tracking, pipeline-aware routing, enhanced hook, dual entry point | 2 | S | Architect skill core |
| Integration + packaging | Cross-references, marketplace registry, CLAUDE.md, skill aliases | 1 | S | All above |

**Recommended order:** [Architect skill core + miltiaze requirements shift (parallel)] → [Audit workflow + Ladder-build executor mode + QA automation (parallel)] → mk-flow pipeline awareness → Integration + packaging

---

## Sources

- Michael Nygard — Documenting Architecture Decisions — https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions — accessed 2026-03-22
- MADR (Markdown Any Decision Records) — https://adr.github.io/madr/ — accessed 2026-03-22
- adr-tools (npryce) — https://github.com/npryce/adr-tools — accessed 2026-03-22
- AWS Architecture Blog — ADR Best Practices — https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/ — accessed 2026-03-22
- Google Cloud — Architecture Decision Records — https://cloud.google.com/architecture/architecture-decision-records — accessed 2026-03-22
- Microsoft Azure — Architecture Decision Record — https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record — accessed 2026-03-22
- C4 Model official site — https://c4model.com/ — accessed 2026-03-22
- The C4 Model (O'Reilly, July 2026) — https://www.oreilly.com/library/view/the-c4-model/9798341660113/ — accessed 2026-03-22
- Structurizr DSL documentation — https://docs.structurizr.com/dsl — accessed 2026-03-22
- CALM (FINOS) — https://calm.finos.org/ — accessed 2026-03-22
- Mermaid Architecture Diagrams — https://mermaid.ai/open-source/syntax/architecture.html — accessed 2026-03-22
- Design Docs at Google — https://www.industrialempathy.com/posts/design-docs-at-google/ — accessed 2026-03-22
- Pragmatic Engineer — RFCs and Design Docs — https://blog.pragmaticengineer.com/rfcs-and-design-docs/ — accessed 2026-03-22
- Martin Fowler — Bounded Context — https://martinfowler.com/bliki/BoundedContext.html — accessed 2026-03-22
- Martin Fowler — Strangler Fig Application — https://martinfowler.com/bliki/StranglerFigApplication.html — accessed 2026-03-22
- Azure — Strangler Fig Pattern — https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig — accessed 2026-03-22
- Building Evolutionary Architectures — https://evolutionaryarchitecture.com/ — accessed 2026-03-22
- Clean Architecture and DDD 2025 — https://wojciechowski.app/en/articles/clean-architecture-domain-driven-design-2025 — accessed 2026-03-22
- domain-driven-hexagon — https://github.com/Sairyss/domain-driven-hexagon — accessed 2026-03-22
- Modular Monolith with DDD — https://github.com/kgrzybek/modular-monolith-with-ddd — accessed 2026-03-22
- Addy Osmani — Good Spec for AI Agents — https://addyosmani.com/blog/good-spec/ — accessed 2026-03-22
- Addy Osmani — LLM Coding Workflow 2026 — https://addyosmani.com/blog/ai-coding-workflow/ — accessed 2026-03-22
