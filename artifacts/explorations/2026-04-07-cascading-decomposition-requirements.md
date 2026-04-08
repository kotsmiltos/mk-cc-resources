> **type:** requirements
> **output_path:** artifacts/explorations/2026-04-07-cascading-decomposition-requirements.md
> **exploration:** artifacts/explorations/2026-04-07-cascading-decomposition-exploration.md
> **key_decisions:** User-gated fresh sessions between levels; dual representation (human .md + agent .agent.md); many small files assembled into agent briefs at spawn time; 1 module per decomposition agent; tiered parallel batches; positive-only constraints in agent briefs; unlimited decomposition depth; feature flow with discovery phase for existing projects
> **open_questions:** none — all decisions made during exploration and refinement

# Requirements: Cascading Hierarchical Decomposition Pipeline

## 1. What This Is

A transformation of the existing miltiaze -> architect -> ladder-build pipeline into a multi-level decomposition system where:

- **Any size project or feature** gets broken down through as many levels as necessary until every implementation unit is <=250 lines with zero ambiguity
- **The user is the orchestrator** — they trigger each level, review output, approve/reject/correct, and proceed
- **Each level is a fresh session** — all state lives on disk as handoff artifacts
- **Every artifact has dual representation** — human-facing (markdown with explanations, rationale, questions) and agent-facing (YAML+XML, contract only, positive constraints)
- **Decomposition is parallelized** — each agent handles exactly 1 module/component, spawned in tiered batches of 3-5
- **Implementation agents have zero creative freedom** — by leaf level, there are no decisions left to make

This works for both greenfield projects and features on existing codebases.

## 2. Core Requirements

### 2.1 Unlimited Decomposition Depth

The system decomposes as deep as needed. No preset level cap. The stopping criterion per node is: "Can a single agent implement this in <=250 lines without making any architectural decision?" If yes, it's a leaf task. If no, decompose further.

- Small project: 2 levels (modules -> leaf tasks)
- Medium project: 3 levels (modules -> components -> leaf tasks)
- Large project: 4-5+ levels (as many as needed)
- The protocol is identical at every level

### 2.2 Fresh Sessions with Handoff

Each decomposition level runs in a fresh Claude session. No context accumulation between levels. All state is on disk.

- The user triggers each level with a command (e.g., `/architect decompose level-N [target]`)
- The fresh session reads INDEX.md to understand project state, then reads relevant files
- Output is written to disk as artifacts
- The user reviews, approves/rejects/corrects, then triggers the next level in a new session

### 2.3 Dual Representation

Every artifact exists in two forms:

**Human doc (.md):**
- Markdown with explanations, rationale, decision context
- Contains questions for the user where decisions are needed
- References to related artifacts and research
- As long as needed for clarity — no arbitrary line limits

**Agent brief (.agent.md):**
- YAML frontmatter for structured metadata
- XML section tags for content boundaries (following Claude Code conventions)
- Positive framing only — "USE ONLY X" never "don't use Y" (research shows negation backfires in LLMs)
- Constraints and critical instructions front-loaded (primacy bias — first-seen instructions get highest attention)
- No rationale, no alternatives, no "why" — only the executable contract
- Every line must carry signal — no filler

The human doc is the source of truth (authored by decomposition agents, reviewed by user). The agent brief is derived from the human doc.

### 2.4 Many Small Files

Each breakdown unit gets its own file. No monolithic scope documents. An agent reads only the files relevant to its job.

**At spawn time, the orchestrator ASSEMBLES an agent brief** from multiple small files into a single document. The agent sees one focused brief, not 15 separate files.

### 2.5 Parallel Decomposition

At each level, the orchestrator spawns decomposition agents in parallel:

- **1 module/component per agent** — never ask one agent to detail 5+ independent items (research: quality degrades on items 4+ due to "lazy tail" / primacy bias / lost-in-the-middle effect)
- **Tiered batches:** Core/foundation modules first (sequential), then independent feature modules (parallel, batches of 3-5), then integration modules last
- **Consistency verification agent** after each batch — checks interface alignment across all specs
- **Architecture Contract** shared with all parallel agents to maintain consistency

### 2.6 Anti-Laziness / Anti-Hallucination

- **DECISIONS.md** records every architectural decision as final. Implementation agents read it and cannot revisit decided questions.
- **PATTERNS files** contain concrete code examples, not abstract guidelines. "Follow this exact pattern" with actual code, not "use standard error handling."
- **Agent briefs use positive-only constraints** — "USE ONLY stdlib + sqlite3" not "don't use external packages"
- **Front-loaded constraints** in agent briefs — critical rules at the top where attention is highest
- **Overflow detection** at implementation time — agent stops at 300 lines and reports back for further decomposition
- **1 module per agent** at decomposition time — each agent does one focused job

### 2.7 Feature Flow (Existing Projects)

The pipeline supports adding features to existing codebases, not just greenfield. The difference:

- **Discovery phase** scans existing codebase to understand current architecture
- **Impact map** traces which existing files/modules the feature touches
- **Architecture phase** maps the feature ONTO existing code, doesn't design from scratch
- **Task specs for modified files** include current state (line numbers, existing patterns) and specific changes required
- **Patterns reference existing code** — "follow the pattern in auth/service.py:create_user()" not invented patterns

## 3. Use Cases

### UC1: Greenfield Project
User has an idea for a new project. Pipeline researches it, gathers requirements, decomposes into modules -> components -> leaf tasks, implements each task.

### UC2: Large Feature on Existing Project
User wants to add a substantial feature to an existing codebase. Pipeline discovers the existing architecture, maps the feature's impact, decomposes the feature work into tasks that create new files AND modify existing files.

### UC3: Complex Refactor
User wants to restructure existing code. Pipeline discovers current architecture, maps the refactor's scope, decomposes into safe incremental steps.

### UC4: Resuming Work
User starts a decomposition, stops mid-way, comes back later. INDEX.md tracks what's done, what's pending. A fresh session reads INDEX.md and picks up where the last session left off.

## 4. The Pipeline Phases

### Phase 1: Research & Requirements (miltiaze)

**Input:** User's idea or feature description
**Output:** `brief/project-brief.md` + `brief/project-brief.agent.md`
**What happens:**
1. miltiaze explores the idea (existing behavior)
2. Structured requirements Q&A with the user (use cases, constraints, NFRs, out-of-scope)
3. Creates INDEX.md as the master routing table
4. Writes project brief in dual format

### Phase 2: Discovery (architect — features only, skip for greenfield)

**Input:** Feature brief + existing codebase
**Output:** `discovery/codebase-snapshot.md` + `discovery/impact-map.md` + agent versions
**What happens:**
1. Spawns discovery agents to scan existing codebase
2. Maps existing architecture (modules, boundaries, patterns, conventions)
3. Traces impact — which files/functions does this feature touch?
4. Identifies existing patterns the feature must follow
5. User reviews impact map, confirms/corrects scope

### Phase 3: Architecture (architect Level 0)

**Input:** Project/feature brief + (discovery output if feature)
**Output:** architecture/ directory with system-map, contracts, patterns, decisions
**What happens:**
1. Single agent or small team decomposes into top-level modules (3-8)
2. Defines interface contracts between modules (signatures, types, guarantees)
3. Identifies cross-cutting concerns and writes concrete patterns
4. Records all architectural decisions
5. Assigns dependency tiers (core -> feature -> integration)
6. User reviews architecture, approves/rejects/modifies

### Phase 4: Module Design (architect Level 1)

**Input:** Architecture output
**Output:** modules/*/overview.md + overview.agent.md
**What happens:**
1. Identifies tiers from architecture
2. Tier 1 (core): Spawns 1-2 agents sequentially for foundation modules
3. Tier 2 (features): Spawns parallel agents (1 per module, batches of 3-5)
4. Post-batch: Spawns consistency verification agent
5. Tier 3 (integration): Spawns agents that have Tier 1+2 as context
6. Each agent decomposes ONE module into components with internal interfaces
7. Components estimated >250 lines get flagged for further decomposition
8. Components <=250 lines get marked as leaf-ready
9. User reviews all module designs, per-module approve/reject

### Phase 5+: Component Design (architect Level 2, 3, ...)

**Input:** Module designs
**Output:** components/*/spec.md + spec.agent.md, or tasks/*.md + tasks/*.agent.md
**What happens:**
1. Same protocol as Level 1 but for components within a module
2. Parallel agents, 1 per component
3. Continue until all leaf tasks are <=250 lines
4. User can target specific modules: `/architect decompose level-2 auth api`
5. User can decompose different modules to different depths

### Phase 6: Implementation (ladder-build)

**Input:** Leaf task agent briefs
**Output:** Code
**What happens:**
1. Reads INDEX.md, identifies ready-for-implementation tasks
2. Builds dependency graph across leaf tasks
3. Groups into waves (tasks with no unmet dependencies execute in parallel)
4. Spawns 1 agent per task (batches of 3-5)
5. Each agent receives assembled agent brief (project context + patterns + decisions + task spec)
6. Each agent implements exactly what the spec says, nothing more
7. Overflow detection: >300 lines = stop, report, needs further decomposition
8. After each wave: verify interface contracts between completed tasks
9. User reviews implementation

### Phase 7: Verification (architect review)

**Input:** Task specs + actual code produced
**Output:** Verification report
**What happens:**
1. For each task: does the code satisfy acceptance criteria?
2. Cross-module: do interface contracts hold?
3. Cross-cutting: do all files follow patterns?
4. For features: is existing code still correct?

## 5. File Structure

### Greenfield Project
```
artifacts/scope/
  INDEX.md                              # Master routing table
  brief/
    project-brief.md                    # Human: requirements + user decisions
    project-brief.agent.md              # Agent: structured requirements
  architecture/
    system-map.md                       # Human: module boundaries + rationale
    system-map.agent.md                 # Agent: module defs + dependency tiers
    contracts/                          # 1 file per interface boundary
      <module-a>--<module-b>.md
    patterns/                           # 1 file per cross-cutting pattern
      <pattern-name>.md
    decisions/                          # 1 file per architectural decision
      D001-<slug>.md
  modules/
    <module-name>/
      overview.md                       # Human: module design
      overview.agent.md                 # Agent: component list + interfaces
      components/
        <component-name>/
          spec.md                       # Human: component design
          spec.agent.md                 # Agent: interfaces + constraints
          tasks/                        # Leaf tasks (if further decomposed)
            task-NN-<slug>.md
            task-NN-<slug>.agent.md
```

### Feature on Existing Project
```
artifacts/scope/features/<feature-slug>/
  INDEX.md
  brief/
    feature-brief.md
    feature-brief.agent.md
  discovery/
    codebase-snapshot.md                # Existing architecture as understood
    impact-map.md                       # Files/modules affected by this feature
    impact-map.agent.md
  architecture/
    feature-map.md                      # How feature maps onto existing code
    feature-map.agent.md
    contracts/                          # New or MODIFIED contracts
    patterns/                           # References to existing patterns
    decisions/
  modules/
    <existing-module>/                  # Existing module being modified
      changes.md                        # What changes for this feature
      changes.agent.md
      tasks/
        task-NN-<slug>.md               # Tasks that modify existing files
        task-NN-<slug>.agent.md
    <new-module>/                       # New module being added
      overview.md
      overview.agent.md
      components/...
```

## 6. Key Artifact Formats

### INDEX.md (Master Routing Table)
```markdown
# Scope Index: [Project/Feature Name]

## Status
- Phase: architecture | decomposition-L1 | decomposition-L2 | implementation | verification
- Last level completed: 1
- Modules: 5 total (3 decomposed, 2 pending)
- Leaf tasks: 12 ready, 8 pending decomposition

## Module Status
| Module | Tier | Level | Components | Leaf Tasks | Status |
|--------|------|-------|------------|------------|--------|
| storage | 1 | L1 done | 3 | 3 ready | ready |
| auth | 2 | L2 done | 4 | 8 ready | ready |
| api | 2 | L1 done | 5 | — | needs L2 |
| notifications | 2 | L1 done | 2 | 2 ready | ready |
| gateway | 3 | pending | — | — | blocked by api |

## Files
- Brief: brief/project-brief.md
- Architecture: architecture/system-map.md
- Contracts: architecture/contracts/ (6 files)
- Patterns: architecture/patterns/ (3 files)
- Decisions: architecture/decisions/ (5 files)
```

### Human Doc Format (example: module overview)
Standard markdown with:
- Metadata blockquote (type, module, level, status)
- Narrative sections explaining design and rationale
- Tables for component breakdowns
- Questions for user where decisions are needed
- References to contracts, patterns, decisions

### Agent Brief Format (example: decomposition agent)
```yaml
---
type: agent-brief
purpose: decompose-module
module: auth
level: 1
scope_root: artifacts/scope/
---
```
```xml
<context>
  <project>Trading platform with real-time market data, user auth, order execution.</project>
  <architecture_constraints>
    - Event-driven communication between modules
    - All data access through repository pattern
    - PostgreSQL for persistence, Redis for caching
  </architecture_constraints>
</context>

<your_module name="auth">
  <owns>User authentication, session management, role-based access control</owns>
  <boundary>auth/ directory. All files under auth/ are yours.</boundary>
</your_module>

<interfaces>
  <contract with="api">
    auth exposes: validate_token(token: str) -> Claims | None
    auth exposes: require_role(role: str) -> Decorator
    api calls these on every protected endpoint
  </contract>
  <contract with="storage">
    auth calls: user_repo.get_by_id(id) -> User | None
    auth calls: session_repo.store(session) -> bool
  </contract>
</interfaces>

<patterns>
  <pattern name="error-handling">
    from app.errors import AppError
    # All auth errors: raise AppError(status, code, message)
    # Valid codes: AUTH_INVALID, AUTH_EXPIRED, AUTH_FORBIDDEN
  </pattern>
  <pattern name="repository-access">
    from app.repos import user_repo, session_repo
    # Always access data through repos, never import models directly
  </pattern>
</patterns>

<decisions>
  <decision id="D001">JWT with RS256 for access tokens, 15min expiry</decision>
  <decision id="D002">PostgreSQL for refresh token storage</decision>
  <decision id="D005">RBAC with role hierarchy: admin > manager > user</decision>
</decisions>

<task>
  Decompose the auth module into components.
  For each component: name, purpose, interfaces it exposes, interfaces it consumes,
  estimated implementation lines, files it will create/modify.
  Flag components estimated >250 lines for further decomposition.
  Mark components <=250 lines as leaf-ready with full task specs.
</task>

<output_format>
  Write to: artifacts/scope/modules/auth/
  - overview.md (human doc: design with rationale)
  - overview.agent.md (agent brief: structured component list)
  - For each leaf-ready component: components/<name>/spec.md + spec.agent.md
</output_format>
```

### Agent Brief Format (example: implementation agent)
```yaml
---
type: agent-brief
purpose: implement
task: task-01-jwt-service
module: auth
component: jwt-service
---
```
```xml
<context>
  <project>Trading platform. Auth module handles JWT tokens, sessions, RBAC.</project>
</context>

<constraint>
  - Use ONLY: stdlib, PyJWT, SQLAlchemy (already in requirements.txt)
  - Sign with RS256 algorithm exclusively (decision D001)
  - Access tokens expire in 15 minutes exactly
  - Import data access ONLY through app.repos (decision D002)
  - Follow error pattern: raise AppError(status, code, message)
  - All functions include type hints
</constraint>

<read_first>
  - auth/types.py (TokenPair and Claims dataclasses — use these exactly)
  - storage/models.py (RefreshToken model — query through repo)
  - app/repos/token_repo.py (store, get, delete, delete_by_user)
</read_first>

<interface>
  <function name="create_token_pair">
    <param name="user_id" type="str">UUID from auth module</param>
    <param name="roles" type="list[str]">User's role list</param>
    <returns type="TokenPair">Access + refresh token pair</returns>
    <steps>
      1. Build claims dict: user_id, roles, exp (now + 15min), iat (now)
      2. Encode access token with jwt.encode(claims, private_key, algorithm="RS256")
      3. Generate refresh token: secrets.token_urlsafe(32)
      4. Hash refresh token with hashlib.sha256
      5. Store hash via token_repo.store(user_id, token_hash, expires_at=now+7days)
      6. Return TokenPair(access_token, refresh_token, expires_at)
    </steps>
  </function>

  <function name="validate_access_token">
    <param name="token" type="str">JWT string</param>
    <returns type="Claims | None">Decoded claims or None</returns>
    <steps>
      1. Try jwt.decode(token, public_key, algorithms=["RS256"])
      2. If DecodeError or ExpiredSignatureError: return None
      3. Build Claims from decoded payload
      4. Return Claims
    </steps>
  </function>

  <function name="refresh_access_token">
    <param name="refresh_token" type="str">Raw refresh token</param>
    <returns type="TokenPair | None">New pair or None</returns>
    <steps>
      1. Hash the refresh_token with sha256
      2. Look up via token_repo.get(token_hash)
      3. If not found or expired: return None
      4. Delete old token via token_repo.delete(token_hash)
      5. Create new token pair via create_token_pair(stored.user_id, stored.roles)
      6. Return new TokenPair
    </steps>
  </function>

  <function name="revoke_refresh_token">
    <param name="refresh_token" type="str">Raw refresh token</param>
    <returns type="bool">True if revoked</returns>
    <steps>
      1. Hash the refresh_token with sha256
      2. Delete via token_repo.delete(token_hash)
      3. Return True
    </steps>
  </function>

  <function name="revoke_all_user_tokens">
    <param name="user_id" type="str">User UUID</param>
    <returns type="int">Count of revoked tokens</returns>
    <steps>
      1. Delete all via token_repo.delete_by_user(user_id)
      2. Return count
    </steps>
  </function>
</interface>

<files>
  <file path="auth/jwt_service.py" action="CREATE">
    All 5 functions above. Import from auth.types, app.repos, app.errors.
  </file>
  <file path="tests/auth/test_jwt_service.py" action="CREATE">
    Test each function: valid input, invalid input, edge cases below.
  </file>
</files>

<verify>
  <assertion>create_token_pair returns TokenPair with decodable JWT access token</assertion>
  <assertion>access token claims contain user_id and roles</assertion>
  <assertion>validate_access_token returns Claims for valid token</assertion>
  <assertion>validate_access_token returns None for expired token</assertion>
  <assertion>validate_access_token returns None for tampered token</assertion>
  <assertion>validate_access_token returns None for HS256-signed token (wrong algorithm)</assertion>
  <assertion>refresh_access_token returns new TokenPair and invalidates old refresh token</assertion>
  <assertion>refresh_access_token returns None for unknown refresh token</assertion>
  <assertion>revoke_refresh_token returns True and subsequent refresh fails</assertion>
  <assertion>revoke_all_user_tokens deletes all user's refresh tokens</assertion>
  <edge_case input="expired refresh token">returns None, does not create new pair</edge_case>
  <edge_case input="refresh same token twice">second call returns None (already rotated)</edge_case>
</verify>

<contract>
  <receives from="auth/types.py">TokenPair, Claims dataclasses</receives>
  <receives from="app/repos/token_repo.py">store, get, delete, delete_by_user</receives>
  <provides to="auth/middleware.py">validate_access_token(token) -> Claims | None</provides>
  <provides to="auth/session_service.py">revoke_all_user_tokens(user_id) -> int</provides>
</contract>
```

## 7. What Changes in Each Existing Skill

### miltiaze
- **Requirements workflow** outputs to `artifacts/scope/[features/<slug>/]brief/` in dual format
- **More structured Q&A:** Use cases, constraints, NFRs, out-of-scope as separate subsections
- **Creates INDEX.md** as the master routing table
- Output must be self-contained for a fresh session to consume

### architect
- **New command:** `/architect decompose level-N [target]` — works at any level
- **New workflow:** `scope-decompose.md` — generic for any level, reads INDEX.md to determine state
- **New workflow:** `scope-discover.md` — scans existing codebase for feature flow
- **New behavior:** Spawns parallel decomposition agents (1 per module/component) in tiered batches
- **New behavior:** Spawns consistency verification agent after each batch
- **New behavior:** Assembles agent briefs from small files at spawn time
- **Dual output:** Every artifact gets .md (human) + .agent.md (agent)
- **Decision tracking:** Every decision gets its own file in decisions/
- **INDEX.md updates:** Every level updates the master routing table

### ladder-build
- **Reads task specs** from `scope/modules/*/components/*/tasks/` (agent briefs)
- **Assembled context:** Each implementation agent gets project context + patterns + decisions + task spec assembled into one brief
- **Overflow detection:** >300 lines = stop, report, needs deeper decomposition
- **Interface verification** after each wave of implementations

### New shared artifacts
- INDEX.md template
- Agent brief assembly logic (reads small files, produces one brief)
- Consistency verification agent prompt template
- Decision record template
- Interface contract template
- Cross-cutting pattern template

## 8. Non-Functional Requirements

### NFR1: Self-Contained Handoff
Every level's output must be readable by a cold-start fresh session with zero prior context. INDEX.md is the entry point. No implicit knowledge. No "as we discussed."

### NFR2: Resumability
If work is interrupted at any point, INDEX.md + the file tree is sufficient to resume. No in-memory state. Everything on disk.

### NFR3: Incremental
You don't have to decompose the entire project before starting implementation. If one module is fully decomposed while others are pending, you can implement that module.

### NFR4: Quality Over Speed
The system decomposes until there's nothing left to decide, even if that takes 5 levels and 50 agents. Cost and token count are not constraints. Quality of the final artifact is.

### NFR5: Existing Code Safety
For features on existing projects, task specs must specify exactly what changes and what stays untouched. Implementation agents must preserve existing behavior unless explicitly told to change it.

## 9. Acceptance Criteria

### AC1: Greenfield Flow
Given a project idea, the pipeline produces leaf task specs where each spec is <=250 lines, contains no architectural decisions, and an implementation agent can execute it without asking questions.

### AC2: Feature Flow  
Given an existing codebase and a feature request, the pipeline produces an impact map, correctly identifies affected files, and produces task specs that create new code AND safely modify existing code.

### AC3: Dual Representation
Every artifact exists as .md (human-readable with rationale) and .agent.md (agent-executable with positive-only constraints). The agent brief is derived from the human doc.

### AC4: Parallel Decomposition
At Level 1+, the architect spawns parallel agents (1 per module/component). No agent decomposes more than 1 independent unit. Consistency is verified after each batch.

### AC5: Fresh Session Continuity
A fresh session can read INDEX.md and immediately understand: what the project is, what's been decided, what's been decomposed, and what needs to happen next.

### AC6: No Lazy Implementation
Implementation agents follow the spec exactly. Overflow detection catches underestimated tasks. Every acceptance criterion is verifiable.

## 10. Build Order

This pipeline transformation should itself be built using the existing architect -> ladder-build pipeline (eating our own cooking):

1. **Templates first** — INDEX.md, agent brief format, decision record, contract, pattern templates
2. **miltiaze requirements update** — output to scope/ in dual format
3. **architect scope-decompose workflow** — the core new workflow (level-agnostic, parallel, tiered)
4. **architect scope-discover workflow** — for feature flow
5. **architect brief-assembly logic** — read small files, produce assembled agent brief
6. **ladder-build scope integration** — read from scope/, assembled briefs, overflow detection
7. **Consistency verification agent** — prompt template + integration into decompose workflow
8. **End-to-end test** — pick a real project/feature, run through the full pipeline
