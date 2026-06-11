# Ledger — Round/Sprint Decision Mining (D-Rd9..D-Rd12, D-Sprint10, T-9xx/T-10xx)

> **Quality bar (carried from caller):** verify by reading actual source lines, not by existence;
> preserve specifics; every gap solvable by careful work; descendant artifacts carry these same standards.

**Canonical source** (`DEC` below): `C:\Users\mkots\essense-flow-re-imagined\tmp-spike-CLOSURE\.pipeline\architecture\decisions.yaml`
(5599 lines; the dogfood pipeline's decision corpus — the redesign/ docs cite these IDs but do not define them).
All line numbers verbatim-verified by reading the cited lines on 2026-06-11.
Secondary corroboration where noted: `redesign/cli-spec.md`, `redesign/cli-spec/ops/*.md`, `redesign/06-decisions.md`, `redesign/SURPRISES.md`.

**Rebuild context for keep/fold/drop:** schema single-source; state.yaml as derived artifact cache;
research-first unknowns ledger; public audience (no codenames, no machine-specific paths).

---

## D-Sprint10-2 — Module decomposition: 4 sub-architecture modules across 7 waves
- **content:** Sprint 10's 31 tasks decompose into 4 sub-architect modules (M3-firewall 16 tasks, spec-v2 6, M4-audit 5, M5-shipgate 4), dispatched in parallel at delegate-step. Rejected per-wave sub-architects (7 dispatches) as fragmentation without finer-grain benefit.
- **why:** Architect skill rule "internal-to-a-module decisions belong to the sub-architect"; master owns module boundary only. Natural cut along firewall/spec/audit/shipgate lineage.
- **source:** DEC:2900 (id), substance 2909-2925, rationale 2902-2908.
- **proposed inline principle:** The orchestrating architect decides module boundaries only; everything internal to a module is designed by the module's own sub-architect. Choose the fewest modules that match natural functional cuts — more dispatches without finer-grained ownership is fragmentation, not decomposition.
- **keep/fold/drop:** FOLD — sprint-specific packing is historical; the boundary-ownership sentence is live and belongs in the architect skill body.

## D-Sprint10-4 — Round budget = 2 per sprint (M-5 mechanism)
- **content:** Architect rounds capped at 2 per sprint. Round 3+ requires an `escalation_signoff` field on the state architecture block; the CLI predicate (`state-force-set-phase` round-counter check) refuses round-3+ entry without it, exit 19.
- **why:** Sprint 9 looped to round 12. Empirically rounds 3-4 already showed diminishing returns; budget=2 forces tighter sub-architect briefs and earlier human escalation.
- **source:** DEC:2969 (id), substance 2976-2983, rationale 2971-2975.
- **proposed inline principle:** Design-iteration rounds are budgeted at two per sprint. A third round is not forbidden but requires an explicit human escalation signoff recorded in state — the budget exists to make non-convergence visible instead of letting fix-loops run silently.
- **keep/fold/drop:** KEEP — core anti-loop mechanism, directly survives rebuild.

## D-Sprint10-5 — META-GAP mechanism ship set: M-2 + M-3 + M-5 + M-6
- **content:** Of 6 candidate loop-closure mechanisms, ship 4: M-2 task-spec substrate-citation scan (T-1002), M-3 synthesize-step cross-module-concern checklist (T-1003), M-5 round budget (T-1004), M-6 verification-discipline propagation to forward design (T-1001); plus alignment-lens criterion 7 (T-1005) and pre-pack test baseline (T-1006). M-1 (fixture coverage) and M-4 (cursor namespacing) deferred to v1.1.
- **why:** META-GAP-ROUND-LOOP.md analysis: this is the minimum-coupling set closing the loop's structural drivers (RC-β/γ/δ/ε); M-5 makes any insufficiency visible.
- **source:** DEC:2995 (id), substance 3002-3013, rationale 2997-3001.
- **proposed inline principle:** When closing a recurring failure loop, ship the minimum set of mechanisms that covers each named structural driver, plus one budget/cap mechanism that forces visible escalation if the set proves insufficient. Defer mechanisms that need their own evidence harness.
- **keep/fold/drop:** FOLD — the ship-set choice is historical; each shipped mechanism's rule lives on under its own decision (D-Sprint10-4, D-Sprint10-14/M-2 successor, criterion-7, baseline gate). Keep the meta-principle one place.

## D-Sprint10-14 — FORBIDDEN_MARKERS scanner context-awareness (grep-target citation opt-in)
- **content:** The task-spec-write scanner that rejects placeholder markers (TBD/TODO/...) blocked specs whose *substance legitimately cites* those tokens as grep targets. Closure as landed: `scanForbiddenMarkers` gains opt-in admission — spec declares `forbidden_markers_in_substance: true` + `forbidden_markers_audit: [{line, marker_index}]` (0-based integer index so the audit field can't itself trip the scanner); every hit must be enumerated; unaudited hits still reject. YAML parse reordered before marker scan. 5 blocked specs (T-1009/1010/1011/1013/1015) amended and landed; route via T-1002 scope expansion superseded by direct master mutation (user re-verdict, session 3).
- **why:** Substrate-level closed loop: the writer enforcing the discipline rejected the specs that *author* the discipline. Pre-flagged 2026-05-11 (SURPRISES.md L1706); resurfaced as a Sprint-10 pack blocker.
- **source:** DEC:3433 (id), substance 3488-3511, rationale 3435-3453, route change 3454-3487. Corroborated SURPRISES.md:1926-2008.
- **proposed inline principle:** A lint/scanner rule must distinguish a forbidden token *used as drift* from a forbidden token *cited as the enforcement target* (e.g., inside a grep pattern). Allow an explicit, per-occurrence audited opt-in; never a blanket exemption — every admitted hit must be enumerated so author mistakes still surface.
- **keep/fold/drop:** KEEP — generic scanner-design rule, reusable for any self-hosting enforcement system.

## D-Rd9-2 — Set-based outstanding-work register stays sole (no push/pop)
- **content:** The outstanding-work register remains a flat set with exactly four ops (register-add / register-close / register-defer / register-list). No push/pop/claim/unclaim queue semantics authored.
- **why:** The stale-claim sweep (DD-19) already covers the "LLM forgets queued items" failure mode; push/pop would add 4+ ops and state-machine complexity for marginal gain, and would invalidate already-authored specs.
- **source:** DEC:5226 (id), rationale 5227-5232, alternatives 5217-5223. Corroborated redesign/cli-spec.md:691 ("set-based register stays sole; no push/pop ops authored").
- **proposed inline principle:** Track outstanding work as a flat set of entries with add/close/defer/list operations only. Forgotten in-progress items are caught by a periodic staleness sweep, not by queue ordering — queue semantics add state-machine complexity without covering any failure mode the sweep doesn't.
- **keep/fold/drop:** KEEP — directly shapes the rebuild's unknowns/outstanding-work ledger design.

## D-Rd9-4 — Bootstrap exemption: round-9 architect MAY skip alignment-lens dispatch
- **content:** Round-9 master exempted from dispatching the alignment-lens reviewer because round-9 itself authors that agent (circular dependency). Exemption audit-trailed on the sprint manifest (`alignment_lens_dispatches_per_round: 0` + `bootstrap_exemption: true` + rationale field). Round-10+ no exemption.
- **why:** Master cannot dispatch an agent type that does not exist yet; self-review rejected because it re-introduces the master-judgment-condense pattern the lens exists to close.
- **source:** DEC:5262 (id), rationale 5263-5268, alternatives 5255-5259.
- **proposed inline principle:** citation-only, delete — historical bootstrap event. The one live sentence (any exemption from a mandatory check must be recorded in the artifact with an expiry and a rationale, and self-review is never the fallback) folds into the review-gate rule.
- **keep/fold/drop:** FOLD the audit-trailed-exemption-with-expiry sentence; DROP the rest.

## D-Rd9-5 — Alignment retry count: 2 max per sub-arch; 3rd failure surfaces to user
- **content:** A misaligned sub-architect return is sent back at most twice (3 dispatches total per sub-arch). The third failure escalates to the user via interactive question rather than retrying.
- **why:** Bounded retry cost; single retry too tight for legitimate iteration, unlimited retries unbounded on persistent misalignment.
- **source:** DEC:5277 (id), rationale 5278-5282, alternatives 5272-5274.
- **proposed inline principle:** When a delegated work product fails review, return it to the producer at most twice; on the third failure stop and ask the human. Bounded retries keep the correction discipline without an unbounded loop.
- **keep/fold/drop:** KEEP — generic dispatch-retry rule for any reviewer/producer pair.

## D-Rd9-6 — Stale-claim threshold: 24h default + per-skill frontmatter override
- **content:** A register entry claimed `in_progress` is stale after 24h by default (`DEFAULT_STALE_THRESHOLD_HOURS = 24`, named constant in the staleness lib); per-skill override via SKILL.md frontmatter `stale_claim_threshold_hours`.
- **why:** 24h long enough for legitimate multi-session work, short enough to surface dead claims at heal cadence; 12h too aggressive, 1 week defeats the purpose.
- **source:** DEC:5292 (id), rationale 5293-5297, alternatives 5288-5289. Corroborated scripts/drift-audit.py:50 + scripts/audit-checks.yaml:302-309.
- **proposed inline principle:** Claims on outstanding work expire: an item held in-progress longer than a default 24 hours is surfaced as stale by the heal/audit pass, with the threshold overridable per workflow. The default is a named constant in one shared library, never an inline literal.
- **keep/fold/drop:** KEEP — pairs with D-Rd9-2 for the unknowns/work ledger.

## D-Rd9-7 — Cursor advance: explicit step-advance only; idempotent replay
- **content:** Emitting a step's substance never advances the cursor (`step_index` unchanged on emit; only `step_emitted_at` refreshes). Advancement happens only via an explicit step-advance op. Re-calling next-step returns byte-identical output.
- **why:** Auto-advance would let the CLI decide a step is complete merely because it was emitted; idempotent replay survives context loss without error.
- **source:** DEC:5310 (id), rationale 5311-5315, alternatives 5302-5307. Corroborated redesign/cli-spec/ops/next-step.md:69,90,182,196.
- **proposed inline principle:** Reading the next instruction must never count as completing it: emission is idempotent and side-effect-free on position, and only an explicit "this step is done" signal advances. The judge of step completion is the orchestrator, never the plumbing.
- **keep/fold/drop:** KEEP — survives any cursor/state redesign; it's a semantics rule, not a schema rule.

## D-Rd9-10 — Threshold-reader helper: shared lib (Option iii)
- **content:** Both consumers of staleness semantics (Python drift audit + JS heal sweep) import from one new shared lib (`lib/staleness.js` exporting `readSkillThreshold(skill)` + the 24h constant) authored by the module that owns lib infra; rejected coupling either consumer to the other's path.
- **why:** Cleanest dependency graph; a shared lib prevents the two consumers drifting on identical threshold semantics.
- **source:** DEC:5360 (id), rationale 5361-5366, alternatives 5356-5357.
- **proposed inline principle:** When two subsystems consume the same semantic (a threshold, a format, a predicate), the semantic lives in one shared module owned by the infrastructure owner, and both import it — never two local copies, never one subsystem importing from inside another's territory.
- **keep/fold/drop:** FOLD — instance of the single-source-of-truth helper rule (with D-Rd10-7/8/9); keep one principle covering all.

## D-Rd10-1 — Deterministic-loop guarantee for arch-alignment-check
- **content:** All 6 alignment criteria MUST evaluate on every check invocation — no field-presence dispatch. A silent `continue` on a missing input field (F20) is a critical bug: missing input becomes a pushed finding ({criterion, severity: critical, module: '<missing>', rationale}) instead of a skip. Invariant locked by per-criterion isolated PASS fixtures (D-Rd10-17).
- **why:** Implementation shipped field-presence dispatch; user adjudicated design intent as deterministic loop. Silent skip masks exactly the drift the checker exists to catch.
- **source:** DEC:1587 (id), substance 1595-1603, rationale 1589-1594.
- **proposed inline principle:** A compliance checker evaluates its full criteria list on every run. When an input a criterion needs is missing, that is itself a finding — pushed loudly with the criterion named — never a silent skip. Verify the invariant with one isolated-pass fixture per criterion so a silent skip in any handler fails a test.
- **keep/fold/drop:** KEEP — one of the strongest generic rules in the corpus; applies to every judge/lens/validator in the rebuild.

## D-Rd10-3 — Round-10 bootstrap exemption (extended)
- **content:** The round-9 exemption (D-Rd9-4) extended one more round because Sprint 9 was never built between rounds (the lens agent still didn't exist). Audit-trailed on the manifest; from round-11+ absolutely no further exemption — architect must halt and surface infeasibility instead.
- **why:** Halting round-10 would have left 8 critical review-surfaced bugs open longer; risk surfaced to user (R-Arch-Rd10-3, MEDIUM) and ratified.
- **source:** DEC:1623 (id), substance 1634-1644, rationale 1625-1633. Violation incident: SURPRISES.md:1568 (round-11 halted when the lens was authored-but-not-landed).
- **proposed inline principle:** citation-only, delete — historical. Its live content (exemptions ratchet: each extension must name the hard expiry, and the next violation halts rather than extends) folds into the same exemption rule as D-Rd9-4.
- **keep/fold/drop:** DROP (fold the ratchet sentence into the exemption rule).

## D-Rd10-4 — next-step OUT_OF_ORDER exit code canonical = 9 (doc wins)
- **content:** Spec doc said exit 9 for OUT_OF_ORDER; implementation exited 7 "per pseudocode". Doc declared canonical contract surface; impl amended 7 → 9.
- **why:** Doc-vs-impl drift on a binary-comparable surface; precedent (strict ship gate) uses the doc as exit-code source of truth; the cited pseudocode was a stale draft.
- **source:** DEC:1649 (id), substance 1655-1658, rationale 1651-1654. Corroborated redesign/cli-spec/ops/next-step.md:88 ("cli-spec doc is the canonical surface per D-Rd10-4").
- **proposed inline principle:** The published spec is the canonical contract for externally observable surfaces (exit codes, envelopes, schemas); when implementation and spec disagree, the implementation moves. Inline comments citing drafts are not authority.
- **keep/fold/drop:** KEEP — fold D-Rd11-2/D-Rd12-4/D-Rd12-6 into this same doc-authority principle; with schema single-source it becomes load-bearing.

## D-Rd10-7 — parseSkillSteps canonical home = lib/cursor-schema.cjs
- **content:** Two divergent `parseSkillSteps` implementations existed (tools.cjs + lib). Lib version canonical; tools.cjs copy deleted; call sites import.
- **why:** Lib testable in isolation; aligns with single-surface discipline.
- **source:** DEC:1693 (id), substance 1699-1702, rationale 1695-1698.
- **proposed inline principle:** (covered by the shared single-source-of-truth helper rule — one function, one home, call sites import.)
- **keep/fold/drop:** FOLD into the single-canonical-helper rule (with D-Rd9-10, D-Rd10-8, D-Rd10-9). Note for Phase 5 (tools.cjs dedup): this exact dedup was decided and then *inverted by a task spec contract* (see D-Rd11-10) — the rebuild must make the contract derive from the decision, not hand-copied.

## D-Rd10-8 — Explicit-args canonical = lib requireExplicitArgs
- **content:** Inline duplicate `requireExplicitArgsInline` in tools.cjs deprecated; canonical `requireExplicitArgs` lives in lib/explicit-args.cjs; call sites import; stale "until T-904 lands" rationale removed.
- **why:** Single explicit-args surface mandated; inline copy violates by duplication.
- **source:** DEC:1707 (id), substance 1712-1715, rationale 1709-1711.
- **proposed inline principle:** (same single-canonical-helper rule.)
- **keep/fold/drop:** FOLD.

## D-Rd10-9 — cursor.yaml canonical writer = writeNewCursorAtomic
- **content:** Three coexisting cursor.yaml writers (non-atomic writeCursor, atomic writeNewCursorAtomic, generic atomicWriteFile) consolidated to one: writeNewCursorAtomic (tmp+rename). Non-atomic writer deprecated; generic call sites re-routed.
- **why:** tmp+rename is the durability invariant the artifact needs; one canonical writer makes call-site audits possible.
- **source:** DEC:1720 (id), substance 1725-1728, rationale 1722-1724.
- **proposed inline principle:** Every mutable pipeline artifact has exactly one writer function, and that writer is atomic (write-temp-then-rename). Multiple writer paths to the same file is a defect even if each is individually correct.
- **keep/fold/drop:** KEEP the one-atomic-writer-per-artifact sentence (it generalizes D-Rd10-16 and underpins state-as-derived-cache); fold the rest.

## D-Rd10-10 — SKILL.md heading parity: amend files, parser stays canonical
- **content:** The step parser regex (`^## \d+\.` / `^### \d+\.`) stays canonical; the 5 non-conforming SKILL.md files amend their headings to `## N. <step>` shape rather than the parser learning free-form headings.
- **why:** The heading shape IS the parser contract; loosening the parser weakens structural containment; renaming headings is cheap.
- **source:** DEC:1733 (id), substance 1740-1744, rationale 1735-1739.
- **proposed inline principle:** When prose documents are machine-parsed, the parse shape is a contract: fix the documents to the shape, don't grow the parser to chase free-form prose. A strict parser keeps drift visible.
- **keep/fold/drop:** KEEP — directly relevant if rebuild keeps numbered-step skills.

## D-Rd10-11 — heal apply-disposition op shape = per-item op
- **content:** `heal --apply-disposition --item-id <id> --action <release|keep|escalate>` is per-item, not batch.
- **why:** One disposition = one audit log line; master can decide heterogeneously per item; a batch op forces uniform disposition or interactive UI that re-condenses master judgment.
- **source:** DEC:1749 (id), substance 1755-1758, rationale 1751-1754.
- **proposed inline principle:** Adjudication operations act on one item at a time: per-item granularity keeps the audit trail one-decision-one-line and allows heterogeneous verdicts. Batch convenience is not worth condensed judgment.
- **keep/fold/drop:** KEEP — applies to the rebuild's ledger disposition flow.

## D-Rd10-12 — isStale invariant: absolute-value comparison
- **content:** `isStale(claimedAt, threshold) := Math.abs(now - claimedAt) > threshold` — catches future-dated claims (clock skew or fabricated timestamps); new distinct FAIL kind `stale-claim-future-dated` preserves the diagnostic distinction from ordinary `stale-claim-detected`.
- **why:** F31/F32 surfaced the blind spot — a future-dated claim never aged past the threshold under one-sided comparison.
- **source:** DEC:1764 (id), substance 1769-1774, rationale 1766-1768.
- **proposed inline principle:** Staleness checks compare absolute time distance, not one-sided age, so future-dated timestamps (clock skew, fabrication) are caught too — and they get their own diagnostic kind rather than masquerading as ordinary staleness.
- **keep/fold/drop:** KEEP — small, sharp, easy to lose in a rewrite.

## D-Rd10-13 — tmp filename uniqueness suffix
- **content:** Temp-file convention `<filepath>.tmp-<PID>-<ts_ms>-<rand4>`; exported as `lib/atomic-write.cjs::tmpName(filepath)`; all tmp-writer sites adopt.
- **why:** PID alone collides multi-worker; timestamp alone collides fast-fire; random alone has birthday-paradox risk; all three combined is negligible at any plausible workload.
- **source:** DEC:1779 (id), substance 1785-1788, rationale 1781-1784.
- **proposed inline principle:** (one sentence inside the atomic-writer rule: temp names combine PID + millisecond timestamp + random suffix, generated by one shared helper.)
- **keep/fold/drop:** FOLD into the atomic-writer principle (D-Rd10-9).

## D-Rd10-14 — Test-hook guard pattern
- **content:** Every `ESF_TEST_*` env-var hook is gated behind one predicate `lib/test-mode-guard.cjs::isTestMode()` (`NODE_ENV==='test' || ESF_TEST_MODE==='1'`); crash hooks blocked in production.
- **why:** Layered defense: build-time stripping catches the static case; the runtime predicate catches an env var leaking into production.
- **source:** DEC:1793 (id), substance 1799-1803, rationale 1795-1798.
- **proposed inline principle:** Test-only behavior switches share a single is-test-mode predicate from one module; no individual feature reads test env vars directly. A test hook reachable in production is a shipping defect.
- **keep/fold/drop:** KEEP — public-audience ship gate cares about exactly this.

## D-Rd10-15 — Portability parametrization (no hardcoded project dir)
- **content:** Hardcoded default project dir (a workspace codename) replaced with required `--project-dir` CLI arg + `ESF_PROJECT_DIR` env fallback via a `resolveProjectDir` helper; also fixed a module-scope `/g` regex lastIndex reuse hazard by constructing per-use.
- **why:** Hardcoded workspace name broke marketplace-install portability and leaked internal project substance into the plugin.
- **source:** DEC:1807 (id), substance 1813-1818, rationale 1809-1812.
- **proposed inline principle:** Tooling never hardcodes a workspace, machine, or project name: locations arrive as explicit arguments with an env-var fallback, and absence is a loud rejection. Internal project codenames must not appear in shipped source.
- **keep/fold/drop:** KEEP — this IS the public-audience rule; the regex sub-item folds into general code-quality.

## D-Rd10-16 — alignment counter canonical writer
- **content:** The `alignment_lens_dispatches_per_round` counter existed in 4 artifacts (manifest, state.yaml, decisions.yaml, ARCH.md). One canonical writer designated (`writeArchitectRoundClose`, runs at round close); the checker op only READS, never writes; propagation contract documented.
- **why:** Without a designated writer, 4-artifact duplication drifts inevitably.
- **source:** DEC:1823 (id), substance 1829-1832, rationale 1825-1828.
- **proposed inline principle:** A value must not be independently written into multiple artifacts. If it appears in several places, one writer produces all copies in one operation and every other component is read-only. (Rebuild goes further: store it once, derive the rest.)
- **keep/fold/drop:** FOLD into schema single-source / state-as-derived-cache — this decision is the documented *symptom* motivating the rebuild's derive-don't-copy stance; pair with D-Rd11-6.

## D-Rd11-2 — Per-op spec authoritative (heal-apply-disposition impl follows spec)
- **content:** Implementation amended to match the per-op spec verbatim: keep-disposition refreshes `claimed_at`; stdout is single-line JSON with the spec's 8 keys, replacing 4-line plain YAML.
- **why:** "Two canonical surfaces shipping contradictory writer-side semantics is the closure-plan-strict failure mode this round closes."
- **source:** DEC:1926 (id), substance 1932-1942, rationale 1928-1931. Corroborated redesign/cli-spec/ops/heal-apply-disposition.md:282.
- **proposed inline principle:** (covered by the doc-authority principle, D-Rd10-4.)
- **keep/fold/drop:** FOLD into D-Rd10-4's doc-authority rule.

## D-Rd11-4 — Locking mechanism: O_APPEND for audit log, wx-sentinel-file for register
- **content:** Single lib (`lib/with-lock.cjs`) exports two mechanisms matched to writer semantics: (i) append-only audit log uses `fs.openSync(path,'a')` single-syscall writes (atomic up to PIPE_BUF, lines kept <4KB by construction, no lock needed); (ii) read-modify-write register uses a `path+'.lock'` sentinel opened `'wx'` (EEXIST = held), exponential backoff 50ms×2^n max 5 attempts (~1.5s), stale lock (mtime >60s) force-unlinked with stderr WARN. npm lock dependency rejected to keep the plugin dependency-free.
- **why:** Dep-free, cross-platform; O_APPEND is the canonical idiom for atomic audit appends; failure mode of sentinel locking handled explicitly rather than hidden in a dependency.
- **source:** DEC:1980 (id), substance 1991-2008, rationale 1982-1989.
- **proposed inline principle:** Match the lock to the write shape: append-only logs need no lock if each line is a single small append; read-modify-write files take a create-exclusive sentinel lock with bounded retries and an explicit, logged stale-lock recovery. Both mechanisms live in one shared module.
- **keep/fold/drop:** KEEP — concrete concurrency design that took three rounds to harden (see D-Rd12-3); don't re-derive from scratch.

## D-Rd11-6 — DD-20(d) wiring: predicate handler + 3-source reader + helper invocation
- **content:** Three coupled fixes: (i) a dispatch-sufficiency predicate handler reading counters from manifest/QA-REPORT/VERIFICATION-REPORT frontmatter; (ii) the alignment checker reads the dispatch counter from 3 sources (manifest + state.yaml + decisions.yaml) and FAILs with `alignment-counter-drift` if they disagree; (iii) the round-close writer helper actually invoked from the skill (it existed with zero call sites).
- **why:** A decision "closed" at design time was unshipped end-to-end — helper isolated, reader absent, predicate soft-passing.
- **source:** DEC:2046 (id), substance 2052-2074, rationale 2048-2051. Corroborated cli-spec.md:1215 (triad parity invariant).
- **proposed inline principle:** Two live lessons, separable: (1) a decision is not closed until every link of its chain has a production call site — an exported helper with zero callers is unshipped; (2) storing one counter in three artifacts and policing parity with a drift-checker is the expensive form of consistency — store once and derive instead.
- **keep/fold/drop:** FOLD — lesson (1) into verification discipline ("wired = invoked, not exported"); lesson (2) is the negative exhibit for schema single-source / state-as-derived-cache. The triad mechanism itself should NOT be rebuilt.

## D-Rd11-7 — Math.abs JS task reinstatement (JS source-of-truth restored)
- **content:** The JS staleness lib never got the absolute-value fix even though the Python mirror did — Python led JS, inverting the declared JS-source-of-truth pact; a phantom dependency ID had been dropped. New task brings `lib/staleness.cjs` to parity; manifest dependency replaced with a concrete task ID; mislabeled manifest comments realigned.
- **why:** Cross-language mirror discipline inverted at build time goes unnoticed without an explicit source-of-truth contract.
- **source:** DEC:2087 (id), substance 2092-2103, rationale 2089-2091.
- **proposed inline principle:** When the same logic exists in two languages, one implementation is declared source of truth and the mirror follows it — never the reverse — and the mirroring task is a concrete tracked dependency, not a phantom note.
- **keep/fold/drop:** FOLD into the single-source family; relevant only if the rebuild keeps a Python audit mirror.

## D-Rd11-8 — writeStateAndFingerprint hardening at all 3 sites
- **content:** The state writer's two inline tmp-name synth sites adopt the shared `tmpName()` helper, and its inline test-gate predicate routes through `isTestMode()` — completing adoption the round-10 tasks only partially applied.
- **why:** Round-10 closed the decisions but the task scope wrapped only some sites; the remainder is the same hazard class.
- **source:** DEC:2112 (id), substance 2119-2133, rationale 2114-2118.
- **proposed inline principle:** citation-only, delete — it is the *adoption sweep* for D-Rd10-13/14. Live residue: when a canonical helper is introduced, the closing task enumerates and converts ALL call sites in one sweep; partial adoption recreates the split-brain.
- **keep/fold/drop:** FOLD the all-sites-sweep sentence into the helper-consolidation rule; drop the specifics.

## D-Rd11-10 — T-923 self-contradiction: corrected re-do task
- **content:** The round-10 task spec for the parseSkillSteps consolidation *inverted* its own contract (allowed-list excluded the lib path; forbidden-list included it); the build agent honored the inverted contract and shipped duplication. Fix: amend the spec's contract for forensic continuity, preserve the original record, and run the consolidation again under a NEW task spec (T-955) — delete the tools.cjs-local copy, import from lib (~80 LOC reduction).
- **why:** The record of what was actually built against must be preserved; corrections come as new work, not history rewrites.
- **source:** DEC:2157 (id), substance 2166-2178, rationale 2159-2165.
- **proposed inline principle:** When a task's write-contract contradicts the ruling it implements, the agent will faithfully build the contradiction — so contracts must be derived from the decision text, not hand-copied. Corrections ship as new tasks; the original record is annotated, never rewritten.
- **keep/fold/drop:** KEEP the derive-contracts-from-decisions sentence (feeds Phase 1 schema single-source); fold the audit-trail sentence into the preservation rule (D-Rd12-4).

## D-Rd11-11 — lib/state.js readState shape validator
- **content:** readState gains post-parse shape validation of the canonical state.yaml schema: required keys (schema_version=1, phase ∈ transitions, last_updated ISO8601) typed-checked; unknown top-level keys WARN-logged but never fail (forward compat); missing/mismatched required keys error with field name + observed + expected.
- **why:** A prior sprint shipped mis-indented sub-keys that the YAML lib silently accepted; explicit shape validation closes the gap as layered defense.
- **source:** DEC:2183 (id), substance 2190-2208, rationale 2185-2189.
- **proposed inline principle:** Parse success is not validity: every read of a state artifact shape-validates against the canonical schema — strict on required fields with a diagnostic naming field/observed/expected, warn-only on unknown keys for forward compatibility.
- **keep/fold/drop:** KEEP — and in the rebuild, generate the validator from the single-source schema instead of hand-maintaining key lists (see D-Rd12-2 for why).

## D-Rd12-1 — readState contract: revert throw to degraded='corrupt' marker
- **content:** Shape-validation failure no longer throws from readState; it returns `{state: <best-effort-parsed>, degraded: 'corrupt', shape_error: <detail>}`. Throws retained only for import-time failures (file missing, YAML parse error). The force-write recovery branch becomes the canonical heal path; hooks emit a DEGRADED block + /heal recommendation; errors still WARN-logged.
- **why:** The throw broke 4+ downstream consumers — including the repair op that exists to fix the very corruption that made readState throw. Marker-return is a single contract; per-consumer try/catch proliferation rejected.
- **source:** DEC:2294 (id), substance 2306-2323, rationale 2296-2305.
- **proposed inline principle:** A corrupt state artifact must remain *readable enough to repair*: readers return a degraded marker plus best-effort content rather than throwing, so repair tooling and status surfaces keep working. Reserve hard failure for cannot-read-at-all (missing file, unparseable bytes).
- **keep/fold/drop:** KEEP — core to state-as-derived-artifact-cache: the cache can always be re-derived/healed only if degraded reads don't crash the healer.

## D-Rd12-2 — OPTIONAL_KEYS schema drift: add halt_* keys
- **content:** The validator's optional-keys enum lagged the keys that defaults/state.yaml legitimately ships (halt_resolution, halted_on_drift, halt_reason), producing spurious WARNs on every CLI call against fresh init state. Enum amended.
- **why:** Hand-maintained key list in the validator drifted from the actual default artifact.
- **source:** DEC:2333 (id), substance 2339-2344, rationale 2335-2338.
- **proposed inline principle:** citation-only, delete — the incident is the argument: a validator whose key list is maintained by hand will drift from the artifact it validates. In the rebuild, validator and defaults both derive from the one canonical schema.
- **keep/fold/drop:** DROP as a rule; KEEP as the named motivating incident for Phase 1 schema single-source.

## D-Rd12-3 — Lock-substrate hardening pack
- **content:** (i) the remaining direct HEAL-LOG writer (appendHealLog) wraps via the shared appendAuditLine; (ii) with-lock hardenings: TOCTOU-safe stale-lock removal (rename to `.stale-<pid>-<ts>` then unlink — rename is atomic, race loser gets ENOENT and retries), reject `\n`/`\r` in item IDs at the audit-line entry (structured error; scrub-and-continue rejected as silent corruption), wrap all non-EEXIST lock-open errors as `ELOCKBUSY` with `.cause` preserved, document the 60s max-hold cap (heartbeat deferred to v1.1); (iii) the concurrency test spawns real child processes (setImmediate is synchronous in single-process JS — it proved nothing).
- **why:** Partial wrapping at handler sites was proven insufficient (a missed writer caused F2); a hollow concurrency test gave false confidence.
- **source:** DEC:2361 (id), substance 2370-2396, rationale 2363-2369.
- **proposed inline principle:** Concurrency hardening happens at the shared substrate, not per call site; stale-lock recovery must itself be race-safe (atomic rename before delete); inputs to append-only logs are validated against record-delimiter injection; and a concurrency test that doesn't use real OS processes tests nothing.
- **keep/fold/drop:** KEEP — merge with D-Rd11-4 into one locking design note.

## D-Rd12-4 — Per-op spec authority enforcement (envelope + supersede + terminology)
- **content:** (i) handler success envelope amended to the per-op spec's verbatim 8 keys (ok, op, item_id, action, prior_status, new_status, heal_log_path, last_updated) — drift keys removed, missing ok/op added (callers discriminate success/failure on them); a master enum-survey error in the original prose was itself corrected against the spec at synthesize-step; (ii) old decisions amended in place to canonical field terminology with substance-preserving annotations; (iii) the superseded task AC marked `SUPERSEDED-by-T-961` with cross-reference — losers annotated, never deleted.
- **why:** Round-11's envelope drift, terminology drift, and opposed contracts all rooted in authority-source confusion; audit-trail preservation demands annotation over deletion.
- **source:** DEC:2412 (id), substance 2420-2448, rationale 2414-2419.
- **proposed inline principle:** Superseded decisions and acceptance criteria are annotated with what superseded them — never deleted — so the audit trail explains every contradiction a future reader will find. And success envelopes always carry the ok/op discriminator keys the spec defines.
- **keep/fold/drop:** FOLD — authority half into D-Rd10-4; KEEP the annotate-don't-delete supersede convention as its own one-liner.

## D-Rd12-5 — Fail-loud on missing required input (write-round-close step + WARN-but-fail)
- **content:** (i) the architect's ordered_steps gains 'write-round-close' as step 7 (the round-close writer was never a registered step, so it never ran); (ii) the alignment checker, on a sub-arch return with missing frontmatter, emits a `missing-frontmatter-skip` finding and exits EXIT_VALIDATION_FAIL=17 instead of exit 0 with empty findings. "Graceful-Degradation... applies to forward-compat unknown-key reads, NOT to required-input absence."
- **why:** Silent-skip was a mis-application of the graceful-degradation principle; CI must fail loud rather than silently pass when it could not actually check.
- **source:** DEC:2467 (id), substance 2476-2491, rationale 2469-2475. Corroborated cli-spec.md:1214.
- **proposed inline principle:** Tolerance is for *unknown extras*, never for *missing requireds*: a checker that cannot evaluate because required input is absent must emit a finding and exit non-zero — evaluating what it can, but never reporting clean. A required pipeline step must be registered in the step sequence, or it will simply never run.
- **keep/fold/drop:** KEEP — sibling of D-Rd10-1; the two together define the rebuild's checker semantics.

## D-Rd12-6 — STALE_SWEEP token set: spec AC-3 canonical (user verdict)
- **content:** Three drifted surfaces (live emitter, test assertion, spec-header operating note) reconciled to the spec body's AC-3 audit-log token set (`STALE_SWEEP_AUTO_RELEASE` + item_id + prior_status + new_status + threshold_hours); the header note revised to defer to AC-3. User adjudicated which surface wins via interactive question.
- **why:** Spec body carries authority over header operating notes (per-op-spec authority precedent); a user-bound ambiguity was resolved by asking, not guessing.
- **source:** DEC:2507 (id), substance 2516-2529, rationale 2509-2515, user verdict 2531-2534.
- **proposed inline principle:** (covered by doc-authority + ask-the-human-on-ambiguity rules.)
- **keep/fold/drop:** FOLD into D-Rd10-4 doc-authority; citation-only beyond that.

## D-Rd12-8 — Exit-code surface collision: allocate EXIT_ALIGNMENT_DRIFT=19
- **content:** Master initially allocated exit 18 for alignment drift; the sub-architect's enum survey found 18 already meant task-id-mismatch in two spec rows. Re-decided at synthesize-step: allocate 19 (survey confirmed 8, 11, 12, 14, 19 free; high slot chosen to preserve low contiguous slots). Renumbering rejected (back-compat), aliasing rejected (semantic collision), dual-use-with-context rejected (CI scripts key on the number; code→semantic must be 1:1).
- **why:** Exit codes are a public 1:1 enum; collisions silently corrupt every consumer keying on the number.
- **source:** DEC:2582 (id), substance 2594-2611, rationale 2584-2593, amendment_reason 2561-2572. Corroborated cli-spec.md:1213.
- **proposed inline principle:** Exit codes (and any public enum) map one code to one meaning forever: survey the full allocation table before claiming a slot, never renumber shipped codes, never alias. An allocation made without the survey is presumed wrong.
- **keep/fold/drop:** KEEP — also a clean example of why enum allocation should be mechanically derived from the single-source schema, not decided in prose.

## D-Rd12-10 — step-advance-terminal test substance: single-step fixture
- **content:** The terminal-boundary test seeded a 6-step skill, so the single-step boundary (advance from step 1 of 1 → skill-complete) was never exercised; fixture replaced via the skill-dir override env hook.
- **why:** Inverted fixture = unverified boundary; the override-dir mechanism is the canonical test-mode seam.
- **source:** DEC:2719 (id), substance 2724-2730, rationale 2721-2723.
- **proposed inline principle:** (instance of: a test must exercise the specific boundary it claims to verify; fixtures that exercise a different shape are hollow.)
- **keep/fold/drop:** FOLD into test-substance discipline (with D-Rd12-3(iii) and D-Rd12-9); citation-only beyond that.

## D-Rd12-12 — test-mode-guard split-brain: consolidate crash hooks
- **content:** Two crash hooks read the same env var (`ESF_TEST_FAIL_AFTER_TMP`) with divergent semantics (inline `process.exit(99)` vs throw-plus-tmp-cleanup). Consolidated to the single canonical throw+cleanup pattern; isTestMode imports consolidated to the one lib.
- **why:** Same env var, two behaviors = split-brain; failure modes must be uniform across writers.
- **source:** DEC:2760 (id), substance 2767-2774, rationale 2762-2766.
- **proposed inline principle:** (instance of the single-canonical-helper + test-hook-guard rules: one env var, one semantic, one implementation.)
- **keep/fold/drop:** FOLD into D-Rd10-14 / helper-consolidation; citation-only beyond that.

---

## T-* "what shipped" notes

Source for goals: task specs at `tmp-spike-CLOSURE/.pipeline/architecture/sprints/{9,10}/tasks/T-NNN.yaml` (goal: field read verbatim); ship status from `tmp-spike-CLOSURE/.pipeline/build/sprints/{9,10}/tasks/T-NNN/completion-record.yaml`.

- T-901: `next-step` CLI op in essense-flow-tools.cjs — parses SKILL.md into heading-bounded steps, emits step N per cursor.yaml, idempotent replay (D-Rd9-7). Status: complete.
- T-902: `arch-alignment-check` CLI op — runs all 6 deterministic alignment criteria against a sub-architect return file; exit 0 all-pass / non-zero on findings. Status: complete.
- T-903: `task-spec-write-section` CLI op — schema-validated, atomic (tmp+rename) per-section task-spec writes; rejects violations loudly; coexists with whole-doc write. Status: complete.
- T-904: shared `requireExplicitArgs` helper + `--from-cursor` opt-in inference with stdout audit echo; explicit-args default across round-9 ops. Status: partial-with-surfaced-concern.
- T-905: `cursor-init` CLI op + cursor.yaml schema validator (skill/step_index/total_steps/step_emitted_at), total_steps auto-derived from SKILL.md, legacy migration, atomic write. Status: complete.
- T-913: drift-11 stale-claim staleness check in scripts/drift-audit.py (Python audit layer of DD-19) + 3 paired fixtures. Status: complete.
- T-915: `essense-flow-architect-alignment-lens` subagent definition authored (all 6 DD-20(b) criteria in system prompt); landed at plugins/essense-flow/agents/. Status: complete.
- T-918: `heal --sweep-stale-claims` — sweeps register for stale in_progress claims; per-item AskUserQuestion or `--auto-release` batch; HEAL-LOG.md audit trail. Status: complete.
- T-919: register schema gains `claimed_at` ISO8601 field, stamped on in_progress add; documented in cli-spec.md; legacy entries tolerated (set-based access preserved per D-Rd9-2). Status: complete.
- T-921: coordinated `nextStep()` rewrite closing F1 (duplicate case-arm), F2 (restore applyCursorInference), F11 (exit 7→9), F17 (canonical lib explicit-args import), F28 (stderr flag advice) in one edit. Status: shipped, verification pass.
- T-924: cursor.yaml writer consolidation — three writer paths reduced to canonical writeNewCursorAtomic; tmpName() suffix adopted. Status: shipped, verification pass.
- T-940: `heal --apply-disposition --item-id --action <release|keep|escalate>` per-item handler (D-Rd10-11), paired with per-op spec. Status: shipped, verification pass.
- T-961: lock-discipline wrap — register-add / sweep-auto-release / apply-disposition handlers wrapped in withLock; inline HEAL-LOG writes → appendAuditLine (D-Rd11-4). Status: partial-with-surfaced-concern (substrate gaps closed later by D-Rd12-3).
- T-1002: taskSpecWrite extended with M-2 substrate-citation scan (rejects pseudocode citing unverified engine behavior) + FORBIDDEN_MARKERS grep-citation opt-in (per D-Sprint10-14 route change, scanner exemption landed by master pre-W1). Status: complete.
- T-1006: pre-pack test-baseline gate — synthesize step runs plugin test suite, writes JSON baseline; pack refuses when baseline missing or >1h stale. Status: complete.
- T-1020: evalDispatchPredicate + DISPATCH_PHRASES extended to honor the Skip-IFF rule-allowed-skip bypass (tools.cjs:1793-1854 region) for the three dispatch-sufficiency predicates. Status: complete, verified true.
