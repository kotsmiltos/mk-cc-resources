# Ledger — original vision + substance-mirror reconciliation

> **Quality bar (carried from source corpus — propagate to every descendant artifact):**
> 1. **Limits-awareness** — Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> 2. **Positive mindset** — every gap solvable. Find the way by working carefully.
> 3. **Quality ownership** — this work matters. Take ownership.
> 4. **Propagation requirement** — every descendant artifact must carry these same four instructions.
>
> Verification discipline applied here: every claim below verified by reading actual source (workspace `C:\Users\mkots\essense-flow-re-imagined\redesign\` + shipped plugin `C:\Users\mkots\mk-cc-resources\plugins\essense-flow\`), not summaries. Hashes computed, code traced caller→callee, file:line cited.

Mined: 2026-06-11. Sources: `00-START-HERE.md`, `01-the-real-constraint.md`, `02-history-of-failure-modes.md`, `03-gsd-comparison.md`, `04-open-questions.md`, `PLAN.md`, `STATE.md` (step table), `06-decisions.md` (2026-05-16 closing decisions), `SURPRISES.md`, `containment-map.md`, `cli-spec.md` §1, `skill-substance/*` both sides, plugin `bin/essense-flow-tools.cjs` + `tests/` + `agents/` + `references/transitions.yaml`.

---

## Vision

### The original problem statement

Essense-flow versions 0.6 → 0.11 (two months of iteration) all failed to close ONE failure mode: **the master orchestrator agent (Claude itself, invoked via a phase command) drifts off the canonical contract.** Observed in the field against 0.11.0, across two real projects: invented state schema fields (`phases_completed`, `s1_manifest_path`, `DC-03..DC-12`), invented phase values (`phase: building`), non-canonical paths (`.pipeline/sprints/sprint-1/` instead of `.pipeline/architecture/sprints/1/`), wrong extensions (`.md` where `.yaml`), top-level `SPRINT-REPORT.md` instead of per-task completion records, helpers called in wrong order or skipped, sub-agent dispatch skipped with substance done inline. (`00-START-HERE.md:21`, `02-history-of-failure-modes.md:105`.)

### The real constraint (user's reframe, verbatim — `01-the-real-constraint.md:17`)

> "for 2 months I was having this back and forth with you about trying to close gaps and improve the functionality but I was always ending up short because you are you and you do things your way (meaning you lose context, you try to finish, you defer or whatever other reason you don't take the full scoped approach to the end with certainty and fully thought out plans and steps that you follow). This is fine but we need to work around it if we are ever going to reach a quality of workflow we can idolize."

**Design constraint derived:** drift is the **default load, not an edge case**. A correct architecture makes drift either (1) **structurally impossible** (the only path to do X is narrow op Y; Y validates; no other path exists) or (2) **structurally recoverable** (named deterministic recovery mechanism returns the system to canonical state). "Anything that depends on Claude reading prose and following it is fragile. Period." (`01:25-30`.) The system must produce correct output **even when Claude is at its worst** (`01:66`): tools that reject improvisation, workflows that dictate ordering, subagents with narrow scope, state as typed API, failures that surface loudly. Explicitly NOT: more prose, sterner instructions, closing blocks, recency tricks (`01:70-84`).

### Six prose-only failures — the receipts (`02-history-of-failure-modes.md:109-118`)

| Version | Bet | Result |
|---|---|---|
| 0.6.x | Heavy gates + MANDATORY prose | Master bypassed via wrong format/path |
| 0.7.0 | Soften gates + auto-synthesize | Master kept bypassing; auto-synthesis made the wrong path *easier* |
| 0.8.0 | Blank slate, prose + light helpers | Same failure, less containment |
| 0.9.0 | Principle-citation enforcement | Master cited the principle then violated it next sentence |
| 0.10.0 | Master/sub-agent split (in prose) | Master skipped dispatch when context felt small |
| 0.11.0 | Closing "Before you finalize" block (recency trick) | All drift behaviors observed same session, two projects |

"The bet that lost six times: *prose can constrain master.* The bet never tried: *structure can constrain master.*" (`02:118-120`.)

### Reference model and preservation contract

gsd-build (github.com/gsd-build/get-shit-done) solved the same problem structurally: thin slash commands → `<step>`-ordered workflow files → CLI router (`gsd-tools.cjs`, 1087 LOC) with 16+ narrow named state ops → 33 registered subagents. "Master cannot add a `phases_completed` field because no op accepts that field" (`03-gsd-comparison.md:59`). Borrow list (`03:121-130`): workflow step-ordering, CLI router with narrow ops, `init <skill>` prebaked-JSON paths, registered subagents, templates.

**Preservation contract** (PLAN.md:122-134, closed decision 2026-05-05): non-negotiables that must survive — phase sequence (`elicit → research → architect → build → review → verify → triage → heal`); per-skill internals (architect's decide→delegate→synthesize→pack→finalize, build's wave dispatch, review's verbatim-quote re-validation); the 5 principles (Graceful-Degradation, Front-Loaded-Design, Fail-Soft, Diligent-Conduct, INST-13); value-adds (adversarial review with quote re-validation, closed-task-spec no-TBD gate, fewest-sprints discipline, fail-soft hooks, `confirmed_unacknowledged_criticals == 0` evidence-bound gate); slash-command surface unchanged. Container format (SKILL.md vs workflow.md) was the free variable — the SKILL.md abstraction was deliberately kept; gsd-style workflow.md replacement was NOT the chosen approach (`00:42`).

**End state ("done")** (PLAN.md:136-150): empirical drift-free full-pipeline run on a fresh test project; an audit script enumerating every drift symptom reports zero hits; ship only after the empirical gate.

Execution: 14-step plan S1→S11 (PLAN.md), one fresh session per step, each gated on a binary verifiable check, with pre-flight checklist, refusal protocol (7 named refusals of user-pressure shortcuts), and append-only SURPRISES.md ledger ("silent patching is exactly the failure mode this redesign exists to close", PLAN.md:95).

---

## Failure-mode catalog

Source: drift table `01-the-real-constraint.md:36-48` (10 symptoms) → `containment-map.md:25-34` (mechanism + owner) → shipped plugin features (verified against `bin/essense-flow-tools.cjs` help/source, `agents/` dir, `references/transitions.yaml`). All 10 mechanisms are **shipped and live** in plugin v0.17.1.

| # | Failure mode | Containment mechanism | Shipped plugin feature that answers it |
|---|---|---|---|
| 1 | Invents state schema fields (`phases_completed`, `s1_manifest_path`, `DC-03..DC-12`) | CLI op rejection — one named op per mutable field; **no generic state-write blob op exists** | `bin/essense-flow-tools.cjs` `state-set-*` typed-setter family (11 ops: sprint, wave, elicitation-round, research-round, decomposition-round, 6 ISO-8601 `*-completed/started` stamps). cli-spec.md §1.1; shared rejection table exits 2–5 with exact stderr messages |
| 2 | Sets `phase:` to invented values (`building`) | CLI op rejection — phase validated against legal list **at write time** | `state-set-phase --value <phase>` — "legality + prerequisite + per-task-record gate" (tools.cjs help); validates against `references/transitions.yaml` canonical phase list |
| 3 | Picks wrong on-disk paths | init-JSON canonical input — master parses literal strings, never infers | `essense-flow-tools init <skill>` for all 9 skills returns `canonical_paths` JSON (literal strings, no globs/templates) |
| 4 | Wrong file extension (`.md` vs `.yaml`) | init-JSON canonical input — extension is part of the literal path string | Same `init <skill>` op; extensions baked into `canonical_paths` values |
| 5 | Writes top-level summary, skips per-task records | per-task ops as gate — transition refuses unless record count == manifest task count | `record-task-completion` (sole writer; dual-record schema, 8 required keys, atomic tmp+rename, idempotency rejection, sprinting-phase-only) + `state-set-phase` per-task-record gate |
| 6 | Calls `writeState` directly to advance phase, skipping per-task ops | per-task ops as gate — sole-advancement-op constraint; direct-write helpers internal only | `state-set-phase` is the only CLI-surface phase advance; `lib/state.js` writeState not exposed as an op; heal-only `state-force-set-phase` requires `--reason`, logs to HEAL-LOG.md FIRST, preserves canonical-phase validation |
| 7 | Skips the decomposition/dispatch/pack/finalize loop, jumps to "I'm done" | CLI op rejection — monotonic cursor; op validates next-step is immediate successor of canonical `ordered_steps` | `step-advance --skill <name> --next-step <step>` writing `.pipeline/cursor.yaml` (monotonic-by-construction) + `next-step --skill --cursor` (DD-15, emits SKILL.md step-N substance, idempotent replay) + `cursor-init` |
| 8 | Skips sub-agent dispatch, does substance inline | registered subagent dispatch + dispatch-sufficiency predicate | 12 registered agents in `plugins/essense-flow/agents/` (sub-architect, sub-triager, sub-recognizer, validator, adversarial-lens, architect-alignment-lens, extractor, item-verifier, perspective-agent, pattern-debt-lens, rule-completeness-lens, task-agent) + `evalDispatchPredicate` (tools.cjs:2026) fail-closed observed-vs-threshold check (DD-21/AC-5), `EXIT_ALIGNMENT_DRIFT=19` on insufficiency; Skip-IFF bypass only with well-formed rule_quote + citation (T-1020/DD-2) |
| 9 | Loses track of position in long workflow runs | CLI op rejection — cursor is the only authoritative position record; resume reads cursor | Same `step-advance`/`cursor.yaml`; resumption reads cursor, advances current+1; `cursor-rewind` heal-only |
| 10 | Defers fields ("TBD", "agent decides X") in task specs | CLI op rejection — forbidden-marker scan at the moment of write, not at finalize | `task-spec-write --sprint --task-id --content-file` — rejects forbidden markers (TBD, agent decides, …), validates 10-key required schema before file lands |

Cross-cutting (beyond the 10-row table, also shipped): drift-audit scripts (`redesign/scripts/drift-audit.{sh,ps1}` + `audit-checks.yaml`, 10 checks — verification harness, redesign-side only, NOT shipped in plugin `scripts/` which holds only `self-test.js` + `validate-plugin.js`); quorum contracts per agent (all-required vs tolerant, crashed agent → synthetic record, never silent); evidence policy (findings without `verbatim_quote` + `file:line` rejected; quote-drift → auto `false_positive`).

---

## Unrealized vision

Gaps first, per verification discipline. Each verified against disk.

1. **The end-state empirical gate was never user-signed.** S10 (end-to-end drift-free run) reached "audit log complete; **user signoff outstanding**" and S10.5 (adversarial stress test) "joint signoff outstanding" — both flipped to `closed-for-reference (no follow-up planned)` by the 2026-05-16 parking decision (`06-decisions.md:1430-1467`, `STATE.md` rows S10/S10.5). The vision's "user signs off" clause (PLAN.md S10 check) never executed.
2. **S11 "Document & ship" per plan never ran.** Row closed-for-reference (`STATE.md`). The actual ship happened via the S10.7 closure-plan ship-gate at **v0.13.0** — the planned 1.0.0-after-conclusive-S10+S10.5 path was abandoned; plugin is now 0.17.1, never 1.0.0.
3. **Substance freeze ceremony never ran.** `redesign/skill-substance/FROZEN-SHA.yaml` is ship-state: `frozen_at_iso: null`, `shas: {}`; `FROZEN-AT.yaml`: `freeze_date: null`, `files: []`. The `audit-substance-frozen` engine (redesign/scripts/) skip-passes pre-freeze. The intended layer-i (git-log-not-after-freeze) + layer-ii (sha-match) enforcement is **dormant** — see Part 2.
4. **README's runtime-substance-read claim is not implemented.** `skill-substance/README.md:15` says the predicate handler "reads them to make routing decisions on every dispatch evaluation" — false per source: `evalDispatchPredicate` "does no I/O" (tools.cjs:~2000 comment, body 2026-2124); rule_quote is validated only as a non-empty string (tools.cjs:2089-2090), never matched against substance file content. See Part 2.
5. **Six substance files (build, context, elicit, heal, research, triage) never shipped** — by decision (README "bloat without runtime value"), but shipped agents and skills cite `redesign/skill-substance/...` paths that do not exist in an installed plugin (e.g. `agents/essense-flow-validator.md:42`, `agents/essense-flow-sub-triager.md:40,64-66`, `agents/essense-flow-sub-recognizer.md:37,62`, `agents/essense-flow-sub-architect.md:153`, `skills/triage/SKILL.md:146`). On any machine without the parallel workspace these citations dangle.
6. **META-PIPELINE-LOOP structural fix decided but never landed.** `SURPRISES.md:2556` (2026-05-18, Status: open): review cycle manufactures next-sprint work, backlog grows not drains (sprint 6: 22 findings → sprint 7: 23). User chose fix L1 (milestone-level exit gate) + L2 (test-seam-infra decision) + L4 (canon-tax task per round); paired `06-decisions.md` entry exists; **plugin source not modified** (refusal protocol held — no authorizing step opened). The "good enough to merge" terminator the vision needs for real projects is absent.
7. **~26 SURPRISES entries remain `Status: open`** (grep count: 18+8 variants), including the S10.8 post-ship reality entry ("plugin shipped on premise of structural soundness across the canonical happy path" — production behavior not surveyed, `SURPRISES.md:2287,2353`).
8. **S10.10 row still `in-progress`** in STATE.md (context-engineering adherence-enforcement sprint v0.13.3) even though v0.13.3 features (T-ENF-1..4 tests, principles.md consolidation) exist in the shipped plugin — the step table was never closed out.
9. **Drift-audit harness not shipped.** The vision's verification instrument (`drift-audit.sh/.ps1` + `audit-checks.yaml`) lives only in `redesign/scripts/`; an installed plugin cannot self-audit for the 10 drift symptoms.
10. **Deliberate non-adoption (decision, not gap):** gsd-style workflow.md replacing SKILL.md was rejected by the preservation contract; realized instead as `next-step`/`step-advance` cursor ops emitting SKILL.md step substance. State stayed YAML (not gsd's section-keyed Markdown) — containment moved to the narrow-op surface instead.

---

## Open questions

1. **The original elicit (04-open-questions.md) is fully closed — none of its three questions are live.** Q1 (which gsd mechanisms feel right), Q2 (what feels wrong), Q3 (essense-flow's reason to exist) were bypassed when the user clarified intent directly in conversation; closed by the `06-decisions.md` 2026-05-05 preservation-contract decision (`04:3` supersession banner: "Do not run this elicit as a live action"). Reason-to-exist as answered: preserve the user's flow + value-adds; contain drift beneath the skills via structure.
2. **Resumption protocol question:** the 2026-05-16 parking decision requires any future resumption to open "a fresh closed decision in `06-decisions.md` reopening the relevant STATE.md rows first" (`HANDOFF-NEXT-SESSION.md` header). Whether/when to reopen S10 signoff, S10.5 signoff, S11, and the freeze ceremony is unresolved.
3. **META-PIPELINE-LOOP L1+L2+L4 landing:** decided, scoped, blocked on an authorizing closed decision for plugin-source mutation (`SURPRISES.md:2556` resolution path). L3 (lens-diff-bounding) deliberately deferred — open whether inherited-debt re-surfacing needs its own fix.
4. **cli-spec coverage TBDs:** S4's evidence cell (`STATE.md` row S4) records "Section 2.2 names 4 TBDs" — finalize.js write paths without an equivalent op at spec time; whether all four were subsequently closed in cli-spec v2 was not re-verified row-by-row here.
5. **Substance-mirror integrity model:** with the freeze ceremony unrun and the README's runtime-read claim false, the open question is what the mirror's actual contract should be — frozen-pinned evidence artifact, runtime-read substrate, or doc-only governance anchor (see Part 2 verdict).
6. **Open SURPRISES backlog disposition:** ~26 open entries have no sweep/disposition plan after the park (the shipped `/heal` skill's stale-claim sweep exists, but the redesign workspace's own ledger is outside it).

---

## Substance mirror state

### Inventory — which files exist on each side

| File | Workspace `redesign/skill-substance/` | Shipped `plugins/essense-flow/skill-substance/` |
|---|---|---|
| architect.md | yes (250 lines) | yes (149 lines) |
| review.md | yes (194 lines) | yes (54 lines) |
| verify.md | yes (164 lines) | yes (41 lines) |
| build.md, context.md, elicit.md, heal.md, research.md, triage.md | yes (6 files, redesign-only) | no — by decision (README: "~600 lines the CLI never reads") |
| FROZEN-SHA.yaml / FROZEN-AT.yaml | yes (both, ship-state sentinels) | no |
| README.md | no | yes (subset rationale + pointer back to workspace) |

### Do shipped copies match the workspace? **No — fully divergent, by construction, not by drift.**

CRLF-normalized sha256 (computed 2026-06-11):

| File | Workspace sha256 | Shipped sha256 | Diff lines |
|---|---|---|---|
| architect.md | `125d1ee51dce18d2…b84692` | `f3a2a66bf0289618…70757c` | 291 of 250/149 |
| review.md | `b6595a46efc48aee…f81f7f` | `4686520e1176e682…baec56` | 194 (every workspace line) |
| verify.md | `3c06f0c0631df564…d35d8892…` | `fb6766cc360803d6…be5f45` | 165 |

They are **different documents sharing a name**: workspace files are the S1 capture (2026-05-05) of full SKILL.md substance (Purpose/Inputs/Ordered steps/Sub-agent dispatches/Outputs/Contracts/Principles/Value-adds, 8 sections); shipped files are compressed round-10+ "substance mirrors" carrying only machine-checkable dispatch governance (DD-20 align step, DD-2 Skip-IFF rules, condensed-vs-parallel dispatch criteria). Shipped architect.md:15-17 states its own precedence rule: "If the SKILL.md body and this mirror diverge, **SKILL.md wins**. This mirror is updated at the same write boundary as SKILL.md changes — drift is a closure-plan validation failure."

### What FROZEN-SHA pins, and whether pins are currently valid

Mechanism (workspace `FROZEN-SHA.yaml` + `FROZEN-AT.yaml` headers): at a one-time **freeze ceremony**, `FROZEN-AT.freeze_date` gets the ISO instant and `files:` lists every substance path under enforcement; `FROZEN-SHA.shas` records per-file sha256 (CRLF→LF normalized). The `audit-substance-frozen` engine (`redesign/scripts/audit-substance-frozen.{cjs,ps1,sh}`) then enforces layer-i (no git commits to a frozen file after freeze_date) + layer-ii (current hash == pinned hash; mismatch = FAIL).

**Current pin validity: there are no pins.** `schema_version: 1, frozen_at_iso: null, shas: {}` and `freeze_date: null, files: []` — ship-state, ceremony never run. The engine skip-passes and exits 0 pre-freeze. So the README's claim that the three shipped files are "FROZEN-SHA-pinned" (`skill-substance/README.md:25,31,33,36`) describes the *intended* mechanism, not an active one — nothing currently audits workspace↔plugin mirror drift, and (per the hash table above) the two sides have in fact fully diverged with no FAIL anywhere to say so.

### What depends on the mirror at runtime — concrete evidence

**The CLI does NOT read skill-substance files at runtime.** Verified by tracing, not by grep alone:

- `bin/essense-flow-tools.cjs:2026` `function evalDispatchPredicate(predicateText, cursorState, ruleAllowedSkip)` — header comment (~line 2000): "Caller … is responsible for loading cursorState; **this function does no I/O**."
- The Skip-IFF bypass validates `ruleAllowedSkip.rule_quote` only as `typeof === 'string' && length > 0` (`tools.cjs:2089-2090`) — the quote text is **never compared against the substance file content**. The quote arrives from `cursor.yaml` / artifact frontmatter supplied by the caller (`tools.cjs:2155-2157` comment: "Upstream surfaces (state-set-phase, write-round-close) load the rule_allowed_skip block from cursor.yaml or artifact frontmatter").
- All 9 `skill-substance` references inside `bin/essense-flow-tools.cjs` (lines 57, 755, 841, 843, 923, 925, 993, 1060, 2008) are **comments**. Zero non-comment references in `bin/`, `lib/`, `hooks/`, `scripts/` (grep over `*.cjs`/`*.js`, node_modules excluded).
- Therefore `skill-substance/README.md:15` — "These three substance files are runtime-needed: the predicate handler at `bin/essense-flow-tools.cjs` reads them to make routing decisions on every dispatch evaluation" — is **contradicted by the code**. The predicate is a pure phrase-matcher over `references/transitions.yaml` `rule_phrase` strings + cursor frontmatter numbers.

What DOES depend on the mirror:

- **Test-time (load-bearing):** `tests/skill-substance-readme.test.js:30-69` (T-ENF-4, v0.13.3) — fails the suite if `skill-substance/` contains ≥1 `*.md` substance file without `README.md`, and requires the README to reference the anchor string `essense-flow-re-imagined/redesign/skill-substance` (`:64-69`). Deleting the mirror's README (or adding substance files without it) breaks `npm test`.
- **Data citations (semi-runtime):** `references/transitions.yaml:363-384` — the three `skip_iff_substance` blocks cite "per skill-substance/{architect,review,verify}.md DD-2 … Skip-IFF rule" verbatim; test fixtures carry the same strings (`test/.test-fixtures/skip-allowed-iff/*/cursor.yaml:25,28`, `test/eval-dispatch-predicate.test.cjs:490,510`). These are quoted strings flowing through the predicate, not file reads.
- **Documentation contracts (governance):** `skills/verify/SKILL.md:151` — "Authoritative substance source: `plugins/essense-flow/skill-substance/verify.md` … if these two diverge, the substance mirror … and this SKILL.md are both wrong — re-align both"; `skills/review/SKILL.md:161,171,181` same pattern; `agents/essense-flow-validator.md:42,75`, `essense-flow-sub-triager.md:40,64-66`, `essense-flow-sub-recognizer.md:37,62`, `essense-flow-sub-architect.md:153`, `essense-flow-item-verifier.md:55,63` all quote substance rules as agent-instruction anchors (and several cite the **workspace** `redesign/skill-substance/...` path that does not ship).

### Verdict

**Drifted-by-design and NOT runtime-load-bearing for the CLI.** The two sides share filenames but are different documents (S1 capture vs round-10+ governance mirror); the FROZEN-SHA pin mechanism exists but was never armed (ship-state sentinels, empty shas), so no automated check would catch the divergence; the only hard dependency is the T-ENF-4 README-presence test plus prose citations in agents/SKILL.md/transitions.yaml. The README's runtime-read claim should be corrected (or the read implemented) in any rebuild; any rebuild touching dispatch governance should treat shipped `skills/*/SKILL.md` as authoritative (per shipped architect.md:17) and the workspace 9-file set as design-time source-of-truth for SKILL.md authoring (per README.md:40).
