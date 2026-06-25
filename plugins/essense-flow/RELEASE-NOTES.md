# Release notes — essense-flow

## 0.22.0 — Decoupling gets its design-time gate (architect-alignment criterion 8)

0.21.0 made "build decoupled" a checked gate at code-write time (the review `coupling` lens). But the cheapest place to kill coupling is BEFORE a line is written — at architecture. This adds the design-time face: a new criterion in the architect-alignment lens that gates every sub-architect return's `exposes`/`consumes` contracts before the specs are packed for /build.

**Criterion 8 — exposes/consumes contract integrity** (in `agents/essense-flow-architect-alignment-lens.md`, dispatched per sub-arch return at architect step 3.5). Four binary sub-checks, no thresholds:

- **8a — consumes names a contract, not an internal.** A `consumes` that reaches past a contract into a provider's internals (private symbol, file path, class field, shared global) is a design-time reach-in.
- **8b — pseudocode coupling is declared.** Every cross-module call in a task spec's `behavioral_pseudocode` must be covered by a declared `consumes`. The design-time mirror of the review `coupling` lens — an undeclared cross-module reach is undeclared coupling.
- **8c — exposes is a real surface.** Each `exposes` entry must name a concrete shape callers can bind to, not a vague capability ("the parser stuff"). A vague surface cannot be a decoupling boundary.
- **8d — no undeclared seam.** A spec that depends on another module but declares no matching `consumes` is pushing a coupling defect downstream (the architect-time form of SKILL.md's "a seam you cannot name a contract for is a coupling defect").

**Why semantic-only, no deterministic CLI counterpart** (like criterion 7): `arch-alignment-check` parses ONE sub-architect return = one module, but a consumed module's `exposes` lives in a SIBLING return — so a deterministic provider→exposes resolution at that scope would false-flag every legitimate cross-module consume (substrate-verified against the op at `bin/essense-flow-tools.cjs:4926`). The lens has the `{{module_seam_table}}` (master-authored cross-module contracts) in its brief, so it resolves contracts semantically where the per-return op cannot. The six deterministic criteria the CLI op checks are unchanged.

The decoupling principle now binds at all three points: **design** (architect-alignment criterion 8) → **code** (review `coupling` lens) → and the engine `runner coupling` (plugin-toolkit 2.4.0) computes it on built code. 54 cjs + description/brief consistency tests green; the CLI op's deterministic criteria untouched.

## 0.21.0 — The one rule: build decoupled (enforced, not just stated)

Build agents kept producing coupled code. The fix is not a better paragraph — in this pipeline a principle only binds when it's a **checked gate**. So decoupling becomes the primary, enforced coding principle across five layers, keystoned by a blocking review lens.

The organizing rationale (stated identically everywhere it lands): **each unit is built by a separate agent, in parallel, blind to where it ends up, who calls it, or what it's used for. The only thing that survives that blindness is a contract.** So every unit exposes a contract, depends only on others' contracts, assumes nothing about its caller, and owns no shared mutable state.

- **Layer 1 — doctrine.** `references/code-conventions.md` now leads with "**The one rule: build decoupled**" + the build-blind rationale; the former "Structure" bullets (acyclic deps, one-responsibility, centralized state, single-source) are reframed as explicit corollaries of it, not peers.
- **Layer 2 — agent creed.** The task-agent's **first** substantive section is a "Prime directive: build decoupled" with the mechanical check: *trace every name you reach across a boundary; if a contract doesn't promise it, you coupled — pull it back.* The rest of the conventions are demoted to "downstream of" it.
- **Layer 3 — contract-first specs (the one mechanically-tested layer).** Two OPTIONAL additive fields on the task-spec schema: **`exposes`** (the unit's public surface) and **`consumes`** (the interfaces it depends on, by contract — distinct from `dependencies`, which is build-ordering). Back-compat: specs without them still validate. Sub-architects must populate them ("design the contracts FIRST"); the master architect draws every boundary as a nameable contract. Schema is single-sourced → `npm run render-schemas` cascaded the new fields into the task-spec template + sub-architect + task-agent shape blocks; drift-tested.
- **Layer 4 — neighbor-context reframed.** `/build`'s `NEIGHBORS IN THIS WAVE` block now shows a sibling's `exposes` **contract**, not its goal — neighbor-awareness that serves decoupling (integrate against the shape) instead of eroding it (couple to what it does).
- **Layer 5 — keystone: the `coupling` review lens.** A new adversarial lens traces the real import/call/field-access edges against the `exposes`/`consumes` contracts and flags cross-boundary reach-ins, concrete-instead-of-contract deps, undeclared cross-unit deps, shared mutable state across units, and circular deps — each with `file_path:line_number` + verbatim quote. A confirmed reach-in is `critical` and **blocks the sprint at the existing deterministic gate**. Decoupling is now a gate, not advice. Dispatched whenever a sprint writes >1 unit.

Regression: `node test/run-all.cjs` 54/54 (was 53; +1 new `test/task-spec-contract-fields.test.cjs`, 4 cases — back-compat + accept + type-reject + schema-declares-optional). Schema re-rendered (4 sites) + drift test green. Only self-test failure remains the pre-existing time-triggered `tests/ledger-compaction.test.js` (T-ENF-3), unrelated.

Honest scope note: layers 1/2/4/5 are prompt content — their *efficacy* (does an agent actually decouple; does the lens actually catch a real reach-in) is only provable by a live build→review on a real multi-unit project, not by a unit test. Layer 3 (schema) is the only mechanically-verified layer. The wiring + internal consistency across all five layers was verified (the lens checks exactly what the schema declares and the neighbor block surfaces; no old content still treats decoupling as one-among-equals).

## 0.20.0 — Inter-phase plumbing: the state machine stops fighting clean handoffs

Four fixes from a real-project field report (EMDE, a FastAPI/Next.js SaaS run through the pipeline at 0.19.0). All four are the same class: **phase, cursor, and the rich state cache are written by independent mechanisms that could legally disagree, with no clean cross-skill handoff to keep them in sync.** Each fix is verified by a new CLI end-to-end test (12 new assertions across 4 test files; `node test/run-all.cjs` 53/53).

- **Fixed-in-tree re-review now has a legal path (field issue #1).** A review-blocked sprint whose confirmed criticals were patched directly in the working tree had no legal transition back to `reviewing` — `state-set-phase --value reviewing` from `triaging` failed `no legal transition`, forcing a hand-edit of `state.yaml phase:` (an out-of-band mutation that defeats the deterministic-gate guarantee). New guarded `triaging → reviewing` transition, disposition-predicate-gated on `routed_to: reviewing` exactly like every other triage out-edge — triage is the sorting hat, so when every blocking item was dispositioned "fixed-in-tree, re-review requested" it routes straight back. New `triaging-to-reviewing.test.cjs` proves the call now exits 0 (was exit 6), and that a `routed_to` mismatch is rejected by the predicate (exit 7), not by legality.

- **Stale foreign-skill cursor self-heals (field issue #2).** An interrupted prior skill left `.pipeline/cursor.yaml` at e.g. `{skill: build, current_step: per-wave-dispatch}`, and the next skill's `step-advance` dead-ended with `prior skill run incomplete — run /heal first` — a forced `/heal` detour on an ordinary `build → review` progression. `step-advance` now self-rewinds the *safe* case inline: when the new skill enters fresh (its first ordered step) AND the current phase is one the skill legitimately accepts (`state.phase ∈ init.phase_from`), the stale cursor is overwritten with the new skill's fresh cursor and the rewind is logged to `HEAL-LOG.md cursor_rewinds[]`. The hard error is preserved for the genuinely ambiguous cases (illegal phase for the entering skill, or a foreign cursor encountered mid-sequence); `cursor-rewind` via `/heal` remains the path there. New `cursor-self-rewind.test.cjs`.

- **State cache no longer rots vs the report (field issue #3).** `state-set-triage-completed` stamped only `triage.completed_at`; after a fresh 90-item triage run, `state.yaml`'s triage block still showed the prior 26-item round. The `*-completed` finalize setters now mirror the authoritative report's frontmatter summary into the matching cache block: `state-set-triage-completed` mirrors `TRIAGE-REPORT.md`'s `entered_from / items_count / dispositions / routed_to` into `state.triage`; `state-set-verify-completed` mirrors `VERIFICATION-REPORT.md`'s counts + `completion_status` into `state.verify`. Fail-soft — a missing/unparseable report stamps the timestamp anyway and emits a stderr note (freshness, never a new gate). New `report-state-mirror.test.cjs`.

- **Migrated-project legacy keys get quarantined (field issue #4).** A project healed INTO essence-flow from a pre-existing custom `.pipeline/` carried both canonical keys AND a large foreign schema (`pipeline.*`, `phases_completed`, `verification.*`, `next_action`, `session.*`, …), so every CLI call emitted `state-shape WARN: unknown top-level key(s)` and the foreign fields silently rotted. New heal-only `state-quarantine-legacy` op moves every foreign top-level key into a `legacy:` sub-namespace so the live cache is purely canonical and the WARN stops — idempotent, audit-trailed to `HEAL-LOG.md legacy_quarantines[]` (the one-time migration note that replaces the perpetual per-call WARN). `legacy` is now a recognized optional top-level key; `partitionLegacyKeys` + `KNOWN_TOP_LEVEL_KEYS` in `lib/state.js` are the single source of truth shared with the validator. Wired into `/heal`'s walk-forward routing. New `legacy-quarantine.test.cjs`.

Docs updated in lockstep: `skills/{triage,review,verify,heal}/SKILL.md` (transition tables, finalize sequences, routing actions), `references/transitions.yaml`. Regression: full suite green except the long-standing `tests/ledger-compaction.test.js` (T-ENF-3) — a time-triggered governance-ledger archival reminder for the author-side design workspace that fires once its May-2026 entries age past 30 days; Fail-Soft-skips for any consumer without that workspace, unrelated to this change (documented as accepted residue since 0.17.1 / 0.18.0).

Open items from the same field report, NOT addressed here (need a design decision): verify scope/trigger mismatch (whole-codebase verify funnels mid-build — issue #6), an essence-flow-native process `/meta-review` (issue #5), and confirming the `state-set-verify-completed` success envelope (issue #7, low-confidence).

## 0.19.0 — Code conventions reference: build agents write to production craft

New `references/code-conventions.md` — general good-engineering conventions that govern **how** the build phase writes code (the task spec stays the only contract for **what**). Distilled into positive, reusable form (no project-specific content): verify-by-reading-the-code-path; fix-at-root-never-patch-a-patch; layered acyclic dependencies with a framework-free core; one-responsibility units; centralized ordered state mutation; single source of truth; no magic numbers (units + citation on domain constants); fail-fast validated config with no-default secrets; classify-errors-before-retry (transient vs permanent + backoff); nothing-fails-silently; atomic writes for critical state; plan-then-apply with verify-after for dangerous ops; portable paths; tests-as-living-spec + fitness-guard invariants.

Includes a **"Verify behavior, not just units"** section: unit tests are the floor, not the ceiling — build or run an end-to-end check matched to the surface (Playwright/Puppeteer for web UI, request-smoke for HTTP APIs, subprocess for CLIs, headless+screenshot for game/sim/visual, golden-diff for data pipelines) and emit human-inspectable evidence. Tool-acquisition order: use a wired harness if present; if a needed tool exists but isn't available, **request it by name** (surfaced as an `unknowns` entry to master per `librarian.md` — a missing verification capability is a declared gap, never a silently dropped step); if nothing exists, **build the minimal harness** and ship it with the feature.

Wired by reference (cite-don't-duplicate, matching the `principles.md` pattern): `essense-flow-task-agent` reads and applies it before writing code; `skills/build` and `skills/architect` cite it so specs are designed to allow, not fight, these conventions. On any conflict the task spec wins and the agent notes the tension in `agent_claim` — conventions shape craft, never override contract. Markdown-only; full suite green (49/49).

## 0.18.0 — The consolidation rebuild: schema single-source, artifacts-authoritative state, librarian protocol

Six-phase rebuild moving the plugin from internal tooling to public posture. Three structural inversions kill three whole failure classes; the prompt layer becomes readable with zero tribal knowledge.

**Schema single-source.** Artifact shapes (task-spec, completion-record, register-item, unknown-entry) live ONCE in `references/schemas/*.schema.yaml`. The CLI validators, required-key lists, enums, the task-id pattern, fill-in templates, and the shape blocks in agent defs + the sub-architect brief all derive from those files (`lib/schema-validate.cjs` + `scripts/render-schema-docs.cjs`; `npm run render-schemas`; hand-edits fail the suite via `test/schema-docs-drift.test.cjs`). This closes the drift class that caused a 31-spec rejection in a live run: at rebuild time the shape was hand-copied in 4+ places and **all four disagreed** (`file_write_contract` paths-vs-allowed across two validators in the same file; AC-array vs policy-mapping for `test_completion_contract`; the completion-record template missing the required `sprint` key; a brief teaching a `scratch_space` reject-rule the validator never had; three different task-id patterns).

**Artifacts-authoritative state.** The artifacts ARE the state; `state.yaml` is a derived cache. New `lib/infer-phase.cjs` walks the artifact tree backwards and returns ALL candidate phases with evidence — ambiguity is surfaced, never guessed. New `state-reconcile` op (report-only; `--apply` rebuilds the cache from disk, HEAL-LOG-audited, tolerates a parse-blown cache). The four state-gated ops auto-rebuild a MISSING cache when inference is confident and proceed — a fresh checkout no longer dead-ends in "run /heal first". Two new legal transitions close the amendment deadlock that previously required force-set workarounds: `sprint-complete→architecture` (amend a finished sprint) and `sprinting→triaging` (the documented "sprint pauses for triage" path that was never legal).

**Librarian protocol** (`references/librarian.md`). The model is a librarian: it hands over the best book it has but cannot know which books it doesn't have. Every producer-agent return now carries a REQUIRED `unknowns:` array (empty = an explicit claim, not a default; shape in `references/schemas/unknown-entry.schema.yaml`): research-first, then declare — runtime behavior an agent cannot execute, unpinnable library claims, and user-owned decisions all go in the ledger, never into an assumption. Masters register open entries (`register-add --kind unknown`) and surface them to the user via `AskUserQuestion` — blocking entries before acting on the return, the rest batched at the phase gate. The substrate-citation rule (formerly "M-2") is narrowed accordingly: a prescribed-pseudocode trigger line needs a `<file>:<line>` citation ONLY when it names a file that exists on disk; new-code and library claims are exempt — the old trigger-word-only rule fired on code with no line to cite and incentivized fabricated citations, the exact sin it policed.

**Public-readable prompt layer.** ~130 internal incident codenames (DD-*, M-*, L-*, D-Rd*, D-Sprint*, CMC-*, T-NNN, META-GAP, INST-13, …) inlined as self-contained principles carrying their why, mined line-verified from the design workspace. Architect SKILL.md rewritten 671 → 347 lines. Conduct prose lives once in `references/principles.md` (cite-don't-copy, test-enforced). The `skill-substance/` mirror is REMOVED — it was never runtime-load-bearing (every bin/ reference was a comment; its freshness pins shipped vacuous) and had drifted from its workspace originals; SKILL.md is the sole substance source. Public identifiers: INST-13 → "No Resource Caps"; `rule_id: DD-2` → `dispatch-floor`.

**CLI dedup (self-glossary run).** Ran the code-glossary engine on the plugin's own bin+lib. Executed: `INIT_DISPATCH` table replaces two parallel 9-branch skill-init chains. Declined after reading the bodies (recorded with reasons in the rebuild ledger): register audit-line formatters (different grammars), legacy/new cursor branches (live arg-shape routing), the four frontmatter parsers (distinct doc shapes in lock-disciplined audit paths). Engine gaps found: `.cjs`/`.mjs` not indexed; JS block-scan blind to repeated statement shapes — both logged for plugin-toolkit.

**Migration notes (existing .pipeline projects):**

- Task specs using `file_write_contract.allowed/forbidden` still READ fine (alignment criterion 5 accepts both), but new writes must use `paths` (+ optional `out_of_contract`, `scratch_space`); `task-spec-write-section` now validates the same canonical shape as whole-doc writes.
- `transitions.yaml` consumers: two new edges; `rule_id` value `DD-2` renamed `dispatch-floor` (CLI is passthrough; only matters if external scripts string-matched it).
- A missing `state.yaml` now self-heals inside ops when artifacts are unambiguous (HEAL-LOG-audited). If you relied on the hard EXIT_DEGRADED to detect fresh checkouts, key on the HEAL-LOG `state-reconcile (auto…)` entries instead.
- Agent returns missing `unknowns: []` should be bounced by masters per the librarian protocol — update any custom dispatch prompts.

**Honest gaps / accepted residue:**

- bin/lib source COMMENTS still carry historical codenames (archeology, not contract) — accepted for 0.18.
- ~~append-heal-log concurrency flake~~ — investigated and it was NOT environment noise: HEAL-LOG body appends ran OUTSIDE the frontmatter lock, so a concurrent writer's whole-file tmp+rename could replace the file from a pre-append snapshot and silently drop a line (reproduced: 16 concurrent appends, 15 landed). All three HEAL-LOG writers now serialize under the lock, and withLock retries Windows-transient EPERM/EBUSY/EACCES with the same backoff curve. 8/8 consecutive hammer runs green.
- `tests/ledger-compaction.test.js` still monitors the author-side design workspace (Fail-Soft skip for everyone else) — it will re-fire as entries age past 30 days.
- Schema examples (`T-001`, `NFR-2`) inside AUTOGEN blocks are live format examples, not codenames.
- 1.0.0 was NOT declared — operator's call, not pre-committed (the 0.x line's standing rule).

Regression: `npm test` — 49/49 run-all suites + self-test green; live round-trips verified for schema example → `task-spec-write`, missing-cache auto-reconcile inside `state-set-phase`, corrupt-cache `--apply` repair, both new transitions, and `register-add --kind unknown`.


## 0.17.1 — CLI robustness: real-world task-id schemes + multi-document manifests

Two `essense-flow-tools` parse fixes surfaced running the pipeline against a live audit project (130 task specs, ids like `D-ch01-data` / `E-ch12-engines`):

- **Task-id pattern widened.** `TASK_ID_PATTERN` was hard-coded to `/^T-\d{3,}$/`, which rejected every module-prefixed architect id (`P-*`/`D-*`/`E-*`/`A-*`/`B-*`) at `record-task-completion` and `task-spec-write` — with no template or cli-spec backing for the strict form (the task-spec template is a bare `{{task_id}}`). Now `/^[A-Z]+-[A-Za-z0-9_-]+$/`; `T-001` still matches. This is what previously forced sessions to bypass the completion-record CLI entirely.
- **Manifest reads tolerate multi-document YAML.** A sprint manifest authored as a `---` frontmatter block + body (two YAML documents) made `js-yaml` `load()` throw "expected a single document in the stream", hard-blocking every manifest-backed gate (`state-set-phase` architecture→sprinting, the sprint-complete gate, `record-task-completion`, the alignment-lens reader). New `mergeYamlDocsSync` + `loadManifestYaml` `loadAll`-and-merge the documents (frontmatter/body keys are disjoint); single-doc manifests pass through unchanged. The template (`sprint-manifest.md`) remains single-doc and canonical — this hardens the *reader* (Fail-Soft) so a deviating manifest no longer freezes the CLI. Generic `loadYaml` (state/decisions/cursor) is untouched. New regression test `test/manifest-multidoc-tolerance.test.cjs` (3 ACs; AC-2 proves the body document's `waves:` are actually merged, not merely non-crashing).

Regression: `node test/run-all.cjs` 45/45 (was 44; +1 new test). Self-test 66/67 — the single failure is T-ENF-3, a time-triggered governance-ledger compaction reminder in the sibling `essense-flow-re-imagined/redesign` workspace (Fail-Soft-skips for any consumer without that workspace; unrelated to this change).

## 0.17.0 — The functionality map: consult before designing, see neighbors while building

Counter to independent design + build: parallel sub-architects and task agents used to act blind to what exists and what siblings are doing. Now the mental map is forced, auditable, and regenerated every glossary run.

- **/glossary renders MAP.md** (`runner map`, engine 2.3.0): mermaid module graph (duplication families ×N, composites with `composed_of` arrows, cross-module edges dashed) + a lossless per-module machine index masters slice into briefs.
- **/architect consults the map at DECIDE.** Reuse ledger per module-to-be (relevance: `proposed_module` match or label verb+noun in responsibilities); **re-implementation without rationale is forbidden**; ledger lands in ARCH.md's new "Existing functionality considered" section (+ frontmatter count). Sub-architect briefs gain `{{existing_functionality}}` — top 15 relevant entries per module. No map → one advisory line (offer /code-glossary for brownfield), never a block.
- **/build dispatches carry context.** Each task prompt gains EXISTING HELPERS (glossary entries touching the task's `file_write_contract.paths`, cap 10) + NEIGHBORS IN THIS WAVE (sibling goals) — context, not contract; ~1500-char budget; Fail-Soft.
- **/organize judges cross-reference** the existing glossary's labels when present — "already exists in module X" advisory in proposals (full spec-vs-code clustering deferred to an engine chapter).

Requires plugin-toolkit >= 1.5.0 (engine 2.3.0 `runner map`). Self-tests: 67/67.

## 0.16.0 — /glossary drift tracking + /dry-refactor surfacing + review dry-violation lens

Closes the three integration gaps left when code-glossary v2.2 shipped (drift diff + /dry-refactor MVP existed but nothing in the pipeline used or mentioned them):

- **/glossary snapshots + auto-diffs.** Before each run, an existing `.pipeline/glossary/GLOSSARY.yaml` is snapshotted to `history/GLOSSARY-sprint-<n>-pre.yaml` (append-only — render would otherwise overwrite it and kill the comparison). After render, `runner diff` writes `.pipeline/glossary/DIFF.md`; the `grown` class names the duplication sites THIS sprint's parallel task agents added. Reporting, not gating — drift never blocks the phase. First run skips with a note.
- **/dry-refactor surfaced at exit.** /glossary's exit cue now names `/dry-refactor .pipeline/glossary/GLOSSARY.yaml <gloss-id>` for previewing any extractable entry (7 pre-flight gates + dry-run plan, zero source writes). Manual and outside the state machine — a pipeline phase waits for live execution (a dry-run-only phase would be a stop that can't act). Stale "future v3" constraint wording corrected.
- **/review dry-violation lens (adaptive).** Dispatched when a /glossary artifact exists: GLOSSARY.md top extractables + DIFF.md `grown` sites are pre-computed evidence; the lens substrate-verifies cited sites and emits only confirmed, sprint-relevant duplication. Minor severity unless a grown site duplicates a helper the spec/arch explicitly centralizes.

Requires plugin-toolkit >= 1.4.0 for `runner diff` and the /dry-refactor skill. Self-tests: 67/67.

## 0.15.0 — Two optional DRY phases: /organize (post-architect) + /glossary (post-build)

Both powered by the plugin-toolkit code-glossary v2 engine (deterministic Python; all LLM work = in-session Agent-tool sub-agents, no external SDKs). Engine discovered at runtime; hard stop with an install hint when plugin-toolkit is absent.

**`/organize` — spec-level DRY pass (sprinting → organizing → sprinting).** Parallel sub-architects design modules blind to each other; the same functionality lands in N task specs under different names; build agents then implement N variants. /organize clusters the current sprint's task specs (spec-mode signals: lexical + behavioral + task-id-mention composites; structural/signature N/A — specs aren't executable) and proposes consolidations. Propose-with-confirm: every merge needs explicit user OK; originals archived to `_pre-organize/<timestamp>/` before any edit; merge = union of acceptance criteria + file contracts, never replacement. ORGANIZE-REPORT.md records every proposal, decision, and failure. `organizing` is a human gate — autopilot halts.

**`/glossary` — code-level DRY audit (sprint-complete → glossarying → sprint-complete).** Runs the full code-glossary v2 flow on the sprint's code (or whole project — user picks scope): deterministic index/signals/clustering, sub-agent labeling against the 142-verb vocabulary, Pass B cluster review, Pass C substrate-verify. Propose-only: writes `.pipeline/glossary/GLOSSARY.{yaml,md}`, never touches source. GLOSSARY.md's top extractables feed /review as DRY-violation evidence. `glossarying` is a human gate (the estimate-and-confirm dispatch gate needs the user).

**Wiring.** transitions.yaml gains both phases + 6 transitions with artifact predicates (state machine is data-driven — `state-set-phase` legality + prerequisite checks picked them up with zero cjs changes); phase-command-map.yaml maps both; autopilot DEFAULT_CONFIG.human_gates extends to both (essense-autopilot 0.3.1). Self-test conventions (conduct preamble, transitions-table audit, description-consistency) all green; the description-consistency audit also caught pre-existing drift in commands/review.md, fixed here.

No `init organize` / `init glossary` ops in essense-flow-tools yet — both skills carry their canonical paths inline; the init-op surface is a follow-up.

## 0.14.0 — Skill description rewrites + elicit consolidation + architect pre-flight hoist

**Skill description rewrites (all 9 skills).** Frontmatter descriptions rewritten with use-case-first phrasing, no internal jargon (DD-20, M1-Rd10, alignment-lens, sorting hat, etc. all removed), and explicit pipeline position ("Run after /X, before /Y"). Improves skill discoverability — Claude reads listings and matches user intent against descriptions; jargon-heavy descriptions failed to surface for natural queries like "design my sprint" (architect) or "review my code" (review). Affected skills: architect, build, context, elicit, heal, research, review, triage, verify. Heal description also closes a discoverability gap — now explicitly lists both responsibilities (state-recovery + stale-claim sweep) where the prior version mentioned only the former.

**elicit body consolidation.** Three redundant sections describing the same 7-step flow (Skill operating mechanism + How you work + Before you finalize) consolidated to one canonical "How you work" section with bash blocks at action points. CLI-as-truth preserved (structural gates remain enforced at the CLI op layer, not by master gut-check). Single source of truth eliminates drift risk between sections. 331 → 294 lines. Numbered step parser anchors untouched.

**architect pre-flight hoist.** "Before you finalize" section (legal phase targets + exact CLI sequence + 8-point self-check) hoisted from line 611 (end-of-file) to line 38 as "Pre-flight & finalization checks." Reframed intro from "last block before you act" to "apply throughout the work — verify before any state-mutating call." Claude now reads gating rules BEFORE the 400+ line body procedure, not after.

No behavioral changes to CLI op surface or state machine. Pure SKILL.md content changes; no `lib/`, `bin/`, or `references/` modifications. Existing tests pass unchanged.

## 0.13.4 — Pipeline review-loop termination (L1 class-pattern ack + L4 canon-tax emission) + L2 test-seam architect brief

Hotfix per `redesign/06-decisions.md` 2026-05-18 closure-reopening decision "Decision: terminate pipeline review-loop via L1+L2+L4 structural fix (skip L3 lens-scope change)" + paired in-session authorization "Decision: in-session authorization granted to execute L1+L4+L2 surgery (refusal-protocol waived for this session only)". Surfaces via `/field-to-ship` invocation against a meta-pipeline diagnosis prompt: Unity-diploma application of essense-flow in sprint-7 with review counts growing (Sprint 6: 22 items → Sprint 7: 23 items → backlog growing, not draining). Three-cause structural collapse (per paired SURPRISES.md entry 2026-05-18 META-PIPELINE-LOOP):
1. No `accept-as-design` terminator — acknowledged-ledger keyed by finding_id; finding_ids regenerate per sprint; per-id acks never carry forward.
2. Doc-canon work not tasked — architect closes master decisions but no `T-XXX append-rows-to-canon` task emitted; spec-drift lens finds gap every sprint.
3. Lens scope unbounded — adversarial lens reads modified files end-to-end; pre-existing debt flagged as sprint output (intentionally NOT addressed in 0.13.4 per user verdict to preserve real-bug detection at risk of finding-count inflation).

**L1 — class-pattern acknowledgment (review skill + CLI).** Extends `acknowledged-ledger.yaml` schema (sprint-spanning ledger at `.pipeline/review/acknowledged-ledger.yaml`) to honor two entry shapes: legacy `finding_id:` keyed entries AND new `match_pattern:` keyed entries (literal substring or regex against finding.claim / lens / proposed_check). Master computes both `confirmed_unacknowledged_criticals` (raw, post-finding-id-ack) AND `class_acknowledged` (additional class-pattern matches) and writes both to QA-REPORT.md frontmatter. CLI predicate evaluator subtracts: `effective = max(0, confirmed_unacknowledged_criticals - class_acknowledged)`. Implementation:
- `bin/essense-flow-tools.cjs:2227-2245` — review predicate path now passes `subtractKey: 'class_acknowledged'` to `evalCountPredicate` (mirrors the verify predicate path's `subtractKey: 'acknowledged'` precedent at L2250). Field is OPTIONAL in frontmatter (defaults to 0); pre-0.13.4 QA-REPORT.md remains valid.
- `skills/review/SKILL.md` — new "Acknowledged-ledger schema (v0.13.4 — closes the per-sprint loop)" section under "What you produce"; new entry shape with `match_pattern:`, `pattern_type:` (literal | regex), `match_against:`, `ack_reason:`, `decision_ref:` (governance requirement — class-pattern entries without `decision_ref:` are REJECTED at next-sprint review's setup), `expires_at:` (optional auto-expiry). Job 4 — Decide section updated with effective-count computation. Pattern evaluation safety: regex compilation timeout 5s per finding (master enforces; CLI does not — CLI only reads precomputed counts from frontmatter). Malformed regex → ledger entry logged `inert: true` for current run; does NOT auto-match.
- `skills/review/templates/qa-report.md` — frontmatter shape gains `class_acknowledged: {{class_acknowledged_count}}` line; deterministic-gate section names effective count formula explicitly.
- New regression test `test/class-pattern-ack.test.cjs` (7 ACs covering raw-class-eq, partial, no-class-field back-compat, max-clamp at 0, triaging-route, symmetric drift, malformed-class-field).

**L4 — canon-tax pack-step emission (architect skill).** Closes the doc-canon-recurrence-class: every architect round closing ≥1 master decision now MUST emit a `T-CANON-<round>` task as the first task of wave 1 of the sprint, propagating closed decisions into project-canonical doc files (e.g. `docs/DECISIONS-INDEX.md`, `docs/MASTER-DECISIONS.md`). Implementation:
- `skills/architect/SKILL.md` — new "Canon-tax emission (v0.13.4 L4 — mandatory pack-step task)" section under "How you work" → "Pack". Rule: read ARCH.md frontmatter `canon_files:` array; if non-empty AND decisions closed this round > 0, emit `T-CANON-<round>` task spec with `file_write_contract.allowed: <canon_files>`, prescribed agency, grep-typed ACs asserting each closed-decision id appears in each canon file post-run. Worked example task spec provided. Skip-with-reason path if `canon_files` is empty `[]` or zero decisions closed. STOP-and-surface path if `canon_files` is null or missing (silent default to `[]` rejected — declaration must be explicit).
- `skills/architect/templates/architecture.md` — frontmatter shape gains `canon_files: {{canon_files}}` field with inline documentation citing v0.13.4 L4. New "Project-canon mirrors" subsection under "Decisions table" explains the field's role + the non-null-required constraint.

**L2 — test-seam architect brief (workspace authoring + init-spec wiring).** Authored brief at `redesign/L2-test-seam-architect-brief.md` for invoking `/essense-flow:architect` against the Unity-diploma project to inject `IDisposableFactory` test seams across 6 named builds (ContinuumCPU, ContinuumGPU, FFR, AStar, FlowField, gpu-waitforcompletion). Brief documents: closed top-level decisions (seam abstraction shape, injection mechanism, fixture location, build acceptance contract, module boundary), brief inputs per sub-architect dispatch, expected pack-step output (1 sprint, 6+ tasks), per-build test-completion contract (5 ACs each), verifiable check for the brief's effectiveness (6/6 builds have IdentityFactory + ThrowingFactory + one fixture-test). Wired into `redesign/init-spec.md` §7 addendum 2026-05-18: architect's init JSON gains OPTIONAL `optional_brief_inputs[]` field; pre-0.13.4 init JSON without the field remains valid; CLI implementation of the field deferred to a follow-up session (the field is documented and reserved; user can manually paste the brief at architect's decide step until then).

**Substrate-verified.** All file:line citations above were read in this session before encoding. Snapshot taken pre-surgery at `redesign/snapshots/2026-05-18-L1L2L4-pre/essense-flow/` (3.9M); plugin tree was clean at HEAD `91da7f2` before this session's first edit; in-session authorization granted via paired closed decision per CLAUDE.md refusal-protocol waiver discipline.

**Cumulative test counts.**
- CJS: 44/44 pass (was 43/43 pre-v0.13.4; +1 new test file `test/class-pattern-ack.test.cjs` with 7 ACs).
- ESM: 67/67 pass (unchanged).
- Total: 118 ACs green (was 111 pre-v0.13.4; +7 from class-pattern-ack ACs).
- `npm test` exit 0. One pre-existing flake (`test/append-heal-log-concurrent.test.cjs` AC-3 N=16 concurrent on Windows fs) intermittently fails under suite load; passes 5/5 in isolation. NOT introduced by v0.13.4.

**Version source-of-record.** Bumped together: `mk-cc-resources/.claude-plugin/marketplace.json:15` + `plugins/essense-flow/.claude-plugin/plugin.json:3` + `plugins/essense-flow/package.json:3` all read `"version": "0.13.4"`.

**Scope NOT addressed.**
- **L3 (lens-diff-bounding)** — DELIBERATELY skipped per user verdict "L1-L2-L4". Lens-diff-bounding ("only flag sprint-introduced issues; pre-existing debt → debt-ledger") risks burying real pre-existing bugs. Lens stays broad; L1's milestone-level effective gate absorbs the volume. Finding count stays elevated near-term; loop terminates via L1+L2+L4 alone (~3 sprints vs L1+L3+L4+L2's ~2 sprints).
- **CLI implementation of `optional_brief_inputs`** — field documented in `redesign/init-spec.md` v0.13.4 addendum; populating it from disk at `init architect` time deferred. User manually pastes the L2 brief at architect's decide step until the CLI wire-up ships.
- **L2 architect sprint execution** — brief is authored; user invokes `/essense-flow:architect` against Unity-diploma project to actually inject the seams. Future increment.
- **Class-pattern-ack regex-timeout enforcement** — master discipline only (no CLI-side check). Future increment could add a precomputed-count CLI sanity check that re-reads acknowledged-ledger.yaml and re-derives the count.
- **drift-canon-tax-emission audit check** — codification of the L4 verifiable check (canon-tax task exists post-pack when applicable) as a drift-audit row. Future increment.
- **All round-loop-closure / closure-plan items from v0.13.3** — unchanged carry-forward.
- **Same-finding-id legacy ack path performance** — when finding_ids stabilize across sprints (rare), the legacy per-id ack still works; v0.13.4 does not break it.
- **6-build seam-injection itself** — that's L2's architect-sprint output, not v0.13.4 source. Plugin source ships the BRIEF + init-spec wiring; the seam code lands in a consumer project.

### Carries-forward instruction (propagation per CLAUDE.md)

- **Limits-awareness** — L1 class-pattern-ack relies on master discipline computing `class_acknowledged` correctly each sprint. CLI does not re-derive (only reads frontmatter). Future audits MUST cross-check master's count against acknowledged-ledger.yaml entries' match_pattern coverage.
- **Positive mindset** — Three-lever fix (L1+L2+L4) for a 10-cause symptom is tractable. Loop termination is reachable in ~3 sprints once Unity-diploma adopts.
- **Quality ownership** — Class-pattern entries without `decision_ref:` are REJECTED — governance trace is non-negotiable. Without that, class-acks become silent "make it go away" tools rather than auditable debt-management.
- **Propagation requirement** — Every artifact created or modified in this hotfix carries these four instructions forward (review/SKILL.md, architect/SKILL.md, architecture.md template, qa-report.md template, class-pattern-ack.test.cjs, L2 brief, init-spec.md addendum, RELEASE-NOTES entry, governance entries in 06-decisions.md + SURPRISES.md).


## 0.13.3 — Context-engineering adherence enforcement + propagation-block consolidation

Audit-driven hotfix per 2026-05-17 v0.13.3 closure-reopening decision in `redesign/06-decisions.md`. User invoked `/field-to-ship` against a meta-audit prompt; runner researched Anthropic canonical context-engineering guidance (synthesized 15 tenets T1..T15 from anthropic.com/engineering/effective-context-engineering-for-ai-agents + equipping-agents-for-the-real-world-with-agent-skills + Anthropic Skills repo Skill Writing Guide via Context7 + WebFetch); compared plugin practices against the tenets; user verdicts: (1) propagation-block conflict → *"Consolidate to principles.md + cite (canonical T11)"*; (2) sprint scope → *"All 4 tests (T-ENF-1..4) + propagation-block decision"*; (3) deprioritize T11 SKILL.md body <500 lines.

**Propagation-block consolidation (canonical T11).** Pre-v0.13.3, the 4-bullet "Read this before doing anything" block (Limits-awareness / Positive mindset / Quality ownership / Propagation requirement) was duplicated verbatim in 3 of 9 SKILL.md files and absent in the other 6 — inconsistent + duplicative per Anthropic T1/T3/T11 (smallest high-signal token set; tight informative context; SKILL.md body ideally <500 lines via progressive disclosure). Block moved to `references/principles.md` as a new `## Read This Before Doing Anything` section; each of 9 SKILL.md now carries the single-line citation `See \`references/principles.md\` \`## Read This Before Doing Anything\``. `tests/conduct-preamble.test.js` extended with a 4th test enforcing the citation pattern + canonical section presence + 4-bullet content. Existing Conduct preamble verbatim test unchanged.

**T-ENF-1 — description consistency (`tests/description-consistency.test.js`).** Per-skill check: SKILL.md frontmatter description shares >=50% significant-word overlap with `commands/<skill>.md` frontmatter description. Catches major drift (different verbs / different scope) while tolerating minor wording shifts. Context skill has no `commands/context.md` counterpart (uses /status + /next; not /context) — informational-skip per Fail-Soft, not failure. **9 skill-description-pairs surveyed; 8 pairs pass; 1 informational-skip.**

**T-ENF-2 V1 — brief↔agent return-shape presence (`tests/brief-vs-agent-returns.test.js`).** Per-pair check: brief MUST declare an output-shape section (`## Required output` | `## Required return shape` | `## Output`); agent MUST declare a return-shape section (`## Returns` | `## Output shape` | `## Output format`). 7 brief↔agent pairs covered. First-run surfaced 3 real drift findings, all fixed in this commit:
- `agents/essense-flow-adversarial-lens.md` — added `## Returns` section pointing at the per-finding YAML shape declared in `## Job` (was inline, no formal header).
- `agents/essense-flow-sub-architect.md` — renamed `## Your return shape` → `## Returns` for naming consistency.
- `skills/verify/templates/extraction-brief.md` — extracted YAML shape into new `## Required output` section with named-field list (was inline under `## Your job`, no formal output-shape header).

T-ENF-2 V2 (content-overlap check: brief-required field names ⊆ agent-emit field names) is deferred to future-increment — requires both sides normalized to a single section name + structured fields.

**T-ENF-3 — governance ledger compaction policy (`tests/ledger-compaction.test.js`).** Per Anthropic T7 (compaction): scan `redesign/SURPRISES.md` + `redesign/06-decisions.md` for H2 entries with `**Status:**` ∈ {resolved, ratified, complete} AND date >30 days old; fail with archive-list. V1 iteration is fail-with-list; auto-archive script deferred to future-increment. Today passes (all entries ≤30 days old, post-v0.13.2 ship); gate installed for future entries. Fail-Soft: if `essense-flow-re-imagined/redesign/` workspace absent on consumer machine, test skips with stderr note (other plugin consumers don't need the redesign workspace).

**T-ENF-4 — skill-substance README presence (`tests/skill-substance-readme.test.js`).** If `plugins/essense-flow/skill-substance/` contains ≥1 *.md substance file, README.md must be present + reference closure-plan SPEC DD-2 + name the redesign workspace location of the full 9-file source-of-truth set. Authored `skill-substance/README.md` explaining the 3-vs-9 ship rationale: 3 dispatch-substance-rule skills (architect / review / verify) ship as runtime-needed; 6 non-shipped (build / context / elicit / heal / research / triage) live as design-time source-of-truth in `essense-flow-re-imagined/redesign/skill-substance/` with `FROZEN-SHA.yaml` hash-pin.

**Cumulative test counts.**
- CJS: 43/43 pass (unchanged from v0.13.2).
- ESM: 67/67 pass (was 62/62 pre-v0.13.3; +5 new tests: 1 in `tests/conduct-preamble.test.js` for citation pattern; 4 new test files `tests/{description-consistency,brief-vs-agent-returns,ledger-compaction,skill-substance-readme}.test.js`).
- Total: 110 ACs green. `npm test` exit 0 cleanly.

**Version source-of-record.** Bumped together: `mk-cc-resources/.claude-plugin/marketplace.json:15` + `plugins/essense-flow/.claude-plugin/plugin.json:3` + `plugins/essense-flow/package.json:3` all read `"version": "0.13.3"`.

**Scope NOT addressed.**
- T11 SKILL.md body <500 lines (architect/SKILL.md at 601) — user-deprioritized via verbatim verdict *"i don't think 1 is important"*.
- T14 scenario-specific content extraction from SKILL.md bodies — paired with T11; deferred.
- T-ENF-2 V2 content-overlap check — requires both sides normalized + structured; future-increment.
- T-ENF-3 auto-archive mechanism — V1 is fail-with-list; auto-archive script is future-increment.
- T-ENF-1 threshold tuning (0.5 word overlap is loose; misses single-word drift like architect's `align` step missing in commands preamble) — could tighten to 0.7+ with false-positive risk trade-off; future-increment if drift accumulates.
- Drift-6/7/8/9 audit substance (closure-plan SPEC DD-4) — STILL owed by future increment (unchanged from S10.8/S10.9).
- `architecture.round` + `escalation_signoff` + `halt_*` + `sprint_complete_at` + `sprint_summary` + `known_open_concerns` validator type-checks (BS-4 pattern-class extension) — unchanged from v0.13.2 footnote.
- T10 just-in-time loading architectural shift — out of scope; would require redesign.
- Propagation-rule scope (every descendant artifact) test only enforces SKILL.md citation; briefs / agents / tests / governance entries are NOT enforced. Test scope narrower than rule scope — future-increment can broaden.
- T-ENF-2 V1 brief↔agent pair list is hardcoded (7 pairs); new pair additions require test maintenance — future-increment could derive from agent-spec.md programmatically.


## 0.13.2 — Validator contract symmetry + test timestamp quoting

Hotfix per 2026-05-16 v0.13.2 closure-reopening decision in `redesign/06-decisions.md`. Surfaces from `field-to-ship` skill proactive audit-mode invocation against `plugins/essense-flow/` (bin/ + lib/ + skills/ + tests/) using the pattern library at `~/.claude/skills/field-to-ship/patterns.yaml`. Two findings; both verified against current source line-by-line before any code touch. No new public API; pure validator extension + test cleanup.

**F1 — `validateStateShape` contract symmetry for wave + 3 round fields + 6 ISO8601 *_at fields (`lib/state.js`).** v0.13.1 Fix-3 closed the asymmetry between the `state-set-sprint` CLI write op contract (`parsePositiveIntOrNull` at `bin/essense-flow-tools.cjs:1707`) and the shape validator for the `sprint` field only. Audit revealed the same BS-4 asymmetry shape across 10 peer fields with CLI-write-op contracts not mirrored in the validator. F1 closes the pattern-class: extends `validateStateShape` to mirror `parsePositiveIntOrNull` (wave at `:1711`), `parseNonNegInt` (3 round fields at `:1715, :1727, :1743`), `parseIso8601` (6 *_at fields at `:1719, :1723, :1731, :1735, :1739, :1747`). Type-mismatch surfaces as `ShapeValidationError` with `details.field` naming the offender (dotted form for nested fields, e.g. `'elicitation.round'`, `'architecture.completed_at'`). Direct YAML writes that previously slipped `wave: "abc"`, `elicitation: { round: -1 }`, `architecture: { completed_at: "not-iso" }` etc. through validator now surface at `readState` time as `degraded:'corrupt'` with the offending field named. Existing CLI-only writers unaffected — CLI ops already enforced the stricter contract on the write side. Three helpers (`checkOptionalObject`, `checkNestedNonNegInt`, `checkNestedIso8601`) live at module scope so they allocate once at module load rather than per-call.

**F2 — quoted ISO timestamps in `tests/state.test.js:75 + :193`.** Latent BS-3 fragility: both lines seeded unquoted ISO timestamp `last_updated: 2026-05-16T12:00:00.000Z\n` in YAML test fixtures. js-yaml default-schema parses unquoted ISO8601 strings as `Date` objects; validator would catch as `typeof !== 'string'`. Tests currently passed only because `validateStateShape` checks `phase` (`lib/state.js:152-161`) BEFORE `last_updated` (`:166-175`); the `phase 'invented-phase' not in canonical transitions` error fired first and the tests' `field === 'phase'` assertion held. Fragility: if validator field-check order ever changes OR if `'invented-phase'` becomes canonical, `last_updated` Date-not-string would fire first with surprise field name. F2 quotes the timestamps (matches `tests/hooks.test.js:65, 97, 124` established v0.13.1 BS-3 mitigation pattern). One-character-each fix.

**New tests added with the hotfix** (5 ACs appended to existing `test/state-shape-validator.test.cjs`):
- AC-11 — wave accepts null + positive int (1, 7, 100); rejects string (`'abc'`, `'3'`), 0, -1, 1.5, true, []; `shape_error.details.field === 'wave'`.
- AC-12 — nested parents (elicitation, research, triage, architecture, decomposition, verify) reject non-object values (`'scalar'`, 42, true, []) with `shape_error.details.field === <parent>`; null parents accepted.
- AC-13 — nested round fields (elicitation.round, research.round, decomposition.round) accept null + non-neg int (0, 1, 25); reject `'abc'`, -1, 1.5, true; `shape_error.details.field === '<parent>.round'`.
- AC-14 — nested ISO8601 *_at fields (elicitation.started_at + .completed_at, research.completed_at, triage.completed_at, architecture.completed_at, verify.completed_at) accept null + valid ISO (`'2026-05-14T07:30:00.000Z'`, `'2026-05-14T07:30:00Z'`); reject `'not-iso'`, `'2026-05-14 07:30:00'` (space), `'+00:00'` offset, numeric, boolean; `shape_error.details.field === '<parent>.<field>'`.
- AC-15 — defaults/state.yaml round-trip via `initState` then `readState` returns `degraded:null` after F1 (regression guard).

**Cumulative test counts.** CJS: 43/43 pass (incl. 19/19 in `test/state-shape-validator.test.cjs` — was 14/14 pre-F1; added 5 ACs); ESM: 62/62 pass. `npm test` exit 0 cleanly. Total 105 ACs green.

**Version source-of-record.** Bumped together: `mk-cc-resources/.claude-plugin/marketplace.json:15` + `plugins/essense-flow/.claude-plugin/plugin.json:3` + `plugins/essense-flow/package.json:3` all read `"version": "0.13.2"` (precedent locked in v0.13.1 — Claude Code installer reads canonical sources, package.json is advisory; bumping all three keeps human readers honest).

**Scope NOT addressed by this hotfix.**
- Drift-6/7/8/9 audit substance (closure-plan SPEC DD-4) — still owed by future increment (unchanged from v0.13.1 closure-reopening's "Scope NOT reopened" list). Drift-6 firing in wild (per S10.8 evidence on `D:\Diploma\Unity\Scalable Crowd`) is not closed by F1; F1 closes BS-4 asymmetry only, not the unknown-key-accumulation surface that drift-6 audit would catch.
- `architecture.round` + `architecture.escalation_signoff` type-check — these fields have NO CLI write op (no entry in SETTERS at `bin/essense-flow-tools.cjs:1704-1748`); BS-4 mirror does not apply without a write-op contract to mirror. The round counter is read defensively at `:1376` with `Number.isInteger(archBlock.round) ? archBlock.round : 0` so non-int values default to 0 (no silent breakage of the M-5 round-budget gate per D-Sprint10-4). Out of v0.13.2 F1 scope; candidate future increment is either (a) add a `state-set-architecture-round` CLI op + mirror in validator, OR (b) validator-only enforcement without a CLI op.
- General redesign meta-flow — S10/S10.5/S11 rows stay `closed-for-reference` per 2026-05-16 closing decision. v0.13.2 closes a SECOND BS-4-class surface; does NOT resume meta-flow.
- Any further post-ship hotfix or v.next increment requires its own closure-reopening decision per established discipline (`06-decisions.md` 2026-05-16 v0.13.1 closure-reopening verbatim).


## 0.13.1 — Sprint-id predicate hardening + baseline test maintenance

Hotfix per 2026-05-16 closure-reopening decision in `redesign/06-decisions.md`. Surfaces from real-project failures in `D:\Diploma\Unity\Scalable Crowd` using cached `0.13.0`; root causes verified against cached source line-by-line before any code touch. Three concrete fixes + baseline test green; no new public API; additive `sprint_iteration` state field.

**Fix-1+2 — `<n>` predicate substitution diagnostic (`bin/essense-flow-tools.cjs:2154-2178` + `:1845-1872`).** When a transition's `requires:` predicate references `<n>` (e.g. `.pipeline/build/sprints/<n>/SPRINT-REPORT.md exists`) and the resolved sprint is null (state.sprint absent or non-number, `--sprint` arg not accepted for the target phase), the CLI no longer emits a misleading "not on disk" diagnostic pointing at the literal-`<n>` path. New kind `sprint-template-unresolved` surfaces from `evaluatePredicate`; call site translates to a diagnostic naming the resolution failure + the observed `state.sprint` value + a recovery hint pointing to either `--sprint <int>` (for sprint-accepting targets) or `state-set-sprint --value <int>` (for non-sprint targets that read state.sprint instead). Exit code unchanged (7 = `EXIT_PREREQ_MISSING`).

**Fix-3 — sprint shape type-check (`lib/state.js` `validateStateShape`).** When `sprint` is present in `state.yaml`, it must be `null` or a positive integer. Closes the asymmetry between the CLI write op `state-set-sprint` (which already enforces `parsePositiveIntOrNull`) and the shape validator (previously accepted any value). Direct YAML writes that introduced string sprint ids like `"3-PATCH-2"` previously passed shape validation and broke `<n>` substitution downstream; they now surface as `degraded:'corrupt'` with `shape_error.field === 'sprint'` at `readState` time.

**DD-15 — `sprint_iteration` field (additive; default `null`).** New optional positive-integer counter for re-runs of the *same* sprint number (fix-only follow-up passes). Sprint id stays positive int; iteration counts independently. Closes the user pattern of inventing string sprint labels like `3-PATCH-2`. Added to `OPTIONAL_KEYS` in `lib/state.js`; type-checked in `validateStateShape`; defaulted to `null` in `defaults/state.yaml`. Predicate path templates remain on `<n>` for sprint id only — `sprint_iteration` does not enter canonical paths in this release.

**Baseline test maintenance (17 ACs across 4 CJS test files + 4 ESM test files).** Discovered during this hotfix: plugin source main HEAD shipped `0.13.0` with 17 failing test ACs. Pattern was tests trailing implementation contract changes (D-Rd11-11 + D-Rd12-1 + D-Rd12-5). All updated to match landed contracts; **no implementation rollbacks**.
- `tests/state.test.js` (4) — readState contract for yaml-parse-failure (throws) vs shape-validation-failure (returns degraded with `shape_error`); writeState callers must pass full canonical state (incl. `schema_version`).
- `tests/finalize.test.js` (2) — finalize `nextState` arg now requires `schema_version: 1` (post D-Rd11-11 shape contract).
- `tests/hooks.test.js` (3) — seed YAML for hook tests must quote ISO timestamps (otherwise js-yaml parses as `Date` object and shape validator fails `typeof === 'string'`).
- `tests/conduct-preamble.test.js` (2) — frontmatter regex + canonical-preamble `includes()` checks now normalize CRLF → LF before matching (Windows-checked-in SKILL.md files use CRLF).
- `test/heal-apply-disposition.test.cjs` (3) — envelope keys are now `[ok, op, item_id, action, prior_status, new_status, heal_log_path, last_updated]` per D-Rd12-4 (i); drift keys `claimed_at` + `exit_code` removed from envelope; semantic claimed_at assertions moved to register entry on disk.
- `test/heal-sweep-log-atomic.test.cjs` (2) — atomicity proof is now byte-identical hash + no-orphan-tmp (cleanup hook fires per T-952 + D-Rd11-8); STALE_SWEEP token renamed to STALE_SWEEP_AUTO_RELEASE per T-962 / D-Rd12-6.
- `redesign/scripts/.test-fixtures/arch-alignment-check/pass*.md` (7 fixtures × ~8 ACs) — pass-fixtures now carry `sprint: 10` + `architect_round: 13` so the reader finds the `bootstrap_exemption_round_13: true` flag in `tmp-spike-CLOSURE/.pipeline/architecture/sprints/10/manifest.yaml` and emits zero findings per D-Rd12-5 (ii).

**New tests added with the hotfix.**
- `test/sprint-template-unresolved.test.cjs` — 3 ACs: undefined sprint + reviewing target emits sprint-resolution diagnostic; string sprint surfaces observed-type; regression guard against pre-hotfix `<n>... not on disk` wording.
- `test/sprint-shape-validation.test.cjs` — 10 ACs: sprint accepts null + positive int; rejects string / 0 / negative / non-integer; sprint_iteration accepts null / positive int; rejects strings.

**Cumulative test counts.** CJS: 43/43 pass (was 41/41 with 17 hidden failures pre-hotfix); ESM: 62/62 pass. `npm test` exits 0 cleanly for the first time since `0.13.0` shipped.

**Version source-of-record cleanup.** Plugin `package.json:3` bumped from `0.11.0` → `0.13.1` to reconcile a multi-version stale drift discovered during this hotfix; the Claude Code installer reads `.claude-plugin/marketplace.json:15` and `.claude-plugin/plugin.json:3` (both bumped to `0.13.1`), not `package.json`, so the stale value never affected installation behavior — but it misled human readers. Now consistent across all three.

**Scope NOT addressed by this hotfix** (per closure-reopening decision verbatim).
- Drift-6 audit substance (closure-plan SPEC DD-4): direct-YAML-write bypass detection. This hotfix adds *evidence* that drift-6 fires in real projects (28+ unknown `manual_transition_round_N` keys observed in user's `state.yaml`) but does NOT implement the substantive audit check. Still owed by a future increment.
- Drift-7/8/9 audit substance: still owed by a future increment.
- writeState's no-merge behavior with caller's `nextState`: writeState writes exactly what the caller passes (overlaid with `last_updated`), so callers must supply full canonical shape. Tests updated to match; latent gap for a future increment if production callers ever start passing partial state.

---

## 0.13.0 — Round-loop closure (Move 1-4 + L-7 + L-8 + annotation contract)

Additive feature work landed under `round-loop-closure/` in the meta-repo. Closes the round-N amendment loop pattern observed externally (Unity-shape project showed 8 review rounds on Sprint 3 with 5 of 6 confirmed criticals pre-existing, debt pool emptying one element per round). The framework now surfaces the FAMILY of a rule violation in a single round instead of staging across N rounds.

**Move 1 — rules as executable checks.** `references/decision-schema.yaml` locks the schema for rule-decisions. `lib/decision-schema-validator.cjs` validates every decision; rule-decisions (those with `applies_to:`) must have machine-checkable encoding OR explicit `unchecked-rule` acknowledgment. CLI op `spec-rule-validate --decisions-file <path>` rejects non-conformant decisions with exit 7.

**Move 2 — per-hit validator dispatch.** `essense-flow-validator` agent extended with verdict `intentional_exception` and Step 1.5 annotation re-read. Every sweep candidate gets a clean-context validator pass; raw grep is never trusted directly.

**Move 3 — annotation contract.** `references/annotation-shape.yaml` locks the grammar `[EssenseFlow: exempts <rule-id>, reason: <text>]`. `lib/annotation-parser.cjs` exposes `parseAnnotation` + `findAnnotations`. Validator honors annotations on Step 1.5; sweep marks candidates near annotations as `intentional_exception_candidate: true`.

**Move 4 — two new lenses.**
- `essense-flow-rule-completeness-lens` (L-7): iterates every rule with `applies_to`, calls `review-rule-sweep` per rule, emits findings per non-exempt sibling.
- `essense-flow-pattern-debt-lens` (L-8): reads prior-sprint QA-REPORT files; re-runs each cited rule's sweep against current substrate; emits findings only for NEW hits.

Both registered at `plugins/essense-flow/agents/` + mirrored at `~/.claude/agents/`. Tools allowlist tight (Read, Grep, Glob, Bash).

**CLI surface additions** (3 new ops; existing 17 unchanged):
- `spec-rule-validate --decisions-file <path>`
- `review-rule-sweep --rule-id <id> --project-root <abs> [--decisions-file <path>] [--output-format json|md] [--budget-timeout-ms <int>]`
- `review-pattern-debt-sweep --project-root <abs> [--max-rounds <int>] [--budget-timeout-ms <int>] [--output-format json|md]`

**Review SKILL.md amended** to dispatch L-7 + L-8 alongside the 6 existing adversarial lenses in the same parallel-dispatch step. Existing 6-lens substance preserved verbatim. Bootstrap-baseline mechanism (DD-RLC-5) + budget caps (DD-RLC-6) documented.

**Architect alignment-lens criterion 7d added.** Validates `applies_to.kind` in closed list; `target` regex compiles; `scope_glob` non-empty; `violation_check.detect` non-empty; `unchecked-rule` ack fields present. Lens-side mirror of `spec-rule-validate`.

### Backward compatibility

- Existing v0.12 projects without `applies_to` blocks on rules see L-7 emit zero findings (graceful degradation). No regression.
- 12 canonical phases unchanged.
- 11-key state schema unchanged.
- Existing 17 CLI ops unchanged.
- 6 existing adversarial lenses unchanged.
- 10 existing registered agents unchanged.

### Verifiable checks landed

- `node test/annotation-parser.test.cjs` → 7/7 PASS
- `node test/decision-schema-validator.test.cjs` → 8/8 PASS
- `node test/rule-sweep.test.cjs` → 5/5 PASS
- `node test/pattern-debt-sweep.test.cjs` → 2/2 PASS
- CLI smoke fixtures at `round-loop-closure/.test-fixtures/r5-good`, `r5-bad`, `r6-regex`, `r6-absence`, `r6-xref`, `r7-debt`, `unity-shape`
- End-to-end Unity-shape fixture: round 1 sweep surfaces 1 confirmed + 1 exempt (kind=absence look_direction=before); round 2 (post-patch) returns 0 confirmed; L-8 replay returns 0 new_hits. Full notes at `round-loop-closure/spike-notes/R13-end-to-end.md`.

### Honest gaps in this increment

1. **Real Agent dispatch of L-7 + L-8 not verified end-to-end.** CLI mechanisms verified; lens agents registered; but no `Agent` tool dispatch of either lens fired during the build session. Real verification requires a user-driven `/essense-flow:review` run on a project with `applies_to`-encoded rules.
2. **Master orchestration of 8 lenses parallel not verified end-to-end.** Substance amendment to review/SKILL.md made; orchestration happens when master invokes the skill on a real project. Deferred to user-driven invocation.
3. **Bootstrap-baseline `--acknowledge-baseline` flag NOT implemented.** Documented in DD-RLC-5 + review/SKILL.md but `state-set-phase` does not yet accept the flag. Follow-up needed.
4. **Marketplace install on a third fresh project NOT smoke-tested.** Plugin source modifications uncommitted in mk-cc-resources at this session's end. Smoke install + R13 fixture re-run from marketplace-installed plugin is the final R14 verifiable check, deferred to user invocation.
5. **paired-xref kind** stub-implemented (behaves identically to xref for now). `pair_by` heuristic enforcement deferred.
6. **Annotation co-location heuristic** scans ±3 lines around candidate. Sufficient for most idiomatic placements; complex multi-line annotations may need future tuning.

### Where the design lives

`round-loop-closure/` at the meta-repo root contains the full plan + spec + state + decisions + spike-notes + test fixtures.

---

## 0.12.0 — Trust-model docs + drift-audit harness + dogfood pipeline

A minor increment along the 0.x line. The contract surface still evolves; this release lands the trust-model docs, the substantive drift-audit harness (drift-6/7/8/9 promoted from pending-spec to real checks), and two end-to-end dogfood runs that drove the pipeline idle→complete on fresh projects. v1 declaration deferred to a later release, by the operator, when the operator chooses.

### Move 1 — Trust-model docs as first-class artifacts

`SECURITY.md` and `TRUST.md` are now part of the install, not an afterthought. SECURITY.md names the threat model (operator-trusted infrastructure, not a sandbox), the reporting channel (mk-cc-resources GitHub issues, `[security]` prefix), the mitigations actually in place at 0.12 (finalize-only state writes, dual-record self-reports, evidence-bound findings, fail-soft hooks, no silent stubbing in heal, gitignore re-include negations), and the known limitations operators must absorb (no SAST, no sandbox, no signed releases, single-maintainer bus factor, Resolution A inline-substance dogfood gap from T-1029). TRUST.md makes the trust boundaries explicit: what the plugin trusts (marketplace source, finalize.js, transitions.yaml), what it actively distrusts (sub-agent self-reports, review findings without evidence, architect sprint-packing claims), how phase handoff works (artifact-mediated, atomic finalize, per-prompt re-grounding), and the calibrated assumptions on Claude behavior (drift, premature finish, shortcuts under pressure, recency bias). No future skill author can silently widen trust without contradicting these documents.

### Move 2 — README + architecture docs at D-A6 depth

`README.md` rewritten against the D-A6 doc-depth target: Purpose, Setup, Usage, API reference, Known limitations, Trust model pointer, License, Citation. Eight H2 sections, 150-300 lines. The "Versioning" prose that floated as a single H2 in 0.11.0 is now `## Known limitations` (honest about what 0.12 does not do) plus version history elsewhere. `docs/architecture.md` lands as a new artifact: Module map, Per-module (one subsection per top-level dir), Data flow walkthrough (state.yaml + finalize trace), Key abstractions (closed contracts, dual-record, evidence-bound findings, fail-soft hooks), Propagation. Operators no longer have to grep SKILL.md to understand the lib/skills/hooks topology.

### Move 3 — Doc structure locked by architecture decision

The D-A6 decision (Resolution A) freezes doc depth targets: SECURITY.md ~75 lines, TRUST.md per-section coverage of trust boundaries, README.md ~220 lines with 8 H2 sections, docs/architecture.md ~300 lines with 5 H2 sections. T-1030's test_completion_contract enforces these via grep + wc-l acceptance checks. Future doc edits that drift outside the bands fail the audit. The 0.x pattern of "doc by vibe" closes.

### Move 4 — Substantive drift-audit + end-to-end dogfood

drift-6 (SHA-256 fingerprint integrity), drift-7 (decompose triple-witness), drift-8 (audit-time dispatch-count defense), drift-9 (cursor-phase divergence) all promoted from pending-spec stubs to real checks at `redesign/scripts/drift-audit.py`. Two fresh-project pipelines (bookmarx + mdlinks) ran idle→complete this increment, each terminating with drift-audit 11/11 PASS. `claude plugin install essense-flow` from marketplace.json registry verified working (cold + warm both exit 0). Increment is substantive; v1 declaration intentionally deferred — the operator declares v1 when ready, not at every contract-surface change.

### Verifiable checks

- `SECURITY.md` exists with 4 required H2 sections (`Threat model`, `Reporting`, `Mitigations`, `Known limitations`) + propagation footer; line count 50-100.
- `TRUST.md` exists with 4 required H2 sections (`What trusts`, `What distrusts`, `Handoff between phases`, `Assumptions on Claude`) + propagation footer.
- `README.md` line count 150-300; 8 H2 sections matching the D-A6 spec.
- `docs/architecture.md` line count 200-400; 5 H2 sections.
- `RELEASE-NOTES.md` leads with `## 0.12.0`; 4 `### Move ` subsections; existing `## 0.11.0` entry preserved verbatim below.
- T-1029 + T-1031 ship-gate acceptance criteria remain green (see their completion records).
- `node scripts/self-test.js` + `node scripts/validate-plugin.js` both pass.

### Version bump

Plugin `0.11.0` → `0.12.0` (minor — additive: trust-model docs + drift-audit substance + dogfood evidence; contract surface unchanged).
Marketplace `2.4.0` → `2.5.0` (minor — coincides with plugin minor bump).

## 0.11.0 — Contracts at the point of action

The 0.10.0 master/sub-agent rewrite cut context dilution but left a class of failures in place: master could still bypass `lib/finalize.js` and write `state.yaml` directly with an invented phase value (e.g. `phase: building`), or improvise the on-disk schema (single `SPRINT-MANIFEST.yaml` instead of one per sprint, `tasks/*.md` instead of `sprints/<n>/tasks/*.yaml`). Downstream skills (build) then halted because canonical paths were absent.

0.11.0 closes the bypass without adding new gates. Three moves, each calibrated to "help without encumber."

### Move 1 — Closing "Before you finalize" block on every phase-producing skill

Every phase-producing SKILL.md now ends with a closing block that:

- Lists the legal phase targets verbatim (copied from `references/transitions.yaml` — no synonyms)
- Names common invented values (`building`, `done`, `architected`) so they read as wrong
- Shows the exact `finalize({writes, nextState})` call shape with paths populated
- Carries a numbered self-check: phase spelled exactly, `<n>` expanded to the literal sprint number, file extensions correct, sub-agents dispatched, `finalize` is the only writer
- Closes with: "if any answer is no, stop"

Placement is deliberate. The closing block is the last thing master reads — recency bias works for the rule instead of against. Master executing the finalize step sees the contract right where the action happens, not buried at the top of the file under thousands of substance tokens.

Skills covered: architect, build, review, verify, elicit, research, triage. Heal carries a variant ("Before each apply step") because heal walks the legal graph one step at a time rather than finalizing once.

### Move 2 — Soft `requires:` advisory in `finalize.js`

`finalize` now reads the `requires:` field of the from→to transition in `transitions.yaml`, extracts any path hints (substrings starting with `.pipeline/`), expands `<n>` to `nextState.sprint`, and emits a stderr advisory if a hinted path is neither in `writes[]` nor on disk:

```
[finalize] heads up: transition architecture->sprinting expects
.pipeline/architecture/sprints/1/manifest.yaml — not in writes,
not on disk. proceeding anyway.
```

The advisory does **not** refuse the transition. The legality check (legal `from→to` edge in the graph) remains the gate; this is purely informational, surfacing the gap at the moment of cost. Caller can ignore with reason.

`assertLegalTransition` now returns `requires` alongside the legality verdict, and `finalize` surfaces it. ~30 LOC including path normalization for Windows separators. Three new tests (advisory fires when path missing; advisory silent when path provided; `<n>` expands to literal sprint number). Test count 59 → 62, all pass.

### Move 3 — Heal recognizes improvised-schema architect output

Heal's SKILL.md gains an "Improvised-schema architect output (recovery case)" section enumerating detection signals (illegal `phase` value, single `SPRINT-MANIFEST.yaml`, flat `tasks/*.md`) and a per-step conversion proposal that:

1. Repairs an invalid `phase` to the nearest legal phase via `force: true` on the first finalize step (the only legal recovery for an illegally-named phase).
2. Splits a flat `SPRINT-MANIFEST.yaml` into one `sprints/<n>/manifest.yaml` per sprint, archiving the original under `.pipeline/.heal-archive/`.
3. Converts each `tasks/*.md` to `sprints/<n>/tasks/<id>.yaml`, deriving fields where possible (`goal` from "Why" section, `file_write_contract.allowed` from `files:` frontmatter, etc.) and explicitly surfacing fields that **cannot** be derived (`behavioral_pseudocode`, `test_completion_contract`) for user fill-in or routing back to architect.

No silent stubbing. Per-conversion user confirm. Original artifacts archived, never deleted.

### What did NOT get added

Per the constraint "wary of strict / encumbering": no PreToolUse hook on `state.yaml`, no schema-validator scripts, no count thresholds, no refusal in `finalize` when `requires:` paths are missing. The advisory warns; the legality check refuses. That's the entire enforcement surface.

### Verifiable checks

- `tail -50 skills/architect/SKILL.md` ends with "## Before you finalize"; same for build, review, verify, elicit, research, triage. Heal ends with "## Before each apply step".
- `node scripts/self-test.js` → 62/62 pass.
- `node scripts/validate-plugin.js` → `validate-plugin OK`.
- New tests verify advisory fires/doesn't fire correctly and that `<n>` expansion uses `nextState.sprint`.

Plugin 0.10.1 → 0.11.0 (minor — adds contract surface and `finalize` capability).
Marketplace 2.3.1 → 2.4.0 (minor — plugin sub-bump).

## 0.10.1 — Ship libs and build templates that were silently gitignored

Bug fix. Pre-existing shipping defect, surfaced when 0.10.0 sub-architect dispatch tried to load `lib/dispatch.js` from the installed marketplace cache and failed at `import { envelope } from "./brief.js"` — `brief.js` was on local disk but never reached git.

Root cause: repo-root `.gitignore` carries Python boilerplate (`build/`, `lib/`, `var/`, `wheels/`, etc.). The `lib/` and `build/` rules were recursively swallowing the plugin's own `plugins/essense-flow/lib/` and `plugins/essense-flow/skills/build/` directories. Only `lib/dispatch.js` had been force-added at some point in 0.4.x; the other four lib modules and two build templates that the build skill's SKILL.md references were never tracked.

Fix:
- `.gitignore` adds re-include negation patterns: `!plugins/*/lib/`, `!plugins/*/lib/**`, `!plugins/*/skills/build/`, `!plugins/*/skills/build/**`. Python ignores still apply to repo-root `lib/`, `build/` etc. — only plugin internals are re-included.
- Six previously-ignored files now ship: `lib/brief.js`, `lib/finalize.js`, `lib/state.js`, `lib/verify-disk.js`, `skills/build/templates/completion-record.md`, `skills/build/templates/sprint-report.md`.

Verifiable check: `git ls-files plugins/essense-flow/lib/` now returns 5 paths, not 1. Re-installing the plugin pulls a complete `lib/` so `dispatch.js`'s `import "./brief.js"` resolves.

No code changes to the libs or templates — they were already authored and passing the existing 59-test suite locally; they simply weren't reaching the marketplace install.

## 0.10.0 — Master / sub-agent orchestration

The architect rewrite that surfaced the failure mode also surfaced the systemic answer: when a skill produces N closed contracts, doing the substance in master context causes the discipline rule to drift under the fetched material. The fix is the master/sub-agent pattern — master orchestrates, sub-agents do substance, master synthesizes with the rule still loud.

### Architect rewritten — master architect mandatory

- Architect now opens with: "**You are the master architect. You orchestrate. You do not personally write task specs.**"
- Five jobs in sequence: **decide → delegate → synthesize → pack → finalize.**
- Master decides top-level boundaries; spawns one **sub-architect** per module via `Agent` tool calls (parallel, no concurrency cap); receives closed task specs back; packs sprints from the dependency graph with the rule still in working memory.
- New `templates/sub-architect-brief.md` — sub-architects forbidden from packing sprints, forbidden from cross-module decisions, must return closed contracts only.
- Sprint-packing math made operational: **sprint count = topological depth of the dependency graph.** Sprint > 1 manifest entries MUST carry `data_dependency_on_prior_sprint:` one-sentence justification — empty = invalid (architect collapses).
- Wave-first thinking named: "Wave 2 is parallel-safe; same `/build` invocation. Sprint 2 is a hard checkpoint requiring user re-invoke."
- Stop-cost rule explicit: "Every sprint split = the user types `/build` again."
- New section "Why the master/sub-architect split exists" names three observed failure modes: context dilution, theme drift, stop multiplication.

### research / build / review / verify — delegation hardened

Each carries a new "## Why delegation is mandatory here" section naming:
- The substance volume that would dilute master context
- The specific discipline rule that would drift
- The drift symptom the delegation prevents

These four already dispatched parallel agents; the SKILL.md prose now states *why* the delegation is the mechanism, not just *that* it happens. Drift in the future is now traceable to a removed paragraph, not to an unwritten convention.

### triage / heal — optional delegation pattern added

Both gain "## Optional delegation" sections, judgment-driven:

- **triage** — for large input batches (post-review with many findings, post-research with many gaps), dispatch **per-class sub-triagers** (one per item kind: bug, drift, gap, ambiguity, missing-analysis). Each returns dispositions; master cross-references against SPEC. New `templates/sub-triager-brief.md`.
- **heal** — for mid-flight projects with many prior artifacts, dispatch **per-shape sub-recognizers** (one per artifact kind: SPEC-shape, REQ-shape, ARCH-shape, sprint-output, foreign prose). Each reads bodies in its slice; master synthesizes walk-forward. New `templates/sub-recognizer-brief.md`.

Per **INST-13**: no count threshold triggers delegation. Judgment-driven. If the work feels like reading-and-deciding, master stays in main; if it feels like pattern-matching at volume, master delegates.

### Skills not touched (correctly)

- **elicit** — substance is dialogue with user; delegating breaks the contract.
- **context** — read-only state plumbing; no substance volume.

### Verifiable check

- `node scripts/self-test.js` → 59/59 green
- `node scripts/validate-plugin.js` → OK
- All 9 SKILL.md still carry verbatim Conduct preamble (audited)
- All 9 SKILL.md still cite all 5 principles in load-bearing sections (audited)

### What did NOT get added

Per user direction "forget adding validators as scripts and strict stuff" — no new JS validators, no manifest schema validators, no count thresholds. The discipline lives in SKILL.md prose, enforced by the master/sub-agent split itself: master arrives at synthesis with the rule loud because substance was elsewhere.

## 0.9.0 — Principle-citation enforcement

- **Architect now carries a Core Principle block citing the owner's "lowest amount of sprints necessary" rule verbatim.** The sprint-and-wave packing rules (default one sprint, one wave; split only on real data-dependency or file-conflict; theme-based splits rejected) are now anchored to the principle they enforce, not floating as one-of-many constraints.
- **All 9 SKILL.md files now cite all 5 principles** (Graceful-Degradation, Front-Loaded-Design, Fail-Soft, Diligent-Conduct, INST-13) in load-bearing sections (Core Principle or Constraints). Each citation names the **specific behavior** the principle governs in that skill — not label-stacking.
- **New audit test** `tests/principle-citations.test.js` enforces the above. Two assertions:
  - Every principle cited somewhere in every SKILL.md.
  - Every principle cited in either Core Principle or Constraints (load-bearing only — citations buried in incidental prose fail).
- **Test count: 57 → 59 green.**
- Drift guard: future SKILL.md edits that drop a citation fail this audit. Adding a new skill requires explicit entry + matching citations, or explicit `EXEMPT` registration with one-line justification.

## 0.8.0 — Clean break from 0.7.0

Full rewrite. Old plugin archived on `archive/essense-flow-v0.7`. Pre-1.0 — contracts may still shift before the first stable cut.

### What changed

- **No resource caps as fail-closed gates.** `MAX_CONCURRENT_AGENTS`, `MIN_WAVE_CAP`, every "if N exceeded, reject" clause — gone. Quality-gate thresholds remain (e.g. `evidence.min_quote_length`); they police evidence policy, not throughput.
- **Hooks are advisory only.** Two hooks total (`context-inject`, `next-step`). Neither blocks tool calls. Degraded state surfaces a warning and continues — every prior fail-closed branch removed.
- **Lib reduced to five primitives.** `state`, `finalize`, `brief`, `dispatch`, `verify-disk`. No 27-module orchestration tower. The cognitive work lives in the skill agents via the SKILL.md contracts they read at dispatch time.
- **Atomic finalize.** Every phase-producing skill writes its artifact and transitions state in one call. No more split write+transition that drops an autopilot loop into a phantom-artifact-with-stale-phase state.
- **Evidence-bound review.** Findings without verbatim path evidence are not findings. The validator re-reads cited files; quotes that drifted out of position auto-flag as false positives with reason `quote_drift`.
- **Conduct preamble.** Every SKILL.md begins with the verbatim Conduct block. Audited by `tests/conduct-preamble.test.js`.
- **Brief assembly fail-soft.** Oversize content emits a stderr warning and is returned in full. Briefs are contracts; contracts don't get truncated because the work was bigger than expected.

### Migration

Pipelines started under 0.7.0 should run `/heal` after upgrading. Heal walks the working directory, infers the phase from on-disk artifacts, and proposes a walk-forward — applies only on user confirm.

### Tested

- `node scripts/self-test.js` — all primitives + audits green.
- `tests/no-caps.test.js` — greps for the forbidden patterns; zero hits permitted.
- `tests/conduct-preamble.test.js` — every SKILL.md begins with the verbatim Conduct block.
- `tests/transitions.test.js` — every transition declared in any SKILL.md exists in `transitions.yaml`.
