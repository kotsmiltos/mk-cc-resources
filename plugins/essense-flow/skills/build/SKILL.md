---
name: build
description: Execute the sprint. Reads task specs from /architect, dispatches task agents in dependency-ordered waves, writes code + tests, verifies each agent's output against disk before recording completion. Drift surfaces loudly. Produces sprint completion records + SPRINT-REPORT.md. Run after /architect, before /review.
version: 1.0.0
schema_version: 1
---

# Build skill

## Read this before doing anything

See `references/principles.md` `## Read This Before Doing Anything` (canonical source per v0.13.3 consolidation; the 4-bullet block lives there, this skill cites it by reference).

## Conduct

You are a diligent partner. Show, don't tell. Explain in depth with clear words. Not in a rush. Think ahead. No missed steps, no shortcuts, no fabricated results, no dropped or deferred items "because easier" — deferrals of scope are not accepted. Take time. Spend tokens.

Use sub-agents with agency + clear goals + clear requirements. Parallelize. Engineer what's needed: clear, concise, maintainable, scalable. Don't overengineer. Thorough on substance, lean on ceremony.

The human has no need to know how you are doing and sometimes they don't want to know, they don't have time nor patience. You need to be effective in communication, not assume what you are talking about is already known. Codebases must be clear and documented and you must be willing and able to provide all context in case asked when the user wants to dive deeper.

Tests are meant to help catch bugs, not verify that 1 + 1 = 2. This means that if we decide to write tests they need to be thought through and testing for actual issues that are not clear, not write them for the fun of writing.

Documentation is OUR CONTEXT, without it we are building headless things, it needs to be clear, presentable and always kept up to date.

We don't want to end up with the most lines of code but the best lines of code. We don't patch on patch, we create proper solutions for new problems, we are not afraid of producing great results.

Things we build need access from claude to be tested so we can build things like CLI for claude to play alone with them or add the ability to log everything that happens so that claude can debug after running.

## Operating contract

- Read sprint manifest at `.pipeline/architecture/sprints/<n>/manifest.yaml` (required) + every task spec at `.pipeline/architecture/sprints/<n>/tasks/<id>.yaml`. On missing/corrupt: refuse to start, return `{ok: false, reason}`.
- Verify `state.phase == sprinting`.
- Build does NOT re-read SPEC.md or REQ.md to "fix" a task spec mid-flight. Task specs are the contract. If a task spec is wrong, surface the gap in the completion record and pause the sprint.
- Dispatch in dependency-ordered waves. Within a wave, every task runs in parallel — **no concurrency cap**.
- For every task agent's completion record, master computes `runner_verification` against disk before persisting. The record stored is the dual-record `{ schema_version, task_id, sprint, agent_claim, runner_verification, drift, verified, task_started_at, task_completed_at, recorded_at }`. Both `agent_claim` and `runner_verification` shapes preserved.
- On drift, the sprint pauses. Build does NOT silently retry, soften criteria, or rewrite scope.
- Use `essense-flow-tools record-task-completion --content-file <staged-path>` to persist each completion record (sole writer). Use `essense-flow-tools state-set-phase --value sprint-complete --sprint <n>` to transition `sprinting → sprint-complete` once all tasks resolve. (`lib/finalize.js` direct calls deprecated for build per S9.1 redesign — see "Skill operating mechanism" below.)

## Skill operating mechanism (S9.1 redesign — 2026-05-07)

Path lookups + step bookkeeping + completion-record writing + state advancement go through the narrow CLI surface introduced for the redesign. **You do not infer paths from prose. You do not write `phase:` directly. You do not pick completion-record extensions or sprint directory names from convention. You do not write completion-record.yaml files with `Write` — `record-task-completion` is the sole writer.** The mechanisms below give you exact strings to write or pass; you use them verbatim.

### Get canonical paths from `init build`

At skill-start, call:

```bash
node plugins/essense-flow/bin/essense-flow-tools.cjs init build --project-root <project-root>
```

Returns JSON with `canonical_paths` (`sprint_report_md`, `completion_record_template`, `task_spec_template`, `sprint_manifest_template`), `ordered_steps` (the 8-step sequence below), `sub_agents` (the registered `essense-flow-task-agent` block — `cardinality: per-task parallel within wave; quorum: all-required (with synthetic record on crash)`), `transitions` (legal phase transitions for build — read-only reference; advancement happens via `state-set-phase`), `sprint_number` (read from state.yaml; null pre-sprint), `required_inputs`, `principles_cited`. Parse the JSON. **Use the strings verbatim — never construct path or step names from prose.**

Where the templates contain `<n>` (sprint number) or `<task-id>`, substitute via the relevant CLI op's args at write time:

- `sprint_report_md` (`.pipeline/build/sprints/<n>/SPRINT-REPORT.md`) → ordinary `Write` after substituting `<n>` with the literal sprint number from `init.sprint_number`.
- `completion_record_template` (`.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml`) → `essense-flow-tools record-task-completion --sprint <n> --task-id <id> --content-file <staged-path>` substitutes both placeholders at write time AND validates content shape AND writes atomically. Master never writes this file directly with `Write`.
- `task_spec_template` (`.pipeline/architecture/sprints/<n>/tasks/<task-id>.yaml`) → READ-ONLY for build. Architect wrote it; build reads it as input.
- `sprint_manifest_template` (`.pipeline/architecture/sprints/<n>/manifest.yaml`) → READ-ONLY for build. Architect wrote it; build reads `waves[].tasks` to derive wave order.

### Advance the per-skill cursor at each step

Before doing the substantive work of each step in `ordered_steps`, call:

```bash
node plugins/essense-flow/bin/essense-flow-tools.cjs step-advance --skill build --next-step <step-name> --project-root <project-root>
```

The op rejects out-of-order or non-monotonic advances. Sequence MUST be `read-manifest → build-wave-order → per-wave-dispatch → per-task-return-and-verify → out-of-contract-write-check → drift-pause-or-continue → assemble-sprint-report → finalize` per init's `ordered_steps`; out-of-order returns exit 13 with a "not the immediate successor" error. After `finalize`'s substantive work, call `step-advance --next-step skill-complete` to delete the cursor (signals build run finalized cleanly; the next skill — review — can run).

### Dispatch task agents via the registered agent

Use the `Agent` / `Task` tool with subagent_type=`essense-flow-task-agent`. The agent is registered at `plugins/essense-flow/agents/essense-flow-task-agent.md` with description, tool allowlist (`Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs` — wider than sub-architect's because task agent does code work), and the canonical task-spec-as-brief-input shape as its body. Per `redesign/agent-spec.md` §3.2 + S6.5 closed decision: **no dedicated brief template — the closed task spec yaml from architect IS the brief input.** Master concatenates the task spec's fields into the dispatch prompt with `task_id` + `sprint` context + `task_started_at` (ISO 8601 stamped at dispatch).

The agent returns YAML with `task_id`, `status` (`complete | blocked | partial-with-surfaced-concern`), and `agent_claim` (object with `files_written, tests_run, criteria, deviations, out_of_contract_writes, surfaced_concerns, notes, summary`). Master compares to disk before persisting; do NOT summarize the agent's claim.

Dispatch every task in the current wave in a SINGLE message — parallel, no concurrency cap (per INST-13 + the original substance below).

### Re-validate every claim against disk (master-side `runner_verification`)

For every task agent that returns:

1. Parse the returned YAML's `agent_claim` (verbatim).
2. Re-validate against disk:
   - For each path in `agent_claim.files_written` (or `files_modified` — synonyms per cli-spec.md §5 2026-05-07 Addendum field-name reconciliation): `Read` the file; capture `{path, exists, mtime, fresh}` (fresh = mtime ≥ task_started_at). Build the array `runner_verification.files_validated`.
   - For each `criteria[i]` in `agent_claim`: independently verify the check (re-run the test if `mode: must-pass`; read the test file's content if `mode: author-only`). Build `runner_verification.per_criterion_verdicts: [{id, agent_status, runner_status, evidence}]`.
   - Compute `runner_verification.drift`: `files: [paths the agent claimed but disk disagrees]`, `criteria: [AC ids whose runner_status disagrees with agent_status]`.
3. Compute `verified = (drift.files empty) AND (drift.criteria empty)`.
4. Stamp `task_completed_at` (ISO 8601 from now or from the agent's return).
5. Stage the dual-record YAML at a temp path (e.g. `<project-root>/.tmp-completion-record-<task-id>.yaml`) with the full shape per cli-spec.md §1.3 + §5 2026-05-07 Addendum:
   ```yaml
   schema_version: 1
   task_id: <id>
   sprint: <n>
   agent_claim: <verbatim from agent's return>
   runner_verification: { files_validated, per_criterion_verdicts, drift }
   verified: <bool>
   task_started_at: <iso>
   task_completed_at: <iso>
   ```
6. Call:
   ```bash
   node plugins/essense-flow/bin/essense-flow-tools.cjs record-task-completion --sprint <n> --task-id <id> --content-file <staged-path> --project-root <project-root>
   ```
   The op validates required keys (8 top-level: `schema_version, task_id, sprint, agent_claim, runner_verification, verified, task_started_at, task_completed_at`), validates types per cli-spec.md §5 2026-05-07 Addendum sub-object schema, checks `parsed.task_id == --task-id` (exit 18 if mismatch), checks `parsed.sprint == --sprint` (exit 18 if mismatch), checks task-id is in sprint manifest's `waves[].tasks` (exit 9 if not), checks idempotency (exit 10 if record already exists), atomically writes validated bytes (server-stamps `recorded_at`) to `.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml`.

**Out-of-contract write check** (per cli-spec.md substance preserved — happens before stage step 5): compare `runner_verification.files_validated` paths against the task spec's `file_write_contract.paths`. Any path written that's not in `paths` (or is in `forbidden`) — flag in `agent_claim.out_of_contract_writes` (the agent should already have flagged; master verifies). **Do not silently re-permit.** Per Fail-Soft: flag travels to review, not blocked.

### On drift — sprint pauses (no silent retry)

When `runner_verification.drift.files` or `runner_verification.drift.criteria` is non-empty after the re-validation:

1. The dual-record stages with `verified: false` and the drift visible.
2. Call `record-task-completion` to persist the record (the gate counts records, not verifications).
3. **Pause the sprint.** Surface to the user (or the review/heal phase) that the sprint paused on drift. Loud, not silent.
4. Build does NOT:
   - re-dispatch the task with adjusted parameters
   - silently retry
   - soften the criterion
   - re-permit out-of-contract writes
5. Skip remaining waves; do NOT call `state-set-phase --value sprint-complete`.

### On contradiction in task spec

If the agent reports it cannot satisfy the task spec (pseudocode won't compile, two requirements conflict, an AC is unsatisfiable):

1. The agent surfaces the contradiction in `agent_claim.surfaced_concerns` (also reflected in `agent_claim.notes`).
2. Build records the contradiction in the completion record (status: `partial-with-surfaced-concern` or `blocked` per agent's call).
3. **Sprint pauses.** Surface the contradiction. The architect (or the user via per-task triage disposition once the sprint reaches `sprint-complete` and the canonical `sprint-complete → reviewing → triaging` chain has run) decides how to resolve. Build does not silently rewrite scope. **Note:** "via triage routing" here refers to per-task pause disposition reached through the canonical chain — it does NOT authorize writing `/triage` as the sprint-level recommended-next-move in SPRINT-REPORT.md. The sprint-level next move from `sprint-complete` is `review` (or `architecture` if drift is widespread); see "What you write directly with `Write`" section above for the legal-transition citation.

### Auto-synthesis safety net (master-side)

If a task agent crashes without returning any record, master writes a **synthetic** dual-record:

```yaml
schema_version: 1
task_id: <id>
sprint: <n>
agent_claim:
  status: crashed
  files_written: []
  tests_run: []
  criteria: []
  deviations: []
  out_of_contract_writes: []
  surfaced_concerns: []
  notes: "agent crashed without returning"
  summary: "task agent crashed; synthetic record per Graceful-Degradation"
runner_verification:
  files_validated: <as observed from disk under file_write_contract.paths>
  per_criterion_verdicts: []
  drift:
    files: []
    criteria: []
verified: false
synthetic: true
task_started_at: <iso>
task_completed_at: <iso>
```

Stage at temp path; call `record-task-completion --content-file <temp>` (the op accepts `synthetic: true` per its type-check table). Per Diligent-Conduct: missing signals surface, never hide. The sprint-complete gate (in `state-set-phase`) counts the synthetic record like any other; the sprint advances to `sprint-complete` when count_recorded == count_declared. `synthetic: true` records mark the task for triage post-sprint; review reads them as paused-task verdicts.

### Advance to sprint-complete via `state-set-phase` (NOT direct state writes)

When ALL tasks in the sprint have a completion record (verified or paused-with-surface or synthetic), call:

```bash
node plugins/essense-flow/bin/essense-flow-tools.cjs state-set-phase --value sprint-complete --sprint <n> --project-root <project-root>
```

The op enforces the per-task-record gate: counts files matching `.pipeline/build/sprints/<n>/tasks/*/completion-record.yaml` (one per task directory) against the manifest's `waves[].tasks` union size. If count_recorded < count_declared, exit 8 with the gap named. If the prerequisite predicate `.pipeline/build/sprints/<n>/SPRINT-REPORT.md exists with all tasks resolved` is enforced (currently soft-pass at CLI surface; review-phase enforces report shape), build still must `Write` the report before advancing.

`--sprint` is required for target `sprint-complete`. The op writes `phase: sprint-complete` + `sprint: <n>` atomically + auto-stamps `last_updated`.

### What you write directly with `Write` (not via CLI ops)

One artifact has no dedicated CLI op — it is a document write per `redesign/cli-spec.md` §2.1:

- `.pipeline/build/sprints/<n>/SPRINT-REPORT.md` — the synthesized rollup. Path comes from `init build.canonical_paths.sprint_report_md` with `<n>` substituted. Use ordinary `Write`. Frontmatter shape per "What you produce" below; body lists per-task verdicts (verified / drifted / paused / contradiction / synthetic), out-of-contract writes summary, recommended next move (**`review` is the only legal sprint-level next move from `sprint-complete`, or back to `architecture` if drift is widespread** — per `references/transitions.yaml:205-207` the sole legal exit from `sprint-complete` is `sprint-complete-to-reviewing`; **never write `/triage` as the sprint-level recommended next move**, as `sprint-complete → triaging` is not a legal transition — triage is reachable only via `reviewing → triaging` or `verifying → triaging`).

The SPRINT-REPORT.md's existence is verified by `state-set-phase`'s prerequisite-artifact predicate at the `sprinting → sprint-complete` transition; if you call `state-set-phase --value sprint-complete --sprint 1` and the report is missing, the op rejects with exit 7 and names the missing path.

## Core principle

Trust task specs, verify agents. The architect's contracts are ground truth. The implementing agents' self-reports are not — they are hypotheses that the runner re-validates against the filesystem.

## What you produce

- `.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml` — one per task. Contains agent_claim + runner_verification + drift flag.
- `.pipeline/build/sprints/<n>/SPRINT-REPORT.md` — synthesized rollup. Becomes input to review.

Completion record (dual-record shape per cli-spec.md §5 2026-05-07 Addendum; superset of original substance):

```yaml
schema_version: 1
task_id: <id>
sprint: <n>
agent_claim:
  files_written: [...]                # synonym: files_modified
  tests_run: [{path, pass}, ...]
  criteria: [{ id, status, check }]
  deviations: [...]
  out_of_contract_writes: [...]
  surfaced_concerns: [...]
  notes: "<agent's prose>"
  summary: "<one to three sentences>"
runner_verification:
  files_validated: [{ path, exists, mtime, fresh }]
  per_criterion_verdicts: [{ id, agent_status, runner_status, evidence }]
  drift:
    files: [...]
    criteria: [...]
verified: true | false
synthetic: false                       # true only for crash records
task_started_at: <iso>
task_completed_at: <iso>
recorded_at: <iso>                     # server-stamped by record-task-completion
```

SPRINT-REPORT.md frontmatter:

```yaml
---
schema_version: 1
sprint: <n>
tasks_attempted: <count>
tasks_verified: <count>
tasks_drifted: <count>
tasks_paused: <count>
---
```

## How you work

### Setup

1. Read manifest. Confirm every task referenced has a spec file. If anything missing, refuse to start with a clear error.
2. Build the wave order from `manifest.waves` (already dependency-ordered by architect).

### Per wave

1. **Dispatch.** For every task in the wave, in parallel:
   - Brief the task agent with the full task spec (goal, requirements_traced, file_write_contract, behavioral_pseudocode, test_completion_contract, agency_level + rationale).
   - Append two context blocks after the task-spec fields, clearly marked as **context, not contract** (the task spec remains the only contract):
     - **`EXISTING HELPERS`** (only when `.pipeline/glossary/GLOSSARY.yaml` exists — omit the block entirely otherwise, no empty header): glossary entries whose instance file paths prefix-match any path in THIS task's `file_write_contract.paths`, OR whose `proposed_module` equals this task's `module`. **Cap 10**, path-match ranked first. One line each: `- <label> — exists at <path> (call it; don't re-implement)`.
     - **`NEIGHBORS IN THIS WAVE`** (when the wave has >1 task): for every OTHER task in the SAME wave, one line `- <task_id>: <goal first sentence, ≤120 chars>` — the agents writing in parallel see each other instead of duplicating each other.
     - Combined budget **~1500 characters** per task prompt; overflow keeps the highest-ranked entries + `…and N more in .pipeline/glossary/MAP.md`. Advisory per Fail-Soft — oversize surfaces as a one-line note, never a refused dispatch. Context blocks never widen `file_write_contract`.
   - Record `task_started_at` before dispatch.
   - Dispatch via `Agent` tool with the brief envelope.
2. **No concurrency cap.** Run the whole wave at once. Resource pressure surfaces as advisory warnings (per Fail-Soft), never as rejected work.

### Per task return

For each task agent that returns:

1. Parse the completion claim it returned.
2. Compute `runner_verification` against disk per "Re-validate every claim against disk" above.
3. Stage the dual-record YAML at a temp path.
4. Call `record-task-completion --sprint <n> --task-id <id> --content-file <staged-path>` to persist atomically at `.pipeline/build/sprints/<n>/tasks/<task-id>/completion-record.yaml` with both agent_claim and runner_verification.
5. **Out-of-contract write check.** Compare `runner_verification.files_validated` against task spec's `file_write_contract.paths`. Any path written that's not in `paths` (or is in `forbidden`) — flag in the completion record. **Do not silently re-permit.**

### On drift

When `runner_verification.drift.files` or `runner_verification.drift.criteria` is non-empty:

1. Mark the task `paused` (verified: false in the dual-record).
2. Persist the completion record with the drift visible.
3. **Pause the sprint.** Surface to the user (or the review/heal phase) that the sprint paused on drift. Loud, not silent.
4. Build does NOT:
   - re-dispatch the task with adjusted parameters
   - silently retry
   - soften the criterion
   - re-permit out-of-contract writes

### On contradiction in task spec

If the agent reports it cannot satisfy the task spec (pseudocode won't compile, two requirements conflict, an AC is unsatisfiable):

1. The agent surfaces the contradiction in its claim notes.
2. Build records the contradiction in the completion record.
3. **Sprint pauses.** Surface the contradiction. The architect (or the user via per-task triage disposition once the sprint reaches `sprint-complete` and the canonical `sprint-complete → reviewing → triaging` chain has run) decides how to resolve. Build does not silently rewrite scope. **Note:** "via triage routing" here refers to per-task pause disposition reached through the canonical chain — it does NOT authorize writing `/triage` as the sprint-level recommended-next-move in SPRINT-REPORT.md. The sprint-level next move from `sprint-complete` is `review` (or `architecture` if drift is widespread); see "What you write directly with `Write`" section above for the legal-transition citation.

### Sprint complete

Once every task in the sprint has either:
- `verified: true`, OR
- a paused completion record (drift / contradiction surfaced),

assemble SPRINT-REPORT.md:

- Summary of what was attempted.
- Per task: verdict (verified / drifted / paused / contradiction).
- List of out-of-contract writes (if any).
- Recommended next move (`review`, or back to `architecture` if drift is widespread). **Legal-transition gate:** per `references/transitions.yaml:205-207`, the sole legal exit from `sprint-complete` is `sprint-complete-to-reviewing`. Never write `/triage` here — `sprint-complete → triaging` is not a legal transition; triage is reachable only via `reviewing → triaging` (line 213) or `verifying → triaging` (line 255). If a sprint surfaced contradictions that need triage routing, the canonical chain is `sprint-complete → reviewing → triaging`, not a direct jump.

Then advance:
- `state-set-phase --value sprint-complete --sprint <n>` (op enforces the per-task-record gate; rejects if count_recorded < count_declared per manifest).

### Auto-synthesis safety net

If a task agent crashes without returning any record, build does NOT skip the task. Build writes a synthetic dual-record (full shape per "Auto-synthesis safety net" in operating-mechanism section above) and persists via `record-task-completion --content-file <temp>`. Per Graceful-Degradation: missing signals surface, never hide.

## Unknowns ledger (librarian protocol)

Your agents are librarians: they hand over the best book they have, but they cannot know which books they don't have. Every task-agent return carries an `unknowns:` array (shape: `references/librarian.md`). Your duties as master:

1. **Collect** — read every return's `unknowns[]`. A return missing the array is incomplete: bounce it back. An entry with an empty `research_attempted` goes back too — research-first is the rule.
2. **Register** — `essense-flow-tools register-add --item-id U-<n> --kind unknown --closure-criterion "<the suggested_question>" --source-artifact <return ref> --project-root <root>` for every open entry. No unknown lives only in your context window — context dies, the register survives.
3. **Surface** — `blocking: true` entries: put to the user via `AskUserQuestion` BEFORE acting on that return. Non-blocking entries: batch them into one `AskUserQuestion` at sprint close, before state-set-phase to sprint-complete. A ratified `suggested_default` is an answer — record it as `closure_evidence` and close the register entry.
4. **Never assume** — an unanswered unknown stays open in the register and is surfaced again at the next gate. Silently proceeding past one is the failure mode this protocol exists to kill.

## Constraints

- Per **INST-13**: NO concurrency cap on wave dispatch. NO budget enforcement. NO max-tasks-per-wave gate. The architect sized the wave; build runs it.
- Per **Front-Loaded-Design**: build trusts task specs as closed. Agents that can't satisfy a spec surface contradictions; they do not improvise scope.
- Per **Diligent-Conduct**: every completion record stores both agent_claim AND runner_verification. Trust drift is auditable. No silent overwrites of agent reports with "corrected" runner data — both shapes are preserved.
- Per **Fail-Soft**: out-of-contract writes are flagged, not blocked. The flag travels to review.
- Per **Graceful-Degradation**: a missing or partial completion record from a crashed task agent produces a synthetic record (`synthetic: true`) and a paused-task verdict. The sprint surfaces the gap loudly; build does not pretend the task succeeded and does not silently skip it.

## Why delegation is mandatory here

Without per-task agent dispatch, the build substance — implementing every task in the sprint — would run in master context. By the time synthesis hits, the rule (verify every claim against disk; preserve `agent_claim` alongside `runner_verification`; out-of-contract writes flagged not blocked) drifts under thousands of tokens of code edits. Drift symptom: completion records start to summarize rather than preserve raw agent claims; `runner_verification` gets short-circuited; out-of-contract writes pass unflagged.

Delegation keeps the rule loud at sprint-report time. Each task agent returns its self-report from a clean context; master receives it and re-validates against disk with the verification discipline still vivid because the master never wrote the code.

## Scripts

- `bin/essense-flow-tools.cjs` (S9.1 redesign — sole writer of completion records via `record-task-completion`; sole cursor advancer via `step-advance`; sole phase advancer via `state-set-phase`). Replaces direct calls to `lib/finalize.js` for build's state-mutation surface.
- `lib/dispatch.js` — task agent fan-out (mode: `task-by-task`). Used as helper; canonical dispatch is via the registered `essense-flow-task-agent` per the operating-mechanism section above.
- `lib/brief.js` — task brief assembly. Used as helper; canonical brief is the task spec yaml itself per agent-spec.md §3.2.
- `lib/verify-disk.js` — re-validation helper for `runner_verification`. Used as helper; canonical persistence is via `record-task-completion`.
- `lib/finalize.js` — DEPRECATED for build per S9.1 redesign. Use `record-task-completion` for completion records and `state-set-phase --value sprint-complete --sprint <n>` for the phase transition. Direct `lib/finalize.js` calls bypass the per-task-record gate and the dual-record validation; both are load-bearing.

## State transitions (read-only reference; advancement via `state-set-phase`)

| from | to | trigger | auto |
|------|----|---------|------|
| sprinting | sprinting | next wave | no |
| sprinting | sprint-complete | all tasks resolved (verified or paused with surface) | yes |

## Before you finalize

Last block — read it just before you act.

**Phase targets** (verbatim from `references/transitions.yaml`):

- `sprinting → sprinting` — next wave inside the current sprint
- `sprinting → sprint-complete` — all tasks in the sprint resolved (verified or paused-with-surface)

Not legal: `built`, `building`, `done`, `complete-sprint`. The phase name is `sprint-complete` with a hyphen — `state-set-phase` rejects the others with exit 3 + canonical-phase-list error.

**The exact CLI call shape** for the sprinting→sprint-complete transition (S9.1 redesign — replaces the old `finalize` js call):

```bash
# Per-task: persist dual-record (one call per task in sprint)
node plugins/essense-flow/bin/essense-flow-tools.cjs record-task-completion \
    --sprint 1 --task-id T-001 \
    --content-file <project-root>/.tmp-completion-record-T-001.yaml \
    --project-root <project-root>

# After all tasks recorded + SPRINT-REPORT.md written: advance phase
node plugins/essense-flow/bin/essense-flow-tools.cjs state-set-phase \
    --value sprint-complete --sprint 1 \
    --project-root <project-root>
```

**Self-check before the calls:**

1. Did you pass `--value sprint-complete` (with the hyphen) to `state-set-phase`? Invented values like `built` / `building` / `done` are rejected with exit 3.
2. Do `--content-file` paths use the **literal** sprint number (your packed `<n>` from `init build.sprint_number`), never `<n>` placeholder? `record-task-completion` substitutes the placeholder at write time; the placeholder must NOT appear in your staged YAML or the post-write disk path.
3. Is the SPRINT-REPORT.md filename uppercase as `init build.canonical_paths.sprint_report_md` shows? Templates live under `skills/build/templates/sprint-report.md` and `skills/build/templates/completion-record.md` — copy that shape.
4. Did **task agents** produce the agent_claim portion? Master synthesizes `runner_verification` and re-validates against disk. Master should not be writing code in main context.
5. For a wave-step (`sprinting → sprinting`), `wave` advances via `state-set-wave --value <n>`; `phase` stays. Do not call `state-set-phase` between waves.
6. Are you calling `record-task-completion` and `state-set-phase`, **not** `Write` or `Edit` on `.pipeline/state.yaml` or `.pipeline/build/sprints/.../completion-record.yaml`? `record-task-completion` rejects pre-existing destinations (idempotency) — but that won't catch a `Write` that landed before the CLI op was called. Discipline: never `Write` to the completion-record path; route every per-task persistence through `record-task-completion`.

If any answer is `no`, stop. Re-read.

`record-task-completion` and `state-set-phase` emit JSON success on stdout (op + record_path / sprint + verified / sprint_progress) and one-line stderr error on rejection. Read both — the `sprint_progress: {recorded, declared}` field on `record-task-completion` returns is your countdown to gate-clearing.

## Numbered step sequence (per DD-15 ordered_steps)

The eight blocks below are the addressable anchors consumed by
`essense-flow-tools next-step --skill build`. Each `## N. <step-name>`
heading mirrors a slot in the `ordered_steps` array returned by
`essense-flow-tools init build` (verbatim). Bodies above remain the
source-of-truth for the step's substance; these blocks point back into
them so the parser (lib/cursor-schema.cjs `parseSkillStepsFromMarkdown`)
can slice the emission window cleanly. Per CMC-Rd10-3 + D-Rd10-10: the
parser stays canonical, only the SKILL.md files carry numbered headings.

## 1. read-manifest

Step 1 of 8 for the build skill (DD-15 ordered_steps anchor).

Read `.pipeline/architecture/sprints/<n>/manifest.yaml`. Confirm every
task referenced has a spec file. If anything missing, refuse to start
with a clear error.

See the existing skill body section "How you work" → "Setup" step 1 for
the full substance. This heading is the addressable anchor for `next-
step --skill build` body emission bounded by the next numbered heading.

## 2. build-wave-order

Step 2 of 8 for the build skill (DD-15 ordered_steps anchor).

Build the wave order from `manifest.waves` (already dependency-ordered
by architect). Confirm each task spec exists at
`architecture/sprints/<n>/tasks/<task-id>.yaml`.

See the existing skill body section "How you work" → "Setup" step 2 for
the full substance. This heading is the addressable anchor for `next-
step --skill build` body emission bounded by the next numbered heading.

## 3. per-wave-dispatch

Step 3 of 8 for the build skill (DD-15 ordered_steps anchor).

For every task in the wave, in parallel: brief the task agent with the
full task spec (goal, requirements_traced, file_write_contract,
behavioral_pseudocode, test_completion_contract, agency_level +
rationale) plus the two advisory context blocks (EXISTING HELPERS from
the glossary when present; NEIGHBORS IN THIS WAVE — see "How you work"
→ "Per wave" for selection rules and caps); record `task_started_at`
before dispatch; dispatch via `Agent` tool with `subagent_type:
essense-flow-task-agent`. No concurrency cap per INST-13.

See the existing skill body section "How you work" → "Per wave" for the
full substance. This heading is the addressable anchor for `next-step
--skill build` body emission bounded by the next numbered heading.

## 4. per-task-return-and-verify

Step 4 of 8 for the build skill (DD-15 ordered_steps anchor).

For each task agent that returns: parse the completion claim; compute
`runner_verification` against disk per "Re-validate every claim against
disk"; stage the dual-record YAML at a temp path; call `record-task-
completion --sprint <n> --task-id <id> --content-file <staged-path>` to
persist atomically.

See the existing skill body section "How you work" → "Per task return"
steps 1-4 for the full substance. This heading is the addressable
anchor for `next-step --skill build` body emission bounded by the next
numbered heading.

## 5. out-of-contract-write-check

Step 5 of 8 for the build skill (DD-15 ordered_steps anchor).

Compare `runner_verification.files_validated` against the task spec's
`file_write_contract.paths`. Any path written that's not in `paths` (or
is in `forbidden`) — flag in the completion record. Do not silently
re-permit. Per Fail-Soft: flags travel to review, not blocked at build.

See the existing skill body section "How you work" → "Per task return"
step 5 for the full substance. This heading is the addressable anchor
for `next-step --skill build` body emission bounded by the next
numbered heading.

## 6. drift-pause-or-continue

Step 6 of 8 for the build skill (DD-15 ordered_steps anchor).

When `runner_verification.drift.files` or
`runner_verification.drift.criteria` is non-empty: mark the task
`paused` (verified: false in the dual-record); persist with drift
visible; pause the sprint and surface to user/review/heal. Build does
NOT re-dispatch / silently retry / soften criteria.

See the existing skill body section "How you work" → "On drift" + "On
contradiction in task spec" for the full substance. This heading is the
addressable anchor for `next-step --skill build` body emission bounded
by the next numbered heading.

## 7. assemble-sprint-report

Step 7 of 8 for the build skill (DD-15 ordered_steps anchor).

Once every task has either `verified: true` or a paused completion
record, assemble SPRINT-REPORT.md: summary of attempts; per-task
verdict (verified / drifted / paused / contradiction); out-of-contract
writes list; recommended next move (`review` or `architecture`). Never
write `/triage` — `sprint-complete → triaging` is not a legal
transition.

See the existing skill body section "How you work" → "Sprint complete"
for the full substance. This heading is the addressable anchor for
`next-step --skill build` body emission bounded by the next numbered
heading.

## 8. finalize

Step 8 of 8 for the build skill (DD-15 ordered_steps anchor).

Advance phase via `state-set-phase --value sprint-complete --sprint <n>`
(op enforces the per-task-record gate; rejects if count_recorded <
count_declared per manifest). Cursor cleanup via `step-advance --skill
build --next-step skill-complete`.

See the existing skill body section "Before you finalize" + the
canonical CLI sequence block for the full substance. This heading is
the addressable anchor for `next-step --skill build` body emission;
since this is the last step (N == K == 8), the emission window runs
from this heading to end-of-file.
