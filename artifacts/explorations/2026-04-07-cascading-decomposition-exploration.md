> **type:** exploration
> **output_path:** artifacts/explorations/2026-04-07-cascading-decomposition-exploration.md
> **key_decisions:** Depth limit of 2-3 levels (not 4+) based on feasibility and prior art; augment existing architect rather than new skill; ADAPT-style lazy decomposition preferred over full upfront cascade; contract format extends existing task-spec template; bubble-until-absorbed amendment propagation; orchestrator-driven (not self-spawning) execution model
> **open_questions:** Optimal stopping threshold needs empirical tuning over 5-10 real cascades; whether `claude -p` workaround is worth the visibility tradeoff vs staying within native subagent depth; exact cost/benefit crossover point for decomposition vs direct implementation

# Exploration: Cascading Hierarchical Decomposition for Claude Code Skills

> **TL;DR:** Recursive hierarchical decomposition where architect agents cascade down through levels, writing contracts and negotiating amendments until leaf tasks are <=250 lines, is technically feasible but operates in a narrow sweet spot. Native Claude Code limits cap subagent depth at 1 (workarounds exist but sacrifice visibility). Research shows multi-agent systems amplify errors up to 17x in unstructured topologies, saturate at ~4 agents, and underperform single agents under equal token budgets. The recommended path is augmenting the existing architect skill with size-aware recursive decomposition (depth 2-3) plus ADAPT-style lazy overflow handling -- decompose only when needed, not everything upfront.

---

### Key Terms

- **Cascade:** Recursive decomposition where an architect agent breaks a task into subtasks, each of which may be further decomposed by sub-architect agents, forming a tree.
- **Contract:** A structured agreement between parent and child nodes specifying what the child will deliver, what interfaces it exposes, what it depends on, and how fulfillment is verified.
- **Amendment:** A structured objection filed by a child agent when it discovers its contract is infeasible, containing the problem, evidence, and a proposed resolution.
- **ADAPT:** "As-needed Decomposition and Planning" -- a research-backed approach where tasks are decomposed only when the executor fails or overflows, not upfront.
- **WBS:** Work Breakdown Structure -- the 60-year-old project management practice of hierarchical task decomposition.
- **Leaf task:** The smallest unit of work at the bottom of the cascade tree, intended for direct implementation by a single agent.

---

## Feasibility: Technically Possible but Architecturally Constrained

Claude Code subagents **cannot spawn subagents** -- the Task/Agent tool is explicitly excluded from subagent tool sets. This is a hard limit that makes native recursive cascading impossible beyond depth 1.

**Workaround: `claude -p` via Bash.** A subagent can shell out to `claude -p "prompt" > output.txt` to spawn a fresh Claude instance. Community tools like [claude-recursive-spawn](https://github.com/haasonsaas/claude-recursive-spawn) demonstrate this at depth 4. The tradeoff: zero visibility from ancestors, no structured result passing, no progress tracking, no error propagation.

**Context windows are not the bottleneck.** Opus 4.6 has a 1M token window (~830K usable). A 10KB contract fits trivially. The constraint is the 32K hardcoded output limit for native subagents -- `claude -p` lifts this to 128K.

**Parallel execution limits:** No built-in throttle. One user hit 24 simultaneous agents on a 2-vCPU VPS, causing system lockup. Practical ceiling: 3-5 concurrent agents on consumer hardware, gated by API rate limits (Tier 2: 1000 RPM, but a single agent generates 8-12 internal API calls).

**File-based communication works with caveats.** Concurrent file writes have caused corruption (280 incidents/day reported in one heavy-usage scenario). Mitigation: separate files per direction, unique names per negotiation round, never two agents writing the same file.

| Dimension | Native (Task tool) | `claude -p` workaround |
|---|---|---|
| Max depth | **1** (hard limit) | **3-4** (community-tested) |
| Max breadth/level | 5-7 | 3-5 (rate-limited) |
| Visibility | Final result only | Zero |
| Communication | Single return string (32K cap) | File-based (no cap) |

**Bottom line:** Depth 2-3 with branching factor 3-5 is the realistic operating envelope. The 250-line leaf target is well-calibrated for single-agent execution quality. Going deeper requires `claude -p` which sacrifices the visibility and control that make the system trustworthy.

**Sources:**
- [Claude Code subagent docs](https://code.claude.com/docs/en/sub-agents) -- Task tool excluded from subagents
- [GitHub Issue #4182](https://github.com/anthropics/claude-code/issues/4182) -- missing Task tool analysis
- [claude-recursive-spawn](https://github.com/haasonsaas/claude-recursive-spawn) -- community recursive tool
- [GitHub Issue #15487](https://github.com/anthropics/claude-code/issues/15487) -- 24 agents, system lockup
- [GitHub Issue #29217](https://github.com/anthropics/claude-code/issues/29217) -- file corruption from concurrent writes
- [Claude API context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- 1M for Opus/Sonnet 4.6
- [Claude API rate limits](https://platform.claude.com/docs/en/api/rate-limits)

---

## Prior Art and Lessons: A Graveyard of Failures With Clear Survival Patterns

Every major multi-agent framework has attempted recursive task decomposition. The results are sobering.

**The 17x Error Trap (Google DeepMind, Dec 2025):** 180 configurations across 5 architectures. Unstructured "bag of agents" networks amplified errors up to 17.2x vs single-agent baselines. Hierarchical structures performed better (5.5% drop vs 23.7% for flat), but still degraded beyond 3-4 levels.

**The Multi-Agent Trap (April 2026):** All 28 multi-agent configurations showed degradation vs single-agent baselines (-4.4% to -35.3%) under equal token budgets. The 45% saturation point: multi-agent coordination yields highest returns only when single-agent performance is already low.

**MAST Failure Taxonomy (March 2025):** 1,642 traces across 7 frameworks. Failure rates: 41% to 86.7%. Top categories: specification & system design (41.8%), inter-agent misalignment (36.9%), task verification & termination (21.3%).

**AutoGPT:** The canonical cautionary tale. Infinite loops from inability to remember completed work. A 5-level subtask depth resulted in command loops. Largely obsolete for production.

**What works:**

- **ADAPT (Allen AI):** Decompose only when the executor fails. Match granularity to actual difficulty. Outperforms static pre-decomposition because most tasks don't need it.
- **Agent Behavioral Contracts (Feb 2026):** Formal contracts with (Preconditions, Invariants, Governance, Recovery). 88-100% hard constraint adherence. Drift bounded by D* = alpha/gamma. Less than 10ms overhead per action.
- **WBS 100% Rule:** The sum of child work must equal the parent. Nothing added, nothing lost. Violation = scope creep.
- **WBS 8/80 Rule:** Leaf work packages between 8-80 hours. Under 8 = over-decomposed. Over 80 = under-decomposed.
- **Addy Osmani's Pattern:** 2 feature leads who each spawn 2-3 specialists. Sweet spot: 3-5 focused teammates per orchestrator. "Verification, not generation, is the true bottleneck."

**The contract negotiation concept -- child agents pushing back on infeasible decompositions -- is genuinely novel.** Existing systems use either static contracts or one-way delegation. No production system has implemented bi-directional amendment negotiation at scale.

**Bottom line:** Keep hierarchies shallow (2-3 levels), use structured topology, decompose adaptively (on failure, not upfront), enforce contracts with runtime verification, and accept that beyond ~4 agents coordination overhead eats the gains.

**Sources:**
- [17x Error Trap (Towards Data Science)](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/)
- [The Multi-Agent Trap (Towards Data Science)](https://towardsdatascience.com/the-multi-agent-trap/)
- [MAST taxonomy (arXiv 2503.13657)](https://arxiv.org/abs/2503.13657)
- [ADAPT (Allen AI)](https://allenai.github.io/adaptllm/)
- [Agent Behavioral Contracts (arXiv 2602.22302)](https://arxiv.org/abs/2602.22302)
- [PMI WBS Principles](https://www.pmi.org/learning/library/work-breakdown-structure-basic-principles-4883)
- [Addy Osmani -- Code Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/)
- [CrewAI Hierarchical Process docs](https://docs.crewai.com/en/learn/hierarchical-process)
- [AutoGPT Issue #3233](https://github.com/Significant-Gravitas/AutoGPT/issues/3233)
- [Single-Agent Outperforms Multi-Agent (arXiv)](https://arxiv.org/html/2604.02460)

---

## Implementation Architecture: Orchestrator-Driven with Parallel-Then-Reconcile Execution

### Directory Structure

```
artifacts/cascade/<task-slug>/
  CASCADE.md                          # Root manifest: goal, constraints, global config
  cascade.yaml                        # Machine-readable config (max depth, line budget, parallel policy)
  
  L0/
    contract.md                       # Root contract: what the entire cascade must deliver
    decomposition.md                  # How L0 breaks into L1 children
    status.yaml                       # State machine state for this node
    
    L1-auth-system/
      contract.md                     # Contract written by L0 for this child
      acceptance.md                   # Child's response: accepted, or amendment proposed
      amendments/
        001-scope-change.md           # Amendment from child -> parent
        001-response.md               # Parent's response to amendment
      decomposition.md                # How this L1 breaks into L2 children
      status.yaml
      
      L2-jwt-token-service/
        contract.md
        acceptance.md
        status.yaml
        implementation.md             # Leaf node: task spec ready for implementation
        RESULT.md                     # Post-implementation: what was built
```

The `L{depth}-{slug}/` naming convention makes hierarchy navigable by both agents and humans. An agent computes parent path by trimming the last segment, children by globbing `L{depth+1}-*/`.

**Leaf detection signal:** If `implementation.md` exists, it's a leaf. If `decomposition.md` exists, it has children. Never both.

### The Three-Phase Cascade Protocol

**Phase 1: Parallel Acceptance.** Spawn all siblings simultaneously. Each child reads its contract and decides: accept or file amendment. Children do NOT decompose yet -- they only respond to contracts. This is lightweight (~5KB read, ~2KB write per agent).

**Phase 2: Parent Reconciliation.** Parent reads all acceptance.md and amendment files. Rewrites contracts as needed. If any contract changed, affected children re-accept. Max 3 rounds enforced by config.

**Phase 3: Parallel Decomposition/Implementation.** After all contracts are agreed, children either decompose further (becoming parents for the next level) or implement directly (leaf tasks). Implementation is always parallel -- each leaf has a locked-down spec.

**Critical architectural choice:** The separation of acceptance from decomposition is what makes parallel execution safe. If merged, you lose the reconciliation window and the parallel strategy collapses.

### Stopping Criteria

The child agent computes a complexity score:

| Factor | Score | Rationale |
|--------|-------|-----------|
| Estimated lines > 250 | +3 | Core constraint |
| Touches > 3 files | +2 | Cross-file coordination signal |
| Exposes > 2 new interfaces | +2 | Interface design deserves its own contract |
| Non-trivial state management | +1 | Error-prone logic |
| Agent confidence < 80% | +2 | Self-assessment escape valve |

**Score >= 5: decompose further. Score < 5: implement directly.** Hard depth cap at 3-4 prevents infinite recursion.

Line count alone is unreliable -- LLMs underestimate by 30-50%. Files touched is a stronger signal.

### State Machine

Each node progresses through: `proposed` -> `reviewing` -> `accepted`/`awaiting_amend` -> `decomposing`/`implementing` -> `verified`/`failed`. Status tracked in `status.yaml` with transition log.

### Orchestrator Pattern

Agents do NOT spawn children directly. They write contracts and update status, then exit. An external orchestrator polls status files and spawns the next agent. This keeps agents stateless, enables concurrency control, and allows the system to resume from any state after a crash.

**Bottom line:** The system is architecturally viable with the three-phase protocol and orchestrator pattern. The two highest-risk decisions are the stopping threshold (needs empirical tuning) and the contract format (becomes the system's internal API -- design carefully before building).

---

## Contract and Amendment Design: Lightweight IDL That Answers Three Questions

### Contract Format

A contract answers: "What do you promise?" (delivers/exposes), "What do you need?" (requires), and "How will we know you're done?" (acceptance).

```yaml
contract:
  id: "auth.session-manager"
  parent: "auth"
  level: 2
  version: 1

  delivers: "Session lifecycle management: create, validate, refresh, revoke."

  exposes:
    - name: "create_session"
      signature: "(user_id: str, roles: list[str]) -> SessionToken"
      guarantees:
        - "Returns within 50ms for valid input"
        - "Raises AuthError for unknown user_id"

  requires:
    - contract: "auth.user-store"
      needs: "lookup_user(user_id) -> User | None"
      why: "Must verify user exists before creating session"

  constraints:
    max_files: 3
    max_lines: 250
    forbidden:
      - "Must not import from database layer directly"

  acceptance:
    - "create_session returns a decodable JWT with user_id and roles in claims"
    - "validate_session returns None for tokens older than configured expiry"
    - "Total implementation under 250 lines"

  traces_to:  # Explicit link to parent acceptance criteria
    - parent_criterion: "Sessions persist across requests"
      how: "JWT tokens carry session state, validated on each request"

  status: DRAFT | AGREED | IN_PROGRESS | FULFILLED | VIOLATED | AMENDED
```

The `traces_to` field is the critical consistency mechanism. Every child states which parent criterion it serves. During verification, the parent checks that ALL its acceptance criteria have at least one child tracing to them.

**When contracts become overhead:** Below ~400 lines of implementation, contract specification often exceeds the implementation itself. Leaf contracts should use a minimal format: just `delivers`, `exposes`, `acceptance`, and `files_touched`.

### Amendment Format

Amendments must contain proposals, not just complaints.

```yaml
amendment:
  id: "AMD-auth.session-manager-001"
  type: CONFLICT     # SCOPE_OVERFLOW | MISSING_DEP | INTERFACE_MISMATCH | CONFLICT | WRONG_BOUNDARY
  severity: BLOCKING # BLOCKING | DEGRADED | ADVISORY

  problem: "Contract requires stateless JWT with server-side revocation. These conflict."
  
  evidence:
    - "JWT spec (RFC 7519) defines tokens as self-contained"
    - "Revocation requires checking token against a store on every validation"

  proposed_change:
    option_a:
      description: "Drop server-side revocation. Use short-lived tokens with refresh flow."
      sibling_impact: "auth.refresh-token contract must be expanded"
    option_b:
      description: "Add a token blacklist store as a new dependency."
      sibling_impact: "New contract needed: auth.token-store"
```

**Auto-approvable amendments:** SCOPE_OVERFLOW (child proposes clean sub-decomposition) and MISSING_DEP (mechanically detectable unresolved requires reference) can be handled automatically.

### Amendment Propagation: Bubble-Until-Absorbed

Each amendment goes up one level. If that level resolves without changing its own contract, it absorbs and the amendment stops. If it must change its own contract, it files a new amendment to its own parent. Each amendment carries a `propagation_depth` counter. Most amendments stop at depth 1; only structural problems cascade to root.

### Conflict Resolution

The parent of conflicting siblings always decides. This is the core advantage of hierarchical systems -- there is always a tiebreaker. When the decomposition itself is wrong (WRONG_BOUNDARY), the parent escalates to its own parent for restructuring.

**Consumer-driven contract checking:** Before implementation, the system collects all `requires` entries referencing a given contract and presents them to that contract's author. This catches interface mismatches before work starts.

**Bottom line:** Contracts are a lightweight IDL answering three questions. Amendments are structured objections with proposals. Propagation uses bubble-until-absorbed. Consistency maintained by `traces_to` chains and the refinement invariant (children's outputs must be a subset of what the parent considers acceptable).

**Sources:**
- [Design by Contract (Wikipedia)](https://en.wikipedia.org/wiki/Design_by_contract)
- [Consumer-Driven Contract Testing (Pact)](https://docs.pact.io/)
- [Agent Behavioral Contracts (arXiv 2602.22302)](https://arxiv.org/abs/2602.22302)
- [Agent Contracts (Ye & Tan, COINE 2026)](https://arxiv.org/html/2601.08815v1)
- [Contract Net Protocol (Wikipedia)](https://en.wikipedia.org/wiki/Contract_Net_Protocol)
- [Correct-by-Construction Decomposition (arXiv)](https://arxiv.org/html/1909.02070)
- [Algebra of Contracts (UC Berkeley)](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2022/EECS-2022-99.pdf)

---

## Integration with Existing Skills: Augment Architect, Don't Replace It

The existing architect already does single-level decomposition: requirements -> perspective agents -> sprints -> task specs. It also manages decisions, QA reviews, and the sprint lifecycle. The cascade concept addresses only the **decomposition depth** gap -- tasks that are too large for a single leaf agent.

**Option C (Augment Architect) is the clear winner:**

1. **Extend task-spec template** with `parent_task`, `children`, and `decomposition_level` metadata. Backward-compatible.
2. **Add decomposition threshold check** to architect's plan workflow. Any task estimated at L or touching >8 files gets recursively decomposed.
3. **Add amendment record template.** When a leaf hits a level 4 deviation that affects a parent contract, it writes an amendment instead of just stopping.
4. **Use flat naming with hierarchy encoding:** `task-1-name.md`, `task-1.1-subname.md`, `task-1.1.1-leafname.md`. Ladder-build's glob (`task-*.md`) still finds them all.
5. **Extend STATE.md** with optional `decomposition_depth` field.

This requires changes to 4 existing files and 1 new template. No new skills, no new pipeline stages, no breaking changes to existing contracts. Ladder-build's execute workflow needs only minor extension (handle hierarchical task naming).

**What the architect already provides that the cascade reuses:**
- Multi-perspective analysis (4 agents: infra, interface, testing, security)
- Interface contracts table in PLAN.md
- Task spec format with inputs/outputs/acceptance criteria
- QA review workflow with adversarial testing
- Deviation rules (levels 1-4, with level 4 escalation)

**The genuinely new work is the amendment reconciliation loop** -- child -> parent -> siblings. Everything else maps onto existing patterns.

---

## User Experience: One Command, Headline Stream, Gate at L1 Only

### Invocation
```
> /architect plan auth-system    # Same as today, cascade activates automatically for large tasks
```

No new command needed. The architect detects that decomposition is needed based on task size estimates and activates the recursive protocol internally. Optional `--cascade` flag for explicit control.

### Visibility During Execution

A compact indented tree streams as decomposition proceeds:

```
[architect] Root: Authentication system -- decomposing into 4 modules
  [L1] OAuth2 integration -- decomposing into 3 tasks
    [L2] Token exchange handler -- leaf (est. ~180 lines)  [OK]
    [L2] Provider registry -- leaf (est. ~120 lines)  [OK]
  [L1] OAuth2 integration -- contract ready [3 tasks]
  [L1] Session management -- 1 amendment filed, resolving...
  [L1] Session management -- contract ready [2 tasks]
```

Each line = one agent starting or finishing. No multi-paragraph output to terminal. Full detail in files on disk.

### Intervention: Gate at Level 1 Only

The cascade pauses after root decomposition and shows the top-level breakdown. User approves or edits. Then levels 2+ run without further approval. This is the right default -- L1 is where the biggest architectural decisions happen.

### Failure UX

Every failure produces numbered choices, not error dumps:

```
[architect] AMENDMENT NEEDED -- OAuth2 token format
  Parent wants: JWT with claims
  Child wants: opaque token + lookup
  
  1. JWT with claims (parent's preference)
  2. Opaque token + lookup (child's preference)
  3. Let me specify
  
  Choose [1/2/3]:
```

### Output

Leaf task specs use the same format as current architect task specs. They feed directly into `/ladder-build` without modification.

**Bottom line:** The cascade should be invisible for most work. The user runs `/architect` as today. Large tasks automatically get recursive treatment. The terminal shows a compact tree, not 30 agents dumping text.

---

## Edge Cases and Risks: Narrow Operating Envelope

### Context Degradation at Depth
**Likelihood: HIGH | Impact: HIGH.** By level 3-4, the implementing agent is 3-4 translations away from the original intent. Non-functional requirements (security, performance) evaporate first. Mitigation: every contract carries the original user request verbatim plus an "invariants" section copied to all children.

### Amendment Storms
**Likelihood: MEDIUM | Impact: HIGH.** A fundamental discovery at a leaf triggers amendments cascading upward, invalidating work at every level. Mitigation: amendment budget per contract (max 3 rounds), scope tags (local/sibling/structural), cycle detection via amendment log.

### Over-Decomposition (The #1 Risk)
**Likelihood: HIGH | Impact: MEDIUM.** A 300-line task decomposed into 4x75-line tasks generates 320-600 lines of contract overhead to produce 300 lines of code. **Decomposition starts paying off at ~400-500 lines.** Below that, a single agent is faster, cheaper, and more accurate. Mitigation: decomposition gate (abort if contract overhead >25% of implementation), leaf size floor (100 lines minimum).

### Cross-Cutting Concerns
**Likelihood: HIGH | Impact: HIGH.** Auth, logging, error handling span every branch but don't decompose into one. Sibling branches decomposed independently can silently produce incompatible implementations of the same concern. Mitigation: foundation sprint builds cross-cutting infrastructure first; shared contract library injected into every child contract with concrete code-level patterns, not abstract guidelines.

### Cost and Time
**Likelihood: HIGH | Impact: HIGH.** A depth-4 cascade (B=4): 341 agent calls, ~10M tokens minimum, $300-800 at Opus pricing. One case study: $47,000 in 3 days with 23 uncontrolled subagents. Mitigation: lazy decomposition (one level at a time), hard budget caps, model tiering (Opus for L0, Sonnet for leaves).

### The "Just Do It" Threshold

| Project Size | Decomposition Value |
|---|---|
| <500 lines | Never decompose. Single agent wins decisively. |
| 500-2,000 lines | Single agent with architect -> ladder-build (1 level). Cascade is pure overhead. |
| 2,000-5,000 lines | 2-level decomposition starts paying off. |
| 5,000-15,000 lines | 3-level decomposition sweet spot. |
| >15,000 lines | Necessary, but increase breadth not depth. Cap at 3 levels. |

**Bottom line:** The operating envelope is 2K-15K lines, 2-3 levels deep, 3-5 children per node. Below 2K it's overhead. Above 3 levels, context degradation and cost dominate.

---

## Solutions

### Solution A: Augmented Architect with Size-Aware Recursive Decomposition

**What it is:** Extend the existing architect's plan workflow with a recursive decomposition step. After creating initial task specs, check each one's estimated size. Tasks exceeding the threshold (>400 lines or touching >8 files) get recursively decomposed by spawning a sub-architect agent. Depth capped at 2-3 levels. Everything stays within native Claude Code subagent capabilities -- the main orchestrator (architect workflow) drives the recursion, not the subagents themselves.

**Why it works:** Least disruption to a pipeline that already works. Reuses task-spec format, QA workflows, deviation handling, and STATE.md coordination. The amendment protocol extends the existing level 4 deviation escalation pattern. Ladder-build continues to receive task specs in the same format.

**Key components:**
- Extended `task-spec.md` template -- add `parent_task`, `children`, `decomposition_level`, `traces_to` fields
- New `amendment-record.md` template -- structured objection with proposals
- Modified `plan.md` workflow -- add recursive decomposition step after initial task creation
- Modified `review.md` workflow -- read amendment records during QA
- Modified `sprint-management.md` -- add size threshold rules and stopping criteria

**Dependencies:** No new dependencies. Existing architect and ladder-build infrastructure.

**Pitfalls:**
- Stopping threshold needs empirical tuning -- too low = over-decomposition, too high = leaf tasks too large
- Cross-branch coherence: siblings decomposed independently can diverge. Needs a coherence check at each level.

**Hard limits:** Depth limited to what the native orchestrator can drive (2-3 practical levels). Cannot go deeper without `claude -p` workaround.

**Effort:** M -- Standard extension of existing patterns. ~4 modified files, 1 new template, no new skills.

---

### Solution B: Full Cascade Orchestrator (New Skill)

**What it is:** A standalone `cascade` skill with the complete file-based state machine, external orchestrator loop, full contract/amendment protocol with YAML-based contracts, parallel-then-reconcile execution, and status tracking. Uses `claude -p` for recursion beyond depth 1. The complete vision from the original idea.

**Why it works:** Maximum flexibility and depth. Full amendment negotiation with bubble-until-absorbed propagation. Proper state machine with crash recovery. Independent of existing skills -- can be used standalone or integrated into the pipeline.

**Key components:**
- New `cascade` skill with SKILL.md, workflows (kickoff, decompose, implement, verify, resume)
- New contract and amendment YAML formats
- Status state machine (10 states, file-based tracking)
- Orchestrator script (polls status files, spawns agents, enforces concurrency limits)
- `cascade.yaml` global config (stopping criteria, parallel policy, budget caps)
- CASCADE.md root manifest per project

**Dependencies:** `claude -p` for depth >1 (trades visibility for recursion). Bash for orchestrator script.

**Pitfalls:**
- `claude -p` loses all visibility and error handling from parent agents
- High complexity: 10+ files to build and maintain as a new skill
- Cost: full cascade at depth 4 can hit $300-800+ per run
- Duplicates functionality already in architect (perspective analysis, QA, decision tracking)
- No production precedent for bi-directional amendment negotiation at this depth

**Hard limits:** `claude -p` is a separate OS process with no structured communication. Concurrent file writes risk corruption. API rate limits cap practical parallelism at 3-5 agents per level.

**Effort:** XL -- Novel system design, 10+ new files, new skill, no existing patterns to reuse for the orchestrator.

---

### Solution C: ADAPT-Style Lazy Cascade (Decompose on Overflow)

**What it is:** Don't cascade upfront at all. Use the existing architect -> ladder-build pipeline as-is. Add overflow detection at implementation time: when a leaf agent discovers its task exceeds 250 lines, it stops, reports the overflow, and triggers automatic decomposition of just that task. Contracts are written only when decomposition actually occurs. Most tasks execute directly; only genuinely complex ones get recursive treatment.

**Why it works:** Aligned with ADAPT research showing decompose-on-failure outperforms static pre-decomposition. Zero overhead for tasks that don't need it (which is most of them). The cascade only activates where the problem actually is, not where the architect guessed it would be.

**Key components:**
- Modified `execute.md` workflow in ladder-build -- add overflow detection (>300 lines = stop and report)
- New `overflow-decompose.md` workflow -- takes a failed leaf task, decomposes it into 2-4 sub-tasks, creates sub-contracts
- Extended task-spec template -- same parent/children fields as Solution A
- Calibration feedback loop -- track actual vs estimated sizes, adjust future decomposition heuristics

**Dependencies:** None beyond existing ladder-build and architect.

**Pitfalls:**
- Reactive, not proactive -- discovers problems late (during implementation, not planning)
- No upfront interface contracts between subtasks -- contracts written after the fact
- The user sees implementation failures before they see the decomposition, which feels like rework
- Doesn't address the original vision of proactive hierarchical design

**Hard limits:** Cannot pre-negotiate interfaces between components that haven't been decomposed yet. Cross-cutting concerns still discovered late.

**Effort:** S -- Minimal new code. 1 new workflow, minor extensions to 2 existing files.

---

### Solution D: Hybrid -- Augmented Architect + ADAPT Overflow (Recommended)

**What it is:** Combine Solution A's proactive size-aware decomposition with Solution C's lazy overflow handling. The architect proactively decomposes tasks it estimates as large (>400 lines) with interface contracts. But it doesn't try to perfectly predict every case -- ladder-build gets ADAPT-style overflow detection as a safety net. When an implementation agent overflows, it triggers decomposition for that specific task, and the contracts from neighboring tasks (already defined by the architect) guide the sub-decomposition.

**Why it works:** Gets the best of both worlds. Proactive decomposition catches the obvious large tasks and defines interfaces between them. Lazy overflow catches the tasks the architect underestimated. The contract infrastructure from Solution A is in place for when decomposition happens, but you don't pay the overhead for tasks that don't need it.

**Key components:**
- Everything from Solution A (extended task-spec, amendment template, recursive plan step)
- Overflow detection from Solution C (ladder-build stops at >300 lines, triggers sub-decomposition)
- The architect's perspective analysis runs at L0 only (not recursively) -- sub-decomposition is lighter weight
- Cross-cutting concerns identified at L0 and propagated as contract invariants

**Dependencies:** None beyond existing infrastructure.

**Pitfalls:**
- Two decomposition paths (proactive and reactive) mean two code paths to maintain
- The stopping threshold still needs empirical tuning
- Cross-branch coherence check needed at each level (same as Solution A)

**Hard limits:** Same as Solution A -- depth limited to 2-3 within native Claude Code capabilities.

**Effort:** M -- Solution A's effort plus a small overflow workflow in ladder-build.

---

### Solutions Compared

| Aspect | A: Augmented Architect | B: Full Cascade | C: ADAPT Lazy | D: Hybrid (Rec.) |
|--------|----------------------|-----------------|---------------|-------------------|
| Effort | M | XL | S | M |
| Max depth | 2-3 (native) | 4+ (`claude -p`) | 2 (reactive) | 2-3 (native) |
| Overhead for small tasks | Low | High | None | None |
| Contract infrastructure | Yes | Full | Minimal | Yes |
| Amendment protocol | Extends deviation rules | Full bi-directional | None | Extends + overflow |
| Cross-cutting handling | L0 invariants | Full propagation | Late discovery | L0 invariants + safety net |
| Pipeline disruption | Low | High (new skill) | Low | Low |
| Recovers from bad estimates | No (static plan) | Amendment protocol | Yes (overflow) | Yes (both paths) |
| Cost per run | Low-Medium | High ($300-800) | Lowest | Low-Medium |
| Best when... | Tasks are predictably sized | Genuinely massive projects (10K+ lines) | Most tasks fit in 250 lines | Mix of simple and complex tasks |

**Recommendation: Solution D (Hybrid).** It gives you the proactive interface design benefits of recursive decomposition (the "contract between components" value from your original idea) without the cost and complexity of a full cascade system. The ADAPT overflow path is a cheap safety net for estimation errors. The path to Solution B remains open -- if Solution D proves that the contract format and amendment protocol work well, you can build the full orchestrator later with proven primitives.

---

## Next Steps -- Toward the Full Solution

1. **Extend the task-spec template** with `parent_task`, `children`, `decomposition_level`, and `traces_to` fields. Backward-compatible -- existing specs have no parent, level 0. *(Starting now)*
2. **Create the amendment-record template** -- structured objection with problem, evidence, proposed change, and sibling impact assessment.
3. **Add the recursive decomposition step** to architect's `plan.md` workflow. After creating initial task specs, check estimated size. Threshold tasks get sub-decomposed.
4. **Add overflow detection** to ladder-build's `execute.md` workflow. When a leaf agent exceeds 300 lines, stop, checkpoint, trigger sub-decomposition.
5. **Prototype on a real task** -- pick a medium-large feature (800-1500 lines), run through the augmented pipeline, calibrate the stopping threshold from actual results.

**Recommended path:** Build Solution D incrementally. Start with the template extensions and one manual recursive decomposition on a real task. Use the results to calibrate the stopping threshold before automating the recursive step in the workflow. The contract format and amendment protocol will be validated by real usage, not speculation.

### Build Plans

| Plan | Goal | Milestones | Effort | Depends On |
|------|------|------------|--------|------------|
| Template Extensions | Add parent/children/traces_to to task-spec, create amendment-record template | 2 | S | None |
| Recursive Plan Step | Add size-aware decomposition to architect plan.md workflow | 3 | M | Template Extensions |
| Overflow Detection | Add >300-line detection and sub-decomposition to ladder-build execute.md | 2 | S | Template Extensions |
| Calibration Run | Prototype on a real task, tune stopping threshold | 1 | S | Recursive Plan Step |

**Recommended order:** Template Extensions -> Recursive Plan Step -> Overflow Detection -> Calibration Run

---

## Where This Can Fail

- **Over-engineering the contract protocol:** The system decomposes and writes contracts for a 300-line feature that a single agent could have built in 2 minutes. The contract overhead exceeds the implementation. -- **Trigger:** Stopping threshold set too low, or decomposition activated for tasks <400 lines. -- **Fallback:** Hard minimum task size floor (100 lines). If decomposition would produce tasks below this floor, implement directly. Track contract-to-code ratio; if contracts >30% of implementation lines, the threshold needs raising.

- **Cross-branch semantic divergence:** Two sibling branches independently implement incompatible versions of a shared concern (e.g., different error response formats, different auth patterns). The contracts are satisfied but the implementations don't compose. -- **Trigger:** Cross-cutting concerns not identified at L0, or identified but specified as abstract guidelines ("follow standard patterns") instead of concrete code-level contracts. -- **Fallback:** Mandatory cross-branch coherence check after each level of decomposition. An agent reads ALL sibling contracts and flags interface or pattern inconsistencies before any child proceeds. Foundation sprint builds shared infrastructure first.

- **Amendment protocol becomes a bottleneck:** Amendments propagate upward through multiple levels, each requiring a reconciliation round. A 3-level cascade with active amendment negotiation at each level turns a 5-minute decomposition into a 30-minute back-and-forth. -- **Trigger:** More than 30% of tasks file amendments, or amendments propagate past depth 1 frequently. -- **Fallback:** After 2 failed reconciliation rounds, escalate directly to the user with numbered options instead of continuing automatic negotiation. Track amendment frequency as a health metric -- high rates mean the initial decomposition was wrong, not that the amendment protocol needs more rounds.

- **Cost explosion from uncontrolled recursion:** The cascade decomposes aggressively, spawning 40+ agents for a task that could have been built by 3. Token consumption hits millions before anyone notices. -- **Trigger:** No budget caps, stopping threshold too sensitive, or decomposition applied to projects <2K lines. -- **Fallback:** Hard per-cascade token budget in cascade.yaml. Model tiering (Opus for L0 only, Sonnet/Haiku for leaves). The "just do it" threshold table above -- tasks <2K lines should never enter the cascade.

---

## Sources

- [Claude Code subagent documentation](https://code.claude.com/docs/en/sub-agents) -- accessed 2026-04-07
- [Claude Code agent teams documentation](https://code.claude.com/docs/en/agent-teams) -- accessed 2026-04-07
- [Claude API context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- accessed 2026-04-07
- [Claude API rate limits](https://platform.claude.com/docs/en/api/rate-limits) -- accessed 2026-04-07
- [GitHub Issue #4182 -- Task tool missing from subagents](https://github.com/anthropics/claude-code/issues/4182) -- accessed 2026-04-07
- [GitHub Issue #15487 -- maxParallelAgents (closed NOT PLANNED)](https://github.com/anthropics/claude-code/issues/15487) -- accessed 2026-04-07
- [GitHub Issue #25569 -- 32K subagent output limit](https://github.com/anthropics/claude-code/issues/25569) -- accessed 2026-04-07
- [GitHub Issue #29217 -- concurrent file write corruption](https://github.com/anthropics/claude-code/issues/29217) -- accessed 2026-04-07
- [claude-recursive-spawn (community tool)](https://github.com/haasonsaas/claude-recursive-spawn) -- accessed 2026-04-07
- [Why Your Multi-Agent System Is Failing: 17x Error Trap (Towards Data Science)](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/) -- accessed 2026-04-07
- [The Multi-Agent Trap (Towards Data Science)](https://towardsdatascience.com/the-multi-agent-trap/) -- accessed 2026-04-07
- [Why Do Multi-Agent LLM Systems Fail? MAST (arXiv 2503.13657)](https://arxiv.org/abs/2503.13657) -- accessed 2026-04-07
- [Single-Agent Outperforms Multi-Agent (arXiv)](https://arxiv.org/html/2604.02460) -- accessed 2026-04-07
- [ADAPT: As-Needed Decomposition and Planning (Allen AI)](https://allenai.github.io/adaptllm/) -- accessed 2026-04-07
- [Agent Behavioral Contracts (arXiv 2602.22302)](https://arxiv.org/abs/2602.22302) -- accessed 2026-04-07
- [Agent Contracts: Formal Framework (Ye & Tan, COINE 2026)](https://arxiv.org/html/2601.08815v1) -- accessed 2026-04-07
- [Correct-by-Construction Decomposition (arXiv)](https://arxiv.org/html/1909.02070) -- accessed 2026-04-07
- [Algebra of Contracts (UC Berkeley)](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2022/EECS-2022-99.pdf) -- accessed 2026-04-07
- [PMI WBS Principles](https://www.pmi.org/learning/library/work-breakdown-structure-basic-principles-4883) -- accessed 2026-04-07
- [Design by Contract (Wikipedia)](https://en.wikipedia.org/wiki/Design_by_contract) -- accessed 2026-04-07
- [Consumer-Driven Contract Testing (Pact)](https://docs.pact.io/) -- accessed 2026-04-07
- [Contract Net Protocol (Wikipedia)](https://en.wikipedia.org/wiki/Contract_Net_Protocol) -- accessed 2026-04-07
- [Addy Osmani -- The Code Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/) -- accessed 2026-04-07
- [CrewAI Hierarchical Process docs](https://docs.crewai.com/en/learn/hierarchical-process) -- accessed 2026-04-07
- [AutoGPT Issue #3233 -- goal tracking loops](https://github.com/Significant-Gravitas/AutoGPT/issues/3233) -- accessed 2026-04-07
- [MAST Taxonomy -- Hierarchical Multi-Agent Systems (arXiv)](https://arxiv.org/html/2508.12683) -- accessed 2026-04-07
- [Context Rot (Chroma Research)](https://research.trychroma.com/context-rot) -- accessed 2026-04-07
- [Neurosymbolic Contract Layer (arXiv)](https://arxiv.org/pdf/2508.03665) -- accessed 2026-04-07
- Existing codebase: architect SKILL.md, plan.md, review.md, task-spec.md, sprint-management.md, architecture-patterns.md; ladder-build SKILL.md, execute.md, kickoff.md, build-milestone.md, milestone-design.md, impact-analysis.md
