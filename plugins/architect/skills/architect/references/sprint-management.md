<sprint_management>

<overview>
How the architect designs sprints, sizes tasks, manages reassessment between sprints, and handles parallel execution. This reference is used by the plan and review workflows.
</overview>

<sprint_design>

<principles>
- Sprints serve the product, not the process — break only at decision gates, context limits, or natural scope boundaries
- A sprint is a set of tasks that can be executed and verified as a unit
- Sprints are designed by the architect, executed by ladder-build, verified by QA
- Each sprint produces working, verifiable output — never intermediate-only artifacts
- Sprint boundaries are set by decision gates (points where the next step depends on results so far), context limits (the session can no longer hold plan + build + test + verify), or natural scope boundaries (a coherent piece of functionality is complete and independently verifiable)
- Every sprint boundary must have a rationale: the sprint ends because [decision gate / context limit / scope boundary]. If you can't name the reason, the boundary is arbitrary — reconsider it.
- Full implementation is the goal. Don't break a sprint just because a timebox or task count convention says to. Break it when the product needs a checkpoint.
</principles>

<sizing_guidelines>
**Sprint sizes (by complexity, not task count):**
- **Small (S):** Low complexity. One component or feature, well-understood problem space. Straightforward implementation with no research or design decisions needed. Can be planned, built, tested, and verified in a focused session.
- **Medium (M):** Moderate complexity. A few connected components, or a single component requiring research, design decisions, or iteration. May involve tradeoffs that affect later sprints.
- **Large (L):** High complexity. A subsystem, major feature, or work spanning multiple coupled modules. Multiple design decisions, significant uncertainty, or extensive verification surface. Consider splitting — but split at a decision gate or scope boundary, not at an arbitrary task count.

Task count is a secondary signal, not a sizing criterion. A sprint with 7 straightforward tasks may be S. A sprint with 2 tasks that each require architectural decisions may be L.

**When to split a sprint:**
Primary criteria (split here):
- A decision gate exists — the next set of tasks depends on results, findings, or user input from the first set
- Context health is at risk — plan + build + test + verify for all tasks won't fit in one session
- A subset of tasks is independently verifiable and produces a complete, working piece of functionality

Secondary signals (consider splitting):
- High task count creates context pressure (more to hold in mind increases error risk)
- One task has significant uncertainty (isolate it so results inform the rest)
- QA will need extensive verification (leave room for thorough checks)
- Two subsets of tasks are independent (can be separate sprints executed in parallel)

**When to merge sprints:**
- Two planned sprints are both S and share context
- A sprint has only one trivial task (bundle with the next)
- Splitting would create artificial handoff overhead
</sizing_guidelines>

<task_design>
Each task within a sprint is designed using the task-spec template. Key principles:

**Self-contained:** A developer reads the task spec and builds from it. No need to ask the architect for clarification. If the spec requires clarification, the spec is incomplete — fix it before the sprint starts.

**Pseudocode specificity:** The pseudocode section is the core of the spec. It should be specific enough that translating to code is mechanical, not creative. Bad: "Process the data." Good: "Read each row from the CSV. For rows where `status == 'active'`, extract `name` and `score`. If `score > threshold`, add to results list. Return results sorted by score descending."

**Interface contracts:** Every task spec says what it receives and what it produces. If task 3 depends on task 1's output, the contract is explicit — data structure, file path, format.

**Acceptance criteria as assertions:** Written as testable checkboxes. QA will check every one. If a criterion can't be tested by reading the code and running it, rewrite it.

**Edge cases listed:** Not as an afterthought — as part of the spec. The developer handles them, QA tests for them.
</task_design>

<dependency_management>
Tasks within a sprint can have dependencies. The architect handles these:

**Independent tasks:** No dependencies on each other. Can be executed in parallel by separate subagents. Flag these in the task index with "Parallel: Yes."

**Sequential tasks:** Task B needs Task A's output. Execute in order. Flag in the task index with "Depends on: Task A."

**Shared-resource tasks:** Multiple tasks modify the same file or module. Either:
1. Order them sequentially to avoid conflicts
2. Scope them to different parts of the file (different functions, different sections)
3. Have one task create the file and the other extend it

**Cross-sprint dependencies:** A task in sprint N depends on a specific output from sprint N-1. The contract is in the task spec's Interface Specification section. The review workflow verifies the contract was satisfied before planning the dependent sprint.
</dependency_management>

</sprint_design>

<reassessment>

<when_to_reassess>
After EVERY sprint — no exceptions. The review workflow handles this. Even if QA passes with no issues, the architect reassesses because:
- The act of building reveals information the plan didn't have
- The next sprint's tasks may need adjustment based on what was learned
- Refactor opportunities from the completed sprint should be captured
</when_to_reassess>

<what_to_reassess>
1. **QA results:** What passed? What failed? What notes did QA leave?
2. **Plan accuracy:** Did the sprint go as planned? Were there surprises?
3. **Scope integrity:** Was anything silently dropped or simplified? (This is a critical check — scope reduction must be explicit)
4. **Architecture health:** Did the sprint introduce any coupling, complexity, or deviation from the design?
5. **Next sprint readiness:** Are the planned tasks still correct? Do they need amendment based on what was learned?
6. **Refactor opportunities:** Should any code from this sprint be cleaned up before building on it?
</what_to_reassess>

<reassessment_outputs>
- Updated PLAN.md (sprint tracking, change log, risk register)
- Refactor requests (if any) scheduled into the next sprint
- Next sprint task specs (created or amended)
- Summary for the user: what happened, what changed, what's next
</reassessment_outputs>

<replanning_triggers>
These trigger a more substantial replan (not just normal reassessment):
- QA finds critical issues that change the architecture
- A sprint takes much longer than estimated (scope was wrong)
- The user provides new requirements or changes priorities
- A technical discovery invalidates assumptions in future sprints
- Context fatigue makes the current plan unreliable

When replanning, update PLAN.md's Change Log with what changed and why. Never silently modify future sprints.
</replanning_triggers>

</reassessment>

<parallel_execution>

<when_to_parallelize>
Tasks or sprints can be parallelized when:
- They don't share file dependencies (no two tasks modify the same file)
- They don't have data dependencies (task B doesn't need task A's output)
- They belong to different modules with clear boundaries
- The combined context of parallel tasks doesn't exceed context health limits

**Flag parallel opportunities** in the task index and sprint tracking. ladder-build uses this information to spawn parallel subagents.
</when_to_parallelize>

<parallel_risks>
- **Merge conflicts:** Two parallel tasks modify adjacent code. Mitigate by scoping to different files or different sections.
- **Implicit dependencies:** Tasks seem independent but share a concept that changes. Mitigate by tracing impact before parallelizing.
- **Context fragmentation:** Each parallel subagent has its own context and may not see the other's changes. Mitigate by keeping parallel tasks truly independent.

**Rule:** When in doubt, execute sequentially. The overhead of sequential execution is lower than the cost of debugging parallel conflicts.
</parallel_risks>

</parallel_execution>

<context_health>

<monitoring>
Context is a finite budget. Every sprint consumes it: reading files, holding plan state, building, testing, verifying. The architect sizes sprints to fit within the budget, and both the architect and ladder-build monitor consumption during execution.

**Context budget model:** A sprint must fit plan + build + test + verify within a single session's context. If any of those phases would be squeezed out, the sprint is too large — split it at the nearest decision gate or scope boundary before starting, not after context is already strained.

**Signs of degradation (context budget exhausted):**
- Skimming files instead of reading fully
- Assuming function behavior without checking
- Skipping test runs
- Forgetting to update coupled files
- Simplifying error handling without acknowledgment
- Repeating work already done in the session

When these signs appear, the remaining context cannot support quality output. Do not push through — trigger the recovery protocol below.
</monitoring>

<recovery>
When context health degrades:
1. **Save progress:** Write what's been done to disk (milestone report, partial task completion)
2. **Hand off cleanly:** Create a continue-here document with: what's done, what's left, what was in-progress, any partial state
3. **Don't push through:** Degraded context produces degraded output. Better to hand off than to build broken work.
4. **Split the sprint:** If the sprint is too large, create a new sprint for the remaining tasks and update PLAN.md
</recovery>

</context_health>

</sprint_management>
