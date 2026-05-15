# essense-flow architect skill — substance mirror

## Read this before doing anything

Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics. Refuse to "wrap up" when work isn't done.

Positive mindset: every gap solvable. Find the way by working carefully.

Quality ownership: this work matters. Take ownership.

Propagation requirement: every descendant artifact MUST carry these same 4 instructions.

## Scope of this file

This file mirrors the load-bearing substance of `plugins/essense-flow/skills/architect/SKILL.md` for the round-10+ `align` step (DD-20). The canonical SKILL.md remains the source of truth for the architect skill's operational mechanics; this substance mirror exists so that round-10+ governance text travels as evidence alongside SKILL.md and is grep-targetable from closure-plan validation (T-915 / T-935 / T-936 / T-937 / T-938 anchor scope).

If the SKILL.md body and this mirror diverge, SKILL.md wins. This mirror is updated at the same write boundary as SKILL.md changes — drift is a closure-plan validation failure.

## Five jobs in sequence (six steps from round-10+)

decide → delegate → synthesize → align → pack → finalize

Each step starts with `step-advance --skill architect --next-step <step-name>` to record monotonic progression on the cursor. The `align` step (round-10+ per DD-20 (a)) sits between `synthesize` and `pack`.

## ### 3.5 Align (master dispatches alignment-lens per sub-arch return)

**Cursor:** `step-advance --skill architect --next-step align`.

Note for build agent: the cursor.yaml `ordered_steps` for architect skill MUST gain an `align` step between `synthesize` and `pack`. Coordinate with M1-Rd10 (cursor schema owner) via declared dependency.

Per **DD-20 (a)**, sub-architect returns are not accepted as-is — every sub-arch return passes through an alignment-lens dispatch before pack. The lens is the `essense-flow-architect-alignment-lens` sub-agent (registered at `plugins/essense-flow/agents/essense-flow-architect-alignment-lens.md` per T-915 / `agent-spec.md` Section 1.10). The lens evaluates ALL 6 criteria per **DD-20 (b)** — master does NOT select-or-skip criteria; the deterministic-loop expectation per **D-Rd10-1** flows through (criterion-5 push-finding F20 silent-skip fix lives in the M1 deterministic CLI op `arch-alignment-check`). Self-review by master is explicitly REJECTED per DD-20 (a) — the dispatch is mandatory.

Dispatch loop body (verbatim shape):

```
For EACH sub-architect return synthesized in step 3:
  1. Read closure-plan-authored alignment-lens subagent definition file (per T-915 / agent-spec.md Section 1.10).
  2. Dispatch ONE `essense-flow-architect-alignment-lens` agent in FRESH context per DD-20 (a) with brief inputs:
       - sub_arch_return_path
       - closed_decisions_corpus (architecture/decisions.yaml + elicitation/SPEC.md + REQ.md)
       - module_seam_table (architecture/ARCH.md)
       - arch_alignment_check_findings (from sibling deterministic CLI op run BEFORE lens dispatch — invoke `bin/essense-flow-tools.cjs arch-alignment-check --sub-arch-return-path <path>` and pass its YAML output)
  3. Receive lens return YAML envelope (overall_verdict + per_criterion_findings + semantic_judgment_overlays per T-915 Step 6 output shape).
  4. IF overall_verdict == "aligned": continue to next sub-arch return.
  5. IF overall_verdict == "misaligned-by-criterion-N" OR "misaligned-crash":
       a. Increment retry-count for this sub-arch return (track in working memory; key = sub_arch return module + invocation hash).
       b. IF retry-count <= 2 per D-Rd9-5: RE-DISPATCH the SAME sub-architect (NOT a new one) with the original brief PLUS appended `alignment_findings:` block containing the lens findings list. The sub-architect returns again; loop to step 1 with the new return.
       c. IF retry-count == 3 (third failure per D-Rd9-5 escalation threshold): INVOKE AskUserQuestion with question:
            "Alignment lens has flagged sub-architect <module-name> three times across <criterion-list>. Choose path: [A] Accept misalignment as-is (record rationale), [B] Re-dispatch sub-architect with sharper boundary, [C] Halt architect skill and route back to eliciting."
          Per user verdict:
            - A → record `accepted_misalignment_rationale` in architecture/decisions.yaml; continue to pack with the misaligned return + user-ratified-exception flag.
            - B → reset retry-count to 0; dispatch with master-amended brief.
            - C → call `state-set-phase --value eliciting`; halt architect skill; surface unresolved findings.
```

**Retry-count + escalation rules per DD-20 (c) + D-Rd9-5.** Retry-count is bounded at 2 (per D-Rd9-5 — locks retry-count at 2); the third failure escalates via `AskUserQuestion` (no master inline-fix path, no user-surface-default — escalation is the exception path on the 3rd failure only). Retry-count is in-memory master state (NOT persisted to state.yaml per DD-12 (a)).

**Bootstrap exemption (round-10 only):** Per D-Rd10-3, round-10 architect-master MAY skip step 3.5 dispatch ONLY for the round-10 sub-architect dispatches that produced the closure-plan workspace alignment-lens substance itself (T-915 / T-935 / T-936 / T-937 / T-938). From round-11+, NO further bootstrap exemption — step 3.5 is mandatory for every sub-arch return.

**Quorum behavior.** Per DD-2 substance-rule-via-dispatch extended by DD-20 (a) to architect-time alignment review: all-required. A crashed lens becomes a synthetic `overall_verdict: misaligned-crash` finding; treated as a misalignment per step 5 above; retry-counter increments.

**Forward-coupling note.** Sprint manifest MUST carry `alignment_lens_dispatches_per_round: <int >= sub_architect_dispatches>` per DD-20 (d) substance rule. Predicate `with sufficient alignment lens dispatch` (registered in tools.cjs evaluatePredicate per M1-owned task) gates pack-phase completion.

## Hard checks closed by this substance

- DD-20 (a): dispatch path is "Sub-agent dispatch (essense-flow-architect-alignment-lens)" — no self-review path, no master-inline-judgment branch.
- DD-20 (b): all 6 criteria invoked via the lens; pseudocode does NOT select-or-skip criteria at master layer.
- DD-20 (c): retry-count <= 2 retries (D-Rd9-5 locks retry-count at 2); third failure escalates via AskUserQuestion; NO master inline-fix, NO user-surface-default.
- DD-20 (d): forward-coupling to `alignment_lens_dispatches_per_round` predicate cited; predicate handler impl is M1 scope.
- D-Rd10-1: deterministic-loop expectation flows through (lens evaluates all 6 criteria EVERY dispatch).
- D-Rd10-3: bootstrap exemption call-out names ONLY round-10 and ONLY the lens-substance-authoring sub-arch dispatches; round-11+ NO further exemption.
- DD-2: quorum all-required cross-ref present; crashed lens → synthetic misaligned-crash finding.

## M-3 cross-module-concern checklist (synthesize-step substance)

#### M-3 cross-module-concern checklist (mandatory in synthesize)

After collecting sub-architect returns and BEFORE invoking the align step (lens dispatch), enumerate every unordered module pair (M_i, M_j) where i < j and ask three questions:

1. **Data dependency:** Does M_i's task spec output (file, artifact, symbol, env var, exit code, frontmatter field, schema key) appear as an input or expected substrate in any M_j task spec?

2. **Artifact reference:** Does any M_i task spec reference an artifact path that lives within M_j's authoring scope, or vice versa? Includes file_write_contract paths, behavioral_pseudocode citations, test fixture paths.

3. **Vocabulary dependency:** Does any M_i task spec rely on a string constant, enum value, exit code, predicate phrase, frontmatter key, YAML schema field, or named function/method authored by M_j (or vice versa)?

IF answer to ANY of the three is YES for any (M_i, M_j) pair:

- WRITE a cross-module-concern (CMC) entry to decisions.yaml under the current round's `cross_module_concerns_ruled` block with:
  * id: CMC-Sprint<N>-<sequence>
  * surfaces: textual description of the concern
  * ruling: master's resolution naming both modules + the seam
  * owned_by: master
- CLOSE the CMC before invoking pack-step OR escalate via AskUserQuestion if ruling requires user verdict.
- RE-DISPATCH affected sub-architect(s) with sharper boundary if the ruling materially shifts module scope.

IF answer to all three is NO for every pair:

- record the empty-CMC finding in synthesize summary ("M-3 checklist run; 0 pair-questions returned YES")

Verifiable check: synthesize step output must include either non-empty CMC entries OR an explicit empty-finding statement.

## DD-2 sub-architect-dispatch Skip-IFF rule (D-Sprint10-5)

#### DD-2 sub-architect-dispatch Skip-IFF rule (D-Sprint10-5)

The default discipline: sub-architect dispatch count >= `decomposition.modules.length`. Master MAY skip sub-architect dispatch ONLY IFF ALL THREE of the following hold:

1. **modules.length == 1** — decomposition produced exactly one module (sub-architect would be vacuously called against the entire architecture; no parallelization benefit).

2. **scope == 'condensed'** — `decomposition.scope` frontmatter field on the architecture artifact = `'condensed'` (master has explicitly marked this as a low-substance architecture round — e.g. an in-place amend round).

3. **user-prior-ratification cited** — the architecture artifact frontmatter or master synthesize note carries a verbatim user-quote (from `AskUserQuestion` or prior `06-decisions.md` entry) authorizing the condensed-skip path for this round. Citation MUST include user-quote text + source (decision ID or session timestamp).

IF any ONE of the three fails → DISPATCH is mandatory; the `transitions.yaml` `requires` predicate at the `decomposing → sprinting` (or `architecture → sprinting`) boundary will refuse exit if `sub_architect_dispatches < module count` and no rule-allowed-skip flag is set.

**Predicate enforcement.** The CLI op `evalDispatchPredicate` at `tools.cjs:1819` evaluates the `"with sufficient sub-architect dispatch"` phrase (extension via T-1020) — counts vs threshold; rule-allowed-skip with rule-quote citation bypasses the count gate.

**Drift detection.** drift-8 substantive check (M4 module, T-1025) scans architect artifact frontmatter post-hoc; surfaces skip-without-rule-allowed-quote as drift.

**Verifiable check.** Spawn architect skill with `decomposition.modules = 5 modules` + `0 sub-architect dispatches` + `scope = 'full'` → predicate refuses transition with `EXIT_ALIGNMENT_DRIFT` (19) + diagnostic naming `"DD-2 sub-architect-dispatch Skip-IFF rule violation"`.

**Manual spawn-check procedure** (until T-1020 ships the predicate extension):

1. Stage a mock architecture artifact at any temp path with frontmatter:

   ```yaml
   ---
   schema_version: 1
   decomposition:
     modules: [M-1, M-2, M-3, M-4, M-5]   # length == 5
     scope: full                            # NOT 'condensed'
   sub_architect_dispatches: 0              # zero dispatches
   ---
   ```

2. Invoke `node plugins/essense-flow/bin/essense-flow-tools.cjs state-set-phase --value sprinting --sprint <n> --project-root <root>` against a project state where this artifact is the active architecture.

3. Expected outcome (post T-1020): the op exits with code `19` (`EXIT_ALIGNMENT_DRIFT`) and the diagnostic message names `"DD-2 sub-architect-dispatch Skip-IFF rule violation"`. Until T-1020 ships, the predicate is registered-but-stubbed; the manual check observes the registration scaffold and confirms the predicate phrase `"with sufficient sub-architect dispatch"` is referenced from the transitions table.

4. Inverse check (skip-allowed path): same artifact with `modules: [M-1]` (length 1) + `scope: condensed` + `user_prior_ratification_quote: "<verbatim user quote>"` + `user_prior_ratification_source: D-Sprint10-2` → predicate permits exit.

## Hard checks closed by this substance (Skip-IFF)

- DD-2: Skip-IFF rule enumerates all 3 conditions verbatim — `modules.length == 1` AND `scope == 'condensed'` AND user-prior-ratification cited.
- D-Sprint10-2: user-prior-ratification citation requirement is encoded (verbatim user-quote + source decision ID / session timestamp).
- D-Sprint10-5: predicate enforcement at `evalDispatchPredicate` + `EXIT_ALIGNMENT_DRIFT=19` exit code named.
- CMC-Sprint10-1: rule text is shared verbatim between SKILL.md and this substance mirror — drift between the two is a closure-plan validation failure.
- T-1020 forward-coupling: predicate phrase `"with sufficient sub-architect dispatch"` is the integration anchor for the M2 CLI op extension.
- T-1025 forward-coupling: drift-8 substantive check (M4 module) scans architect artifact frontmatter post-hoc for skip-without-rule-allowed-quote.
