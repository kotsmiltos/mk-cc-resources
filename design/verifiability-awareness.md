# Verifiability-Awareness — Design Doc

> **type:** design (pre-build)
> **status:** DESIGN — LOCKED on **P1** (§11): a `verifiability-lens` AGENT (§9) fired
> automatically by a **Stop hook that blocks + dispatches the lens in-session** (user accepts the
> wait for better results). Fully verified mechanism (autopilot precedent) — no feasibility spike
> needed. Instruction (§7–8) shrinks to the lens rubric; §4–5 + P2 (§10) kept as alternatives.
> Open: P1a-vs-P1b, plugin home, naming. Nothing built.
> **Second pillar (§12):** audience-aware surfacing — lens DETECTS A/B/U, surfacing triage
> (auto-resolve / escalate-with-context / suppress, tuned by a recipient profile) DECIDES what
> reaches the user. Hard rule: never a context-less decision; bias to absorb the slack.
> **scope (decided):** all 8 plugins + project CLAUDE.md + global CLAUDE.md
> **thesis:** hard-to-verify work breaks iterative agentic convergence — the agent
> can't tell if it's closer to right, so it spins. Make the verifiable/unverifiable
> split a first-class surfaced signal everywhere work is planned, prompted, reviewed,
> or reported — not a vibe.

---

## 1. The concept

Every produced unit of work falls in one of three classes:

| class | meaning | example | convergence behavior |
|-------|---------|---------|----------------------|
| **A — verifiable** | cheaply + accurately checkable: tests pass, read the code path, deterministic diff, grep | "parseX returns Y for input Z"; "grep shows 0 hits"; disk-diff matches claim | iterates to correct — each loop has a signal |
| **B — unverifiable** | no cheap accurate check exists: images, predictions, hard open problems, subjective quality, missing-context | "this UI looks good"; "this is the root cause" (unreproduced); "users will prefer X" | spins — no signal that a loop got closer |
| **U — indeterminate (meta-case)** | **can't even tell which class this is** — the verification capability is missing, or it's unknown whether one exists | "I don't know if this is testable without trying"; substrate not read; tool access unknown | worst — silently masquerades as A and produces false-clean |

The point is not to forbid class B/U work — it's to **surface it**, so:
- the agent stops iterating on a B item (asks/escalates instead of spinning),
- the human sees exactly which deliverables rest on a guess,
- a U item is forced down to A (acquire the check) or up to B (declare it unverifiable) — never left masquerading as A.

**Verifiability is capability-relative** (key insight from `agents/task-agent.md:164` vs `agents/sub-architect.md:200-206`): the same claim ("the linter passes") is class A for an agent **with** Bash and class B for one **without**. Class is a property of (claim × who's checking × tools available), not the claim alone.

---

## 2. The unknowns[] delta — proves EXTENDS, not duplicates

The adjacent primitive is `references/librarian.md`'s `unknowns[]`: producer agents declare, in a structured array surfaced at gates, what they could not resolve. The new idea **extends** it on a different axis:

| | unknowns[] (existing) | verifiability (new) |
|--|----------------------|---------------------|
| **axis** | input-side: "I can't **answer** X" | output-side: "I **produced** X but can't **check** it's right" |
| **trigger** | a decision/fact is missing before you act | a deliverable exists but no cheap accurate check confirms it |
| **example** | "which markdownlint ruleset does CI use?" | "I wrote this regex; I can't run it, so I can't confirm it matches" |

**The seam already exists in the canon — this is why it extends rather than duplicates:**

- `librarian.md:86-89` — *"Verdict classes are unknown channels too: a validator's `needs_context`, a verifier's `manual`, a lens's `inconclusive` — these are unknowns by another name. Masters treat them with the same gate discipline."* → These ARE class-B/U signals. The new work **names that scattered set as one channel** instead of inventing a second gate.
- `unknown-entry.schema.yaml` field `what` is defined as *"the exact thing you could not **verify or decide**"* (`librarian.md:67`) — the schema already conflates **verify** (output) and **decide** (input) in one field. The clean fix is a **discriminator**, not a new schema.
- `code-conventions.md:90-95` already routes *one* output-side case (a missing test harness) into `unknowns[]`. Class B widens that from "no tool exists yet" to "no cheap check exists in principle."

**One-line delta per overlap** (every place the two touch):

| overlap site | file:line | delta (verifiability adds…) |
|--------------|-----------|------------------------------|
| `unknown-entry.what` "verify or decide" | librarian.md:67 | a `dimension: answerability \| verifiability` discriminator so the two cases stop sharing one undifferentiated field |
| "verdict classes are unknown channels" | librarian.md:86-89 | names manual/needs_context/inconclusive as the **B/U channel** explicitly; one vocabulary instead of three ad-hoc verdicts |
| missing-harness → unknowns[] | code-conventions.md:90-95 | generalizes "no tool" (U, fixable) vs "unverifiable in principle" (B, not tool-fixable) |
| perspective-agent "confidence from training data" | agents/perspective-agent.md:83 | this lone output-side line in every agent's belongs-list becomes a typed class-B marker, not prose |

---

## 3. Touchpoint map (consolidated, file:line)

The marketplace **already implements this axis ~8 times under different names.** The design's core job is to unify, not multiply. Grouped by the role each touchpoint plays:

### 3a. Existing latent A/B proxies (unify these — don't add beside them)

| proxy | file:line | A side | B / U side |
|-------|-----------|--------|-----------|
| `agency_level` (prescribed/guided/open) | task-spec.schema.yaml:153-172; architect/SKILL.md:262 | prescribed = pinned shape | open = architect couldn't pin it |
| test_completion_contract `check.type` | task-spec.schema.yaml:126-142 | test/grep/file_exists = A | `manual` = B |
| must-pass vs author-only | build/SKILL.md:76; task-agent.md:128 | must-pass = executed proof (A) | author-only = no execution (B) |
| `verified: bool` | completion-record.schema.yaml:113-119 | true = disk matches claim | **false collapses "checked+failed" with "couldn't check" — the missing U state** |
| validator verdicts | review/SKILL.md:115-124 | confirmed/false_positive = A | needs_context = B/U |
| verify verdicts | verify/SKILL.md:102-110 | implemented/missing/drift = A | `manual` = B/U |
| heal inference confidence | heal/SKILL.md:111-113 | high = artifacts deterministically match (A) | low = prose guess (B) |
| organize spec-mode confidence | organize/SKILL.md:87 | — | "confidence lower by design" = self-declared B |
| code-glossary `verification_status` | code-glossary/SKILL.md:118-124 | verified = A | quote_drift_detected / inconclusive = B/U |
| note research status | note/SKILL.md:23 | "Answered Internally" = grounded (A) | "Pending" = couldn't ground (B) |
| alignment-lens per-criterion | agents/alignment-lens.md:50,57 | deterministic half = A | semantic half (criterion 7 = pure B) |

### 3b. Gaps — places with NO A/B surface today (the real new wiring)

| role | touchpoint | file:line | what's missing |
|------|-----------|-----------|----------------|
| result-reporting | handoff `What Remains` / `Blockers` | handoff/SKILL.md:60-67 | carry-over work isn't tagged A/B; class-B carry-overs (the convergence-killers) are invisible to /resume + /retro |
| result-reporting | completion-record `verified` | completion-record.schema.yaml:113 | binary bool can't say "couldn't verify" (U) — collapses to false |
| idea-eval | retro `Gaps & Failures` | retro/SKILL.md:72-76 | recurring B gaps (won't converge by iterating) not distinguished from fixable A gaps |
| intake | elicit `unknown_count` | elicit/SKILL.md:38-44 | counts input-unknowns only; no output-verifiability count beside it |
| planning | research acceptance-criteria | research/SKILL.md:120,302 | "testable vs not" IS an A/B classifier but applied only to phrasing, never declared as a class |
| ad-hoc / cross-repo | (none) | — | no way to invoke the A/B split in a plain coding task outside the pipeline |
| always-on | global CLAUDE.md Verification Discipline | ~/.claude/CLAUDE.md:45-49 | governs proving-done (output), says nothing about classifying checkability up front |

### 3c. Meta-case (U) — detection sites

| site | file:line | current behavior | U-treatment to add |
|------|-----------|------------------|---------------------|
| substrate-verify → downgrade | architect/SKILL.md:311; sub-architect.md:200-206 | "can't read source → downgrade to guided + log unknown" | this IS the U→handle path; name it |
| triage uncertain → user | triage/SKILL.md:99,142 | "categorization uncertain → say so, route to user" | U escalation, keyed on ambiguity |
| extractor under-extraction | agents/extractor.md:49 | "can't verify you extracted everything = false-clean" | U about coverage — a meta-B |
| dry-refactor substrate-stale HARD STOP | dry-refactor/SKILL.md:47,92 | "can't trust my evidence → stop" | U hard-stop, already exists |
| verify/review gate excludes B | verify/SKILL.md:121; review/SKILL.md:300 | gate counts only A-gaps; manual/needs_context routed to user | the gate is already A/B-aware implicitly — formalize |

### 3d. LOW / NO relevance (won't wire — stated so it's not a silent omission)

- **schema-scout, alert-sounds** — utilities, no work-planning/review surface. NO.
- **caveman** — not a plugin in this repo (external skill); pure output compression. NO.
- **version-bump, plugin-scaffold, claude-md-sync, docs-audit** — output is A-class by construction (deterministic cascade/scaffold/path-match). LOW — good A exemplars, no new-primitive value.

---

## 4. Candidate mechanisms — prototyped, with eval

Four mechanisms. They are **layers, not alternatives** — but each can ship alone. Drafts are concrete so they can be reacted to.

### M1 — Cross-cutting "verifiability lens" reference (the spine)

A canon doc, cite-don't-copy (like `principles.md`), that names class A/B/U once. Every skill cites it; nobody re-prose's it.

**Draft (`references/verifiability-lens.md`, excerpt):**
```markdown
# The verifiability lens
> consumed_by: every skill that plans, reviews, or reports work; cited, never copied

Before producing work, and before reporting it done, split it:
- **A — verifiable:** a cheap accurate check exists AND you can run it now
  (test, code-path read, deterministic diff/grep). State the check.
- **B — unverifiable:** no cheap accurate check exists (image, prediction,
  open problem, subjective quality, missing context). Do NOT iterate blindly —
  declare it, surface it, ask or escalate.
- **U — indeterminate:** you can't tell whether a check exists, or you lack the
  tool to run it. Resolve U: acquire the check (→A) or declare unverifiable (→B).
  Never let a U item pass as A — that is the false-clean failure.

Class is relative to (claim × checker × tools). The same claim is A with Bash,
B without. When you downgrade, say why.
```

- **Pros:** lowest risk; one clear conceptual home; turns the 8 scattered proxies into one shared vocabulary; pure addition, no schema churn.
- **Cons:** advisory only — nothing structurally forces emission. Alone, it stays a vibe (the exact failure the thesis warns about). **Needs at least one enforcing layer.**
- **Eat-own-dogfood:** "skills will actually cite it" is a **class-B guess** until wired; "the file exists and reads correctly" is A.

### M2 — Extend unknowns[] with a verifiability dimension (the enforcer)

Add a discriminator to `unknown-entry.schema.yaml` so output-side B/U gaps ride the **existing** register + gate + heal-sweep machinery. No new gate.

**Draft (schema addition):**
```yaml
# unknown-entry.schema.yaml — new field
dimension:
  type: string
  enum: [answerability, verifiability]   # answerability = can't decide (today's default)
  required: false                         # defaults to answerability for back-compat
  description: >-
    answerability = input-side, can't answer X. verifiability = output-side,
    produced X but can't cheaply+accurately check it. A verifiability entry whose
    why_unresolvable is "no tool" is class U (acquire it); "no check exists in
    principle" is class B.
```
Plus one line in `librarian.md` §"what this protocol is NOT" pointing at the lens, and `register-item.schema.yaml kind` gains nothing — verifiability entries reuse `kind: unknown` with `dimension: verifiability`.

- **Pros:** reuses register-add CLI (`bin:5177`), with-lock, context-inject advisory warning, heal sweep — all of it, free. Schema-validate (`lib/schema-validate.cjs`) validates the new enum with **zero code change** (it's enum-driven). Honors librarian.md:86-89 verbatim.
- **Cons:** only covers the pipeline's producer-agent returns; no ad-hoc/cross-repo reach; a back-compat default must be chosen (answerability).
- **Eat-own-dogfood:** "schema-validate auto-picks up the enum" is **A** — readable at `lib/schema-validate.cjs:66-75,208`. "Agents will populate `dimension` correctly" is **B** until tested with a real return.

### M3 — thorough-mode @-modifier + global always-on (the reach)

A new keyword modifier (any repo, any session) + a global CLAUDE.md always-on bullet. Covers the non-pipeline case.

**Draft (new MODIFIERS entry in `hooks/thorough-mode.js`, after `build`):**
```javascript
{
  name: "verifiability",
  triggers: [ /(?:^|\s)@verifiability(?:\s|$)/i, /(?:^|\s)@split(?:\s|$)/i ],
  injection: `[verifiability] Split the work before doing it, and again before reporting it done:
- Class A (verifiable): a cheap accurate check exists and you can run it now — name the check.
- Class B (unverifiable): no cheap accurate check (image, prediction, open problem, subjective, missing context) — declare it, do NOT iterate blindly, ask or escalate.
- Class U (can't tell): you don't know if a check exists or you lack the tool — resolve it to A (acquire the check) or B (declare), never let U pass as A.
- Report the split: which deliverables are A, which are B/U. The B/U items are where convergence stalls.`,
}
```
Plus a HINTS entry (fires on keyword-less intent: "which parts can we actually verify", "is this checkable", "how do we know it's right vs a guess"), and a global `~/.claude/CLAUDE.md` Prompt-Modifiers bullet + a Verification-Discipline always-on line.

- **Critical delta vs existing `@verify`** (`hooks/thorough-mode.js:81-95`): `@verify` = **post-hoc** claim-proving ("before claiming done, VERIFY the result"). This = **up-front** classification ("before doing the work, split it A/B/U"). Complementary: classify first (this), prove the A's later (@verify). The doc must state this delta or they read as duplicates.
- **Pros:** works anywhere, zero pipeline dependency; cheap (copy an existing modifier object); the global bullet makes it always-on for every project.
- **Cons:** ephemeral — injects into a prompt, leaves nothing durable in artifacts; doesn't make the pipeline's producers emit anything.
- **Eat-own-dogfood:** "the hook fires and injects" is **A** — testable by piping a prompt to the hook and reading stdout. "The modifier changes model behavior usefully" is **B**.

### M4 — Tri-state `verified` + `verifiability_class` on schemas (the deep wiring, defer)

Make the result-side gap real: `verified: bool` → `verified: verified | failed | unverifiable` on completion-record; optional `verifiability_class` beside `agency_level` on task-spec so /architect pre-declares A/B at spec time.

- **Pros:** closes the one genuine structural gap (U has no home in `verified`); /verify + /review gates could then count B/U explicitly instead of implicitly.
- **Cons:** highest blast radius — touches the dual-record contract (`record-task-completion` at `bin:4884`), every consumer of `verified`, drift computation (build/SKILL.md:99), and the schema render/drift tests. Real migration.
- **Recommendation:** **defer to a later version behind its own gate.** M1–M3 deliver the surfaced signal; M4 is the structural deepening once the vocabulary has proven itself.

---

## 5. Recommended blend + build order

**Blend = M1 + M2 + M3, M4 deferred.** Rationale: M1 gives the vocabulary, M2 enforces it inside the pipeline reusing all existing machinery, M3 gives ad-hoc + always-on reach. Each is independently shippable and independently verifiable.

| step | deliverable | verifiable check (class A) |
|------|-------------|----------------------------|
| 1 | `references/verifiability-lens.md` written; `principles.md` + `code-conventions.md` cite it | grep: both files contain a link to verifiability-lens.md; lens file parses |
| 2 | `unknown-entry.schema.yaml` gains `dimension`; librarian.md §interaction names the channel | `schema-validate` accepts a return with `dimension: verifiability`; rejects a bad enum; render-schemas drift test green |
| 3 | thorough-mode modifier + hint + CLAUDE.md block + RELEASE-NOTES + version cascade (1.6.0→1.7.0) | pipe `@verifiability` prompt to hook → injection appears in stdout; pipe a non-trigger prompt → absent |
| 4 | global + project CLAUDE.md bullets | grep: both files contain the verifiability bullet |
| 5 *(defer)* | M4 tri-state `verified` + task-spec field | migration spec + drift tests — separate gate |

**Class-B risks in THIS design (dogfooding):**
- Whether skills *adopt* the lens vs ignore it — **B**, only provable by running a real pipeline phase after wiring.
- Whether a new modifier *meaningfully* changes model output vs noise — **B**, subjective.
- The naming choice — **B**, a judgment call; deferred to the user.
- Everything in §3 file:line — **A**, read from disk by 4 mapping agents this session.

---

## 6. Open decisions for the user (before build)

1. **Mechanism blend** — ship the full M1+M2+M3, or a lighter subset (e.g. M1+M3 advisory-only, skip schema change)?
2. **Naming** — `verifiability-lens` / class A,B,U? Or different (verdict-class, checkability, confidence-class)? Drives filename, schema enum value, modifier keyword.
3. **M4 timing** — confirm defer, or pull the tri-state `verified` into v1?

---

## 7. Revised direction — instruction-first (PRIMARY PLAN)

Per feedback: the §4 mechanisms (new reference file, schema discriminator, new modifier,
schema migration) are heavier than the problem needs. The streamlined shape is **one rule,
stated once where the always-on verification canon already lives and already propagates,
then *applied* (not re-stated) as a one-liner at each applicable touchpoint** — using the
cite-don't-copy discipline the codebase already runs on. No new schema, no new modifier, no
new mechanism required for v1.

### 7.1 Why this is streamlined (no new machinery)

The marketplace **already has an always-on "Verification Discipline" instruction that
propagates by existing means**:
- global `~/.claude/CLAUDE.md` "Verification Discipline (always-on)" (`:45-49`) — and that
  file's own "Propagation requirement: every descendant artifact must carry these instructions."
- project `mk-cc-resources/CLAUDE.md` (conventions / verify-don't-claim).
- `references/principles.md:82-89` (Verification discipline, always-on) + `code-conventions.md:15-22`.
- the `[verification-rules]` UserPromptSubmit hook + thorough-mode hook — **already inject the
  verification rules into every prompt.** Adding one clause here makes the split always-on with
  zero per-skill edits.

So the A/B/U split is not a new artifact — it's **the next sentence of a rule that already
ships everywhere.** State it once per canon location; the existing propagation carries it.

### 7.2 The one rule (the addition to the existing always-on block)

> **Split the work by verifiability.** When a cheap, accurate check exists, name it (class A
> — "tests pass", "grep shows 0 hits", "read the code path"). When no cheap accurate check
> exists — image, prediction, hard open problem, subjective quality, missing context — say so
> plainly (class B); do **not** iterate blindly on a B item, ask or escalate. When you can't
> tell whether a check exists, or you lack the tool to run one (class U), resolve it: acquire
> the check (→A) or declare it unverifiable (→B) — never let a U pass as A; that is the
> false-clean failure. The B/U residue is where iteration stalls — **surfacing it is the deliverable.**

This is a strict extension of the existing "state the verifiable check that proves work done"
line — it adds *what to do when no such check exists.*

### 7.3 Where it's APPLIED (one line each, woven into existing prose, cite the rule)

Only where work is produced / reviewed / reported and the application is non-obvious. Each is
a single sentence added to existing text — not a restatement of the rule:

| touchpoint | file:line | one-line instruction to weave in |
|------------|-----------|-----------------------------------|
| architect task specs | architect/SKILL.md:262; task-spec | "Beside each task's agency_level, state in prose whether its acceptance is class A (a check exists) or B/U — a B/U task instructs the build agent to verify-at-runtime, not assume." |
| build / review / verify verdicts | build/SKILL.md:76; review/SKILL.md:115; verify/SKILL.md:102 | "manual / needs_context / inconclusive ARE the class-B/U channel (per librarian.md:86-89) — name them as such; the gate counts class-A gaps, B/U routes to the user." |
| research acceptance criteria | research/SKILL.md:120,302 | "Each acceptance criterion declares testable (A) or not (B); a non-testable NFR is a class-B you flag, never smuggle in as if checkable." |
| elicit goals/constraints | elicit/SKILL.md:157 | "Mark user-stated goals (A) vs inferred (B); never present an inferred goal as if the user verified it." |
| handoff remaining/blockers | handoff/SKILL.md:60-67 | "Tag each What-Remains + Blocker item A/B/U; class-B carry-overs are the convergence risk /resume and /retro must see." |
| retro gaps | retro/SKILL.md:72-76 | "Separate class-A gaps (fixable, a check exists) from class-B gaps (recur because no check converges them) — B gaps need a strategy change, not another iteration." |
| note research status | note/SKILL.md:23 | "'Pending' is the class-B marker — couldn't ground it; don't report it as answered." |
| canon (the rule itself) | principles.md:82-89; code-conventions.md:15-22; global+project CLAUDE.md; verification-rules hook | add the §7.2 clause once per location |

### 7.4 Avoiding drift across the applied points (the cite-don't-copy answer)

The rule text lives in ONE canon statement (§7.2). Every touchpoint instruction is an
*application that names the local proxy* (manual verdict, Pending, agency_level…) and points
at the canon — it does not re-prose the A/B/U definitions. This is exactly how `principles.md`
and `librarian.md` are already consumed: cited, never copied. If the rule changes, the canon
statement changes; the one-line applications keep pointing at it.

### 7.5 What this drops vs §4

- **No new reference file** (M1) — extend the existing verification-discipline canon instead.
  *(Open: if the canon spots are too scattered to extend cleanly, a single tiny shared line
  that all cite is the fallback — still lighter than a full reference doc.)*
- **No schema discriminator** (M2) — instruction tells producers to declare the class in prose;
  schema enforcement is a later deepening only if prose proves insufficient.
- **No new modifier** (M3) — the always-on hook injection already covers "always-on"; an
  on-demand `@`-modifier becomes optional sugar, not core.
- **No schema migration** (M4) — held, per your call.

### 7.6 The remaining design dial (for the user)

**Coverage granularity** — how wide do the *applied* one-liners go:
- **minimal:** add the §7.2 rule to the canon only; let always-on propagation do the rest.
- **anchored:** canon rule + the ~7 high-leverage applications in §7.3.
- **exhaustive:** canon rule + an application at every applicable point in §3 (your "any part
  applicable" instinct) — widest coverage, most edits, highest drift-maintenance.

---

## 8. DECIDED PLAN — instruction-first, single-canon-per-scope, exhaustive application

Decisions locked (this session): **instruction-first**; **one canonical statement of the rule
per canon scope, applied-by-citation everywhere** (not re-prosed); **exhaustive coverage** of §3.
Naming still open (working labels: class A / B / U, "verifiability split") — to be finalized
against the written canon text. **Nothing is built yet — this is the plan to ratify.**

### 8.1 Canon statement (Tier 0) — where the rule is stated once per scope

The rule (§7.2 text) is stated in each *independent* canon scope. Plugins are independently
installable, so each plugin that has touchpoints carries its own copy in its own primary doc;
cross-plugin consistency is enforced by `/docs-audit` + `/version-bump`, not by file references
(same way the repo already handles shared conventions — every plugin has its own CLAUDE.md).

| scope | canon home | action |
|-------|-----------|--------|
| global (all projects) | `~/.claude/CLAUDE.md` Verification Discipline (always-on) `:45-49` | append the §7.2 clause; the file's own "propagation requirement" carries it to descendants |
| project (this repo) | `mk-cc-resources/CLAUDE.md` conventions | add a "Verifiability split" convention bullet |
| essense-flow | `references/principles.md:82-89` (Verification discipline) + `code-conventions.md:15-22` | extend both; skills/agents already cite principles.md — applications point here |
| thorough-mode | always-on prompt-injection layer | OPTIONAL on-demand `@`-modifier deferred; the always-on global rule already covers it |
| session-lifecycle / plugin-toolkit / project-note-tracker | each plugin's CLAUDE.md or SKILL.md preamble | one short statement per plugin (independently installable) |

### 8.2 Applied one-liners (Tier 1) — exhaustive, every §3 touchpoint

Each cell is a single sentence woven into existing prose, naming the **local proxy** and the
class it maps to. It does not restate the A/B/U definitions (those live in the canon).

**essense-flow — skills**

| # | touchpoint | file:line | woven instruction (names local proxy → class) |
|---|-----------|-----------|-----------------------------------------------|
| 1 | elicit anti-fabrication | elicit/SKILL.md:157 | "Mark each goal/constraint user-stated (A) vs inferred (B); never present inferred as verified." |
| 2 | elicit build-ready close | elicit/SKILL.md:29,108 | "The re-read-until-no-new-question loop is class-B detection — if you can't tell the SPEC is closed, that uncertainty is the signal to keep looping, not to stop." |
| 3 | elicit unknown_count | elicit/SKILL.md:38-44 | "Beside unknown_count (input-side), note any output the SPEC asserts but can't be checked (class B)." |
| 4 | research acceptance criteria | research/SKILL.md:120,302 | "Each criterion declares testable (A) or not (B); a non-testable NFR is a class-B you flag, never smuggle as checkable." |
| 5 | research source confidence | research/SKILL.md:144,149 | "A claim with no high-confidence source is class B — the absence is the finding; don't launder it into A." |
| 6 | research open follow-ups | research/SKILL.md:85,133 | "Open follow-ups that are unverifiable-by-nature (not just unresearched) carry the class-B tag." |
| 7 | triage signal precedence | triage/SKILL.md:103 | "Deterministic signal = class A, heuristic guess = class B; A beats B for routing (this rule already encodes the split)." |
| 8 | triage uncertain → user | triage/SKILL.md:99,142 | "When you can't tell which category (class U), say so and route to user — never default-guess a disposition." |
| 9 | architect agency_level | architect/SKILL.md:262 | "Beside agency_level, state each task's acceptance as class A (a check exists) or B/U; a B/U task tells the build agent to verify-at-runtime, not assume." |
| 10 | architect substrate-verify | architect/SKILL.md:311 | "Can't read the substrate = class U → downgrade to guided + log the gap (this IS the U→handle path)." |
| 11 | architect test_completion_contract | architect/SKILL.md:256 | "check.type test/grep/file_exists = class A; check.type manual = class B — make the mix explicit per task." |
| 12 | organize borderline clusters | organize/SKILL.md:67 | "Uncertain merge = class U → default distinct (you can't verify the merge is safe)." |
| 13 | organize spec-mode confidence | organize/SKILL.md:87 | "Spec-mode output is self-declared class B (no signatures to check) — the user gate is its B-mitigation; say so." |
| 14 | build runner_verification | build/SKILL.md:26,69 | "Agent self-report = class B (claim); runner disk-diff = class A (proof) — the dual-record keeps both, A overrides B." |
| 15 | build must-pass vs author-only | build/SKILL.md:76 | "must-pass = class A (executed); author-only = class B (no execution) — name which each criterion is." |
| 16 | build drift blind spot | build/SKILL.md:78,99 | "Drift only fires on disk-checkable (A) criteria; a task whose criteria are all B can't produce drift — flag it as silently-unverifiable, not as passing." |
| 17 | build synthetic crash record | build/SKILL.md:122 | "'couldn't verify' (class U) is distinct from verified:false — say which when recording." |
| 18 | glossary Pass C | glossary/SKILL.md:22,29 | "verification_status verified = A; quote_drift/inconclusive = B/U — surface, never suppress." |
| 19 | glossary drift diff | glossary/SKILL.md:67 | "Deterministic duplication signal = class A; the LLM judging steps = class B — keep them labeled distinctly." |
| 20 | review evidence policy | review/SKILL.md:23,286 | "A finding with no verbatim quote + file:line is class B — not admissible; this gate IS the A-filter." |
| 21 | review validator verdicts | review/SKILL.md:115 | "needs_context = class B/U (per librarian.md:86-89); the deterministic gate counts class-A criticals, B/U routes to user." |
| 22 | review anti-fabrication | review/SKILL.md:170,311 | "Fabricated (unverifiable) findings are class B that spawn endless loops — the thesis verbatim; require A-evidence or label B." |
| 23 | verify existence≠impl | verify/SKILL.md:22,165 | "File-exists is class U until the body is read; only the body read makes it class A." |
| 24 | verify manual verdict | verify/SKILL.md:102 | "implemented/missing/drift = class A; manual = class B/U → user; confirmed_gaps gate counts only A." |
| 25 | context degraded-state | context/SKILL.md:72 | "(read-only plumbing — no produced artifact to class; degraded-state warning already follows fail-soft 'surface, never hide')." |
| 26 | heal inference confidence | heal/SKILL.md:111-113 | "high = artifacts deterministically match (A); low = prose guess (B); medium = U — low/U never silently picks a phase, asks user." |
| 27 | heal read bodies | heal/SKILL.md:23,100 | "Shape-match from a read body = A; existence alone = U." |

**essense-flow — agents** (mirror parents; the sharper agent-layer surfaces)

| # | touchpoint | file:line | woven instruction |
|---|-----------|-----------|-------------------|
| 28 | perspective-agent training-data confidence | agents/perspective-agent.md:83 | "Confidence from training data (not from something read/run this session) = class B — already your unknowns rule; tag it as the output-side marker it is." |
| 29 | perspective-agent closed rec | agents/perspective-agent.md:49,59 | "Force a closed recommendation (A-shaped); the unverifiable residue goes to the class-B ledger, not into 'depends'." |
| 30 | sub-architect substrate-verify | agents/sub-architect.md:200-206 | "No Bash → CLI output/exit codes/test results are class B for you; never prescribe them as fact — downgrade + log (richest existing A/B precedent)." |
| 31 | task-agent capability-relative | agents/task-agent.md:164 | "You HAVE Bash — a runtime question is class A for you (run it before declaring unknown); the same question was class B for the architect. Class is capability-relative." |
| 32 | task-agent runner authoritative | agents/task-agent.md:109 | "Your self-report = class B; the runner's snapshot-diff = class A and authoritative." |
| 33 | adversarial-lens quote threshold | agents/adversarial-lens.md:67,92 | "Quote shorter than min_quote_length = inconclusive (U); uncertain finding = class B → severity minor + 'needs human judgment'." |
| 34 | validator quote-drift + needs_context | agents/validator.md:36,67 | "Quote not on disk = class A refutation (false_positive); uncertain = class B/U (needs_context)." |
| 35 | item-verifier read body | agents/item-verifier.md:55,66 | "Body read → implemented/missing/drift (A); genuine human-judgment → manual (B); never class an uncertain item as implemented." |
| 36 | extractor under-extraction | agents/extractor.md:49 | "You can't verify you extracted everything = class-U coverage gap → false-clean risk; flag completeness as unproven." |
| 37 | alignment-lens deterministic vs semantic | agents/alignment-lens.md:50,57 | "Each criterion splits: CLI-deterministic half = A, semantic-judgment half = B; criterion 7 is pure B — the fullest existing A/B decomposition, generalize from it." |
| 38 | rule-completeness / pattern-debt | agents/rule-completeness.md:81; pattern-debt.md:76 | "Sweep-produced findings only = pure class A; forbidden from inventing (B) findings — these lenses are the A-exemplars." |
| 39 | sub-triager precedence | agents/sub-triager.md:40,57 | "spec-evidence (A) > signal (A-ish) > judgment (B); resists every category = class U (unclassifiable) → user." |
| 40 | sub-recognizer indeterminate | agents/sub-recognizer.md:37,49 | "shape_match_status × confidence is a 2-axis A/B grid; indeterminate = class U." |

**session-lifecycle**

| # | touchpoint | file:line | woven instruction |
|---|-----------|-----------|-------------------|
| 41 | handoff What Remains | handoff/SKILL.md:60-61 | "Tag each remaining item A/B/U; class-B carry-overs are the convergence risk /resume + /retro must see." |
| 42 | handoff Blockers | handoff/SKILL.md:66-67 | "A blocker that is 'missing info / open question' is the class-U meta-case — label it." |
| 43 | handoff tests-passing | handoff/SKILL.md:70-71 | "tests-passing yes/no = A; 'unknown' = class U — don't let it read as no." |
| 44 | retro Gaps & Failures | retro/SKILL.md:72-76 | "Separate class-A gaps (fixable, a check exists) from class-B gaps (recur because no check converges them — need strategy change, not another iteration)." |
| 45 | retro What Drifted / manual | retro/SKILL.md:46,75 | "manual verify verdict = the existing class-B marker — count B-gaps distinctly in metrics." |
| 46 | retro recommendations | retro/SKILL.md:84 | "A recommendation to 'iterate' on class-B work is low-yield — flag it; B needs a different lever." |
| 47 | resume remaining/discrepancies | resume/SKILL.md:56-69 | "Surface class-B remaining items + drift louder at cold start (reads handoff's class tags)." |
| 48 | meta-review skill friction | meta-review/SKILL.md:88-94 | "Diagnosing why a verdict was wrong is class-U detection at the workflow level — note where the tooling itself can't class work." |
| 49 | meta-review coverage gaps | meta-review/SKILL.md:100-104 | "A chain with no skill = a coverage gap; if 'splitting work A/B' is done manually, it surfaces here." |
| — | claude-md-sync | claude-md-sync/SKILL.md | EXCLUDED — findings are A by construction (path/disk match). Stated, not silently dropped. |

**plugin-toolkit**

| # | touchpoint | file:line | woven instruction |
|---|-----------|-----------|-------------------|
| 50 | dry-refactor confidence/substrate gate | dry-refactor/SKILL.md:38-41 | "--override-unverified = proceeding on class-B substrate; the preflight already partitions A (verified) vs B (unverified) — name it." |
| 51 | dry-refactor substrate-stale stop | dry-refactor/SKILL.md:47,92 | "'Can't trust my own evidence' = class U → the existing HARD STOP is the correct U-response." |
| 52 | dry-refactor baseline-test gate | dry-refactor/SKILL.md:48 | "Broken baseline = result unverifiable (B) until fixed — why the gate blocks." |
| 53 | code-glossary verification_status | code-glossary/SKILL.md:118-124 | "verification_status verified = A, quote_drift_detected = B — this is already the per-entry A/B field; reuse it as the canonical host." |
| 54 | code-glossary judge inconclusive | code-glossary/SKILL.md:113 | "distinct/inconclusive judge verdict = class B (couldn't decide) — note in report." |
| 55 | skill-heal GRADE | skill-heal/SKILL.md:60-63 | "Alongside each grade, note whether the proposed fix is class A (lint/length checkable) or B (subjective 'clarity')." |
| 56 | skill-heal ranked fixes | skill-heal/SKILL.md:90-95 | "Rank A-fixes (checkable) above B-fixes (subjective) — A converges, B argues." |
| 57 | docs-audit drift checks | docs-audit/SKILL.md:44-63 | "version/path/missing = class A (deterministic); 'description drift' = class B (judgment) — mark the one fuzzy category." |
| — | version-bump / plugin-scaffold | — | EXCLUDED — output A by construction (semver cascade / scaffold + lint). Stated, not dropped. |

**project-note-tracker**

| # | touchpoint | file:line | woven instruction |
|---|-----------|-----------|-------------------|
| 58 | note research status | note/SKILL.md:23 | "'Pending' = class-B marker (couldn't ground); 'Answered Internally' = A — don't report Pending as answered." |
| 59 | note research-question agent | workflows/research-question.md:44 | "Status reflects what you could ground (A) vs open-for-handler (B) — the skill already enforces context≠answer; name the classes." |
| 60 | note investigate verdicts | workflows/investigate.md:54 | "'Reproduced' = class A (verifiable repro); 'Investigating' = class B (unconfirmed hypothesis)." |

### 8.3 Open considerations (flagged, not silently resolved)

- **Cross-plugin consistency (class B — my judgment, unproven):** per-plugin canon copies risk
  drift. Mitigation = `/docs-audit` learns to check the verifiability statement is present +
  consistent across plugins. Whether that's enough vs a shared file is a genuine unknown —
  decided per-plugin for now because it preserves plugin independence; revisit if drift appears.
- **Does prose instruction actually change agent behavior (class B):** the whole approach rests
  on "agents will read and apply the woven one-liners." Unprovable until a real pipeline phase
  runs post-wiring — this is the design's own largest class-B bet. Cheapest early check:
  after wiring 2–3 touchpoints, run one phase and read whether returns carry the class labels.
- **Naming (class B — your call, deferred):** class A/B/U + "verifiability split" are working
  labels; finalize against the written canon text.
- **Volume (60 edit sites):** exhaustive = ~60 woven one-liners + 6 canon statements. Real
  surface. Sequencing suggestion: canon first (Tier 0), then essense-flow (highest density),
  then the other plugins — verify after each plugin, not at the end.

### 8.4 What is class A vs B in THIS plan (dogfooding)

- **A (read from disk this session):** every file:line in §8.2 — 4 mapping agents cited them.
- **B (judgment, unproven until built/run):** that the woven instructions change behavior;
  that per-plugin canon stays consistent; the naming; whether 60 sites is the right exhaustive
  boundary or some are noise. These are surfaced here, not hidden behind a "done."

---

## 9. REVISED CORE — a `verifiability-lens` agent (instruction alone won't hold)

Feedback: prose instruction won't reliably fire — it asks a busy master to self-classify while
doing its real job. Correct. The fix is the codebase's own answer to "don't trust the master to
self-check": **spawn a small single-purpose agent in a clean context.** essense-flow already
does exactly this — `adversarial-lens` (bugs), `validator` (re-validation), `item-verifier`
(compliance), `alignment-lens` (sub-arch alignment). A `verifiability-lens` is the same mold:
its ONLY job is to partition whatever it's handed into class A / B / U and force the B/U into
the open. Instruction's role shrinks to **(a)** the canon rubric the agent classifies against
(§7.2) and **(b)** the dispatch wiring + gate discipline in masters — both legitimately
instruction, now backed by a real classifier doing the judgment elsewhere.

### 9.1 The agent (sketch — same shape as the existing lenses)

```
name: verifiability-lens
tools: Read, Grep, Glob          # read-only; substrate-verify by reading cited source
agentType pattern: copy adversarial-lens / item-verifier (fresh context, structured return)

INPUT brief:
  unit_type:  spec | task-spec | plan | finding | completion-claim | handoff-item | freeform
  content:    <the thing being said / planned / tested>
  context_refs: <files/paths it touches, for substrate-verify>
  executor_capabilities: <tools the DOWNSTREAM doer will have — esp. Bash y/n>
                         # verifiability is capability-relative (task-agent.md:164 vs
                         # sub-architect.md:200): same claim is A with Bash, B without

OUTPUT (structured):
  items:
    - claim: <verbatim or tight summary>
      class: A | B | U
      check:            <A: the concrete cheap+accurate check that would prove it>
      why_unverifiable: <B: why no cheap accurate check exists>
      missing_to_resolve: <U: the read/tool/context needed to settle A-or-B>
      confidence: high | med | low
  rollup:
    a_count / b_count / u_count
    headline: <the B/U residue — the one thing the consumer must see>

DISCIPLINE (in the agent def):
  - substrate-verify: READ the cited source before classing anything A (existence ≠ check)
  - capability-relative: judge against executor_capabilities, not the lens's own toolset
  - never class U as A — that is the false-clean failure (the whole point)
  - quote-anchor where the unit has a source on disk
  - cheap on pure-A input: return "all-A, no residue" fast; don't manufacture B to look useful

QUORUM: tolerant — a crashed lens becomes a synthetic class-U item
        ("could not classify; needs re-read"), never silently dropped.
```

### 9.2 How it fires "anywhere it's necessary" — two tiers

**Tier A — standalone / general (the "anywhere" the user emphasized).** A slash command
(`/verifiability <thing>`) and direct dispatch by the main agent against any plan, diff, claim,
or "thing I'm about to do." Works in ANY repo, no pipeline needed. This is what the §4 modifier
was reaching for — but as a real classifier with its own context, not a prompt injection.

**Tier B — pipeline gates (auto-fire, deterministic spawn points).** Masters dispatch ONE
**batched** lens call per gate (one agent classifies a whole SPEC / whole task-spec set / whole
findings list, returns per-item — like `extractor`, NOT one agent per item). The rollup folds
into the gate the master already runs, and the B/U residue registers through the EXISTING
`unknowns[]` / `register-add --kind unknown` / context-inject-warning machinery. Gates:

| gate | master | what the lens classifies | B/U residue does what |
|------|--------|--------------------------|------------------------|
| elicit close | elicit | SPEC goals/constraints | inferred-goal (B) → confirm with user before close |
| architect pack | architect | each task spec's acceptance | B/U task → downgrade agency_level, build verifies at runtime |
| build record | build | each completion claim's criteria | criterion not disk-checkable (B) → flag, don't record as passing |
| review/verify | review, verify | each finding/extracted item | B/U finding → route to user, excluded from the A-only gate |
| handoff | handoff | remaining-work + blockers | class-B carry-over → surfaced loud to /resume + /retro |

### 9.3 Controlling cost + "effective" (where it does NOT fire)

The real risk is over-spawning. Three guards:
- **Batch, don't per-item:** one lens call per gate over the whole unit-set (extractor model),
  not one agent per claim. ~1 extra agent per gate; a full pipeline adds ~5–6 — cheaper than the
  per-finding `validator` fan-out already in use.
- **Skip structural pure-A:** the §3d LOW set (version-bump cascade, plugin-scaffold,
  claude-md-sync, deterministic sweeps) is verifiable by construction — a one-line guard skips
  dispatch there. Stated, not silently omitted.
- **Self-skip on clean input:** the lens returns "all-A, no residue" cheaply when a unit is
  fully verifiable, so an over-eager dispatch wastes one cheap call, never a loop.

### 9.4 What this does to the §8 instruction plan

It **shrinks it, doesn't delete it.** Survives from §8:
- **Tier 0 canon (§8.1):** stays — it's the agent's rubric (the A/B/U definitions the lens
  classifies against). One statement per scope.
- **Dispatch + gate discipline:** the per-gate lines in §8.2 become "dispatch verifiability-lens
  here + what to do with the rollup" — ~6 master-side wiring points, not 60 self-classify
  reminders.
Drops/absorbs: the ~54 "remember to self-classify" one-liners at non-gate sites — the agent does
that judgment now. Net: **far fewer edits than exhaustive §8, and the judgment is enforced, not
hoped for.**

### 9.5 Open considerations (flagged, not silently resolved)

- **Capability-relative input is real wiring:** the master must pass `executor_capabilities`, or
  the lens guesses what the downstream doer can run. Without it, capability-relative judgment
  degrades to a default ("assume no Bash") — conservative but noisier.
- **The lens's own output has residual B (honest recursion):** its A-verdicts cite a check
  (verifiable); its B-verdicts are themselves judgment (class B). The lens does not eliminate B —
  it **concentrates the residual B into one auditable place** with rationale, instead of letting
  it diffuse silently across a master's work. That concentration IS the deliverable; claiming it
  removes B would be the false-clean failure it exists to catch.
- **Standalone-first vs gates-first build order:** the user's "anywhere it's necessary" emphasis
  points at Tier A (general standalone) as the first build — it's repo-agnostic, immediately
  useful, and proves the classifier before the heavier per-gate wiring. Tier B (pipeline
  auto-fire) follows once the agent's verdicts are trusted.
- **Hook nudge (optional, secondary):** a deterministic hook can't run an agent, but a
  PostToolUse/Stop hook could *detect* "a plan/claim is being asserted" and nudge ("looks like
  class-B work — run /verifiability?"). Weak signal, cheap; pairs with Tier A. Not core.

### 9.6 Dogfood — A vs B in THIS revision

- **A (read this session):** the lens-agent mold + dispatch + quorum machinery exists — every
  agent def cited in §3 (adversarial-lens, validator, item-verifier, extractor, alignment-lens)
  was read; a new lens reuses their proven shape.
- **B (judgment, unproven until built/run):** that a batched per-gate lens is the right cost
  point; that capability-relative input gets wired cleanly; that the lens's B-verdicts are
  useful vs noise. Settle the first cheaply: build Tier A standalone, run it against one real
  plan, read whether the A/B/U partition is sound before wiring any gate.

---

## 10. AUTOMATIC DISPATCH — the lens must fire itself (no prompt, no wait)

Feedback: the lens must run **automatically, anywhere applicable, without the user prompting or
waiting.** That rules out Tier A (user-invoked) as primary. In Claude Code the only thing that
fires with zero user action is a **hook**. The repo already proves the exact mechanism:
`essense-autopilot` is a **Stop hook** that auto-runs the next pipeline command with no prompt.

### 10.1 Verified mechanism (grounded in this repo's working hooks — not guessed)

| fact | evidence (read this session) |
|------|------------------------------|
| A Stop hook fires at every turn end, no user action | `plugins/essense-autopilot/hooks/scripts/autopilot.js:4-10` |
| It receives the turn's `transcript_path` on stdin → can read what was just produced | `autopilot.js:332` (`payload.transcript_path`), `:160-207` parses the JSONL |
| Continue the SAME session automatically: emit `{decision:"block", reason}` + exit 0 | `autopilot.js:218-221`; CC treats it as "don't stop, act on reason" (`:9-10`) |
| Allow stop: plain `exit 0`; **fail-open on any error** (never block on a bug) | `autopilot.js:209-216, 411-414` |
| Inject text into the next turn's context from a hook's stdout | `hooks/scripts/context-inject.js`, `thorough-mode.js:267` (proven pattern) |
| A hook is plain Node → can `child_process.spawn` a detached process and exit | standard Node; same runtime as the working hooks |

**Unverified (the claude-code-guide agent claimed these; do NOT encode until confirmed against
the installed CC version):** `type:"prompt"` LLM-hooks with a `model` field, the `if:` matcher
field, `claude -p --bare`, `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`, `PostToolBatch`. If `type:"prompt"`
hooks are real, they're the cleanest primitive (a built-in mini-agent per event) — **verify
first**; the design below does not depend on them.

### 10.2 The unavoidable tradeoff — automatic + non-blocking + timely: pick two

| path | automatic? | blocks user? | timely? | mechanism (all verified) |
|------|-----------|--------------|---------|--------------------------|
| **P1 — Stop-hook block+inject** | yes | **yes (you wait)** | yes (before yield) | hook emits `{decision:block, reason:"dispatch verifiability-lens on what you just produced"}`; same session runs the lens, surfaces residue before stopping. Exactly autopilot's mechanism. |
| **P2 — hook spawns detached lens, residue surfaces next turn** | yes | **no (no wait)** | one turn late (post-hoc) | Stop/PostToolUse hook `child_process.spawn`s a detached headless lens over the last turn, writes `residue.json`, exits 0 (allow stop). A UserPromptSubmit/SessionStart hook injects the residue next turn. |

You asked for **automatic + no-wait → P2.** Its cost is "one turn late," which is acceptable for
the dominant case: a class-B/U flag on a *plan* surfaces before you act on the plan next turn; on
a *claim/test* it surfaces before the next step builds on it. The genuine danger P2 can't catch
in time is a false-clean that gets acted on within the same turn — for those few spots, P1 (or an
in-band pipeline gate, §9.2 Tier B) is the right tool. So the answer is **P2 as the ambient
always-on layer, P1/gate-dispatch only where a wrong A-classification would be acted on before the
next turn.**

### 10.3 Architecture (P2 primary)

```
fire points (each a hook with a CHEAP deterministic pre-filter — no LLM in the hook):
  • Stop                      → catches prose plans / claims / decisions (no tool used)
  • PostToolUse: Write|Edit   → catches a plan/spec/code artifact the moment it lands
  • PostToolUse: Bash (test)  → catches a test result / asserted outcome

each hook:
  1. read transcript_path / tool_input  (verified: autopilot.js:332)
  2. PRE-FILTER (deterministic, ~ms): does this turn assert a plan/claim/result?
       no  → exit 0  (allow stop / no-op — the 99% cheap path)
       yes → continue
  3. DEBOUNCE: skip if already classified this content (hash → marker file),
       mirroring autopilot's no-progress guard (autopilot.js:376-395)
  4. SPAWN detached headless verifiability-lens over the captured content,
       write .claude/verifiability/residue-<id>.json, exit 0  (NON-BLOCKING)
  5. set REENTRANCY env flag so the nested lens's own Stop hook no-ops
       (nested claude inherits project hooks — must not recurse)

surface (next turn):
  • UserPromptSubmit/SessionStart hook reads residue-*.json, injects the B/U
    residue as context (verified pattern: context-inject.js), then consumes the file.
    Critical residue (false-clean: a U masquerading as A) injected loudest.
```

The **verifiability-lens agent itself** is unchanged from §9.1 — the hook just spawns it headless
instead of a master dispatching it. The §9.2 Tier-B in-band gate dispatch stays for the few
synchronous-correctness spots (architect must classify specs *before* packing; review/verify
gates). So: **one lens definition, three callers** — hook-spawned (ambient, P2), pipeline-gate
(synchronous, in-band), and standalone `/verifiability` (manual, escape hatch).

### 10.4 Cost + safety guards (the hard part of P2)

- **Pre-filter is deterministic and cheap** — the hook spawns nothing on the 99% of turns that
  assert no plan/claim. Only classify-worthy turns pay for a lens.
- **Debounce by content hash** — never re-classify the same artifact (autopilot's no-progress
  guard is the template, `:376-395`).
- **Reentrancy guard is mandatory** — a spawned headless lens inherits the project's hooks; the
  spawner must set an env flag the hook checks first and no-ops on, or the lens triggers itself.
  This is the single most important correctness detail and an explicit pre-build check.
- **Fail-open everywhere** — every hook path falls through to `exit 0` on error, per autopilot's
  discipline (`:411-414`). A broken lens must never block or slow a turn.
- **Cheap model for the lens** — classification is light; run the headless lens on a fast/cheap
  model. (The guide-agent suggested Haiku; confirm the model-selection flag before encoding.)
- **Opt-in default** — gate the whole thing behind a config flag (autopilot ships disabled by
  default, `autopilot.js:62` `enabled:false`); same posture here.

### 10.5 Open / must-verify before build (flagged, not assumed)

- **C-U (must verify):** whether spawning a detached `claude -p` from a hook works cleanly in the
  installed CC version, the exact headless flags, and the model-selection flag. The whole P2 path
  rests on this — **confirm by a one-shot spike** (a trivial hook that spawns `claude -p "echo
  test" > out.json &` and checks `out.json` appears) before building anything real.
- **C-U (must verify):** whether `type:"prompt"` hooks exist — if so, they replace the
  spawn-headless plumbing in step 4 with a built-in mini-agent (much simpler). Verify first.
- **C-B (judgment):** "one turn late" is acceptable for planning/claims — true for the dominant
  case, but the few same-turn-acted-on spots need P1/gate. Which spots those are is a per-phase
  call to make when wiring.
- **C-B (judgment):** the pre-filter's "is this classify-worthy?" heuristic — too loose spawns
  lenses constantly (cost); too tight misses real B work. Needs tuning against real transcripts,
  not guessable up front.
- **Reframed build order** (supersedes §9.5's standalone-first, given the no-wait requirement):
  1. **Spike the feasibility unknowns** (headless-from-hook + `type:prompt`) — cheapest, unblocks
     everything; if headless-from-hook fails, P2 is dead and the answer falls back to P1.
  2. **Build the verifiability-lens agent** (§9.1) + the standalone `/verifiability` so its
     verdicts can be eyeballed in isolation.
  3. **Wire P2 ambient hooks** (Stop + PostToolUse) with pre-filter + debounce + reentrancy guard,
     opt-in, on this repo first.
  4. **Add in-band gate dispatch** (§9.2 Tier B) only at the synchronous-correctness spots.

---

## 11. LOCKED — P1 (Stop-hook block + in-session lens). Build plan.

Decision (user, this session): **P1 — automatic via Stop hook, blocks the turn, runs the lens
in-session before yielding. User accepts the wait for better results.** P1 is fully verified
(autopilot uses the exact `{decision:"block"}` mechanism, `autopilot.js:218-221`) — the §10.5
feasibility spike is moot. P2 + §4 layers retained as documented alternatives only.

### 11.1 P1a vs P1b — who classifies

| | P1a — main agent self-classifies | P1b — main agent dispatches the lens subagent |
|--|----------------------------------|----------------------------------------------|
| mechanism | hook's `reason` tells the main session to do the A/B/U split inline | hook's `reason` tells the main session to spawn `verifiability-lens` (Agent tool), which classifies in a CLEAN context, returns residue; main surfaces it |
| quality | main context is already loaded with the work — judgment can be motivated-reasoned ("I built it, it's fine") | fresh context, single job = the classifier's whole point; matches why the pipeline offloads review to lenses |
| cost/wait | cheaper, less wait | a subagent round-trip = more wait |
| verdict | **forced** every applicable turn (not relying on the agent remembering) — better than pure instruction, but still self-review | the faithful design |

**Recommend P1b** — the user chose to wait for *good results*, and clean-context classification is
the entire reason an agent beats instruction (§9). P1a is the documented cheaper fallback.

### 11.2 The hard part — fire-exactly-once loop guard

A Stop hook fires every turn. It must block **once** per classify-worthy unit, then allow the
stop after the lens has run — else infinite block. Sequence under P1b:

```
main produces a plan/claim  → Stop fires
  → pre-filter: classify-worthy?  no → exit 0 (allow, no wait)   yes ↓
  → debounce: marker exists for hash(triggering-content)?  yes → exit 0 (allow) ↓ no
  → write marker keyed to hash(triggering-content)
  → emit {decision:"block", reason:"dispatch verifiability-lens over <content>, surface A/B/U residue"}
main dispatches lens (Agent) → lens runs (this is SubagentStop, NOT our Stop) → main surfaces residue → main yields
  → Stop fires again → pre-filter yes → debounce: marker for SAME hash exists → exit 0 (allow). Done.
```

- **Hash the *triggering* content** (the plan/claim span), not the whole turn — it persists across
  the block→surface→yield cycle so the second fire matches and allows. (Autopilot's no-progress
  guard, `:376-395`, is the structural template: persist a marker, compare next fire.)
- **`stop_hook_active`** in the payload is the secondary guard (verify the field name against the
  live payload before relying on it — autopilot reads `transcript_path`, not this field, so it's
  unconfirmed here).
- **Fail-open:** every error path → `exit 0` (allow stop), per `autopilot.js:411-414`. A broken
  guard must release the turn, never trap it.

### 11.3 Home — a new self-contained plugin

The lens is **general** (fires anywhere, not essense-flow-specific). It ships an agent + hooks +
a command + config — a full plugin's worth. **Recommend a new plugin** (working dir
`plugins/<name>/`), matching the repo's one-concern-per-plugin pattern, rather than bolting onto
thorough-mode (UserPromptSubmit-injection only, no agent) or essense-flow (pipeline-scoped).

### 11.4 Build plan (@build — MODIFY / ADD, ordered, each with a verifiable check)

**ADD — new plugin `plugins/<name>/`:**

| artifact | shape | verifiable check |
|----------|-------|------------------|
| `.claude-plugin/plugin.json` | metadata (name, version 0.1.0, agents+hooks+commands paths) | plugin loads; `marketplace` lists it |
| `agents/verifiability-lens.md` | the §9.1 agent: Read/Grep/Glob, structured A/B/U return, discipline (substrate-verify, capability-relative, never-U-as-A, quote-anchor), quorum tolerant | `/verifiability` against a sample plan returns a per-item A/B/U partition with a check (A) / reason (B) / missing (U) each |
| `hooks/hooks.json` | registers the Stop hook (PostToolUse deferred to a later step) | hook registered; fires on turn end |
| `hooks/scripts/verifiability-stop.js` | Stop hook: read `transcript_path`, pre-filter, debounce-by-hash, block-once, fail-open (mirror autopilot structure) | pipe synthetic transcript w/ a plan → stdout `{decision:"block"}`; pipe again w/ marker set → `exit 0`; pipe trivial turn → `exit 0` immediately |
| `commands/verifiability.md` | `/verifiability <thing>` standalone (the manual caller + isolation test harness for the lens) | runs the lens on demand |
| `defaults/config.*` | **opt-in** flag (default OFF, like `autopilot.js:62`) + pre-filter tuning knobs | flag OFF → hook no-ops; ON → fires |
| `README.md` + `RELEASE-NOTES.md` + `CLAUDE.md` | docs | present, describe the mechanism + the P1 wait tradeoff |

**MODIFY:**

| file | change | check |
|------|--------|-------|
| `.claude-plugin/marketplace.json` | register the new plugin | lists it; version matches |
| `.claude-plugin/plugin.json` (bundle) | add the agent/command/hook paths + description | bundle references the new agent |
| root `CLAUDE.md` | architecture entry + plugin table row | reflects the new plugin |

**DEFER (own gate):** §9.2 Tier-B in-band gate dispatch in essense-flow; PostToolUse fire points;
P1a fallback; the §4 schema deepening. Ship the ambient Stop-hook + lens + command first, prove it
on this repo, then widen.

### 11.5 Build order (small, verified steps)

1. **✅ DONE (v0.1.0) — Lens agent + `/verifiability` + rubric + recipient profile.** Plugin
   `plugins/verifiability-lens/` created, registered in marketplace.json, JSON+YAML validated.
   **Isolation test PASSED:** an agent ran the rubric against a known-class sample plan (A/B/U +
   trivial + context-less + a U-trap) — caught the migration false-clean as U not A, escalated the
   two important+actionable items with defaults+context, suppressed the trivial, auto-resolved the
   context-less choice with a logged default. Partition sound; never-context-less rule held.
   Known judgment seam (expected, §12.6): U-with-feasible-check → escalate vs auto-resolve, resolved
   cleanly by importance × actionability.
2. **✅ DONE (v0.2.0) — Stop hook + pre-filter + loop guard, opt-in OFF.**
   `hooks/scripts/verifiability-stop.js` (+ .sh wrapper + hooks.json). Deterministic pre-filter
   (claim/plan/code-write), fire-exactly-once guard (force-release after block + content-hash
   skip), fail-open, opt-in via `.claude/verifiability-lens.json`. **13/13 unit tests pass**
   (`tests/verifiability-stop.test.js`) + **process-level smoke pass** (spawn real hook: fire1
   block → fire2 release → fire3 no-loop → disabled allow → state persisted).
3. **Live in-session enablement — USER'S to flip.** Opt-in OFF; enabling affects the live session,
   so it's the user's switch (`.claude/verifiability-lens.json` `{"enabled":true}`). The process
   smoke is the strongest check short of a live plugin reload. *Check: enable → next classify-worthy
   turn blocks once, lens runs, surfaces, clean yield.*
4. **✅ DONE — Docs + version cascade.** plugin.json + marketplace.json bumped to 0.2.0; mk-cc-all
   bundle + marketplace note verifiability-lens as hook-carrying (separate install); README +
   RELEASE-NOTES + plugin CLAUDE.md + root CLAUDE.md updated; runtime state already gitignored
   (`.claude/*`). *Check: all JSON valid; root CLAUDE.md architecture tree + plugin note added.*

### 11.6 Naming (still open — needed to create the plugin dir + files)

Working label "verifiability-lens" / class A/B/U. Final name drives the plugin dir, agent name,
command, config keys. User to pick before step 1 creates files.

---

## 12. SECOND PILLAR — audience-aware surfacing (pick up the slack, protect attention)

User requirement (2026-06-20, flagged "very important"): the system must know **who it serves**
and **pick up all the slack everywhere** — surface only important, simple, self-contained items
with everything needed to understand them; never bother the user with small things or with
decisions they can't make without context they lack. The user self-describes as time-poor and
won't always load deep context (now standing fact #9 in `user-claude-usage-style.md`).

This is a distinct pillar from the lens. **The lens DETECTS uncertainty (A/B/U). Surfacing DECIDES
what to do with it.** They pair: detection is useless if it floods the user with every B/U item;
slack-pickup is the delivery half.

### 12.1 The escalation triage (the core new logic)

For every item the lens flags B/U (and every important A-risk / finding anywhere), route it to
exactly one of three lanes:

| lane | when | action |
|------|------|--------|
| **auto-resolve** | the system can settle it: research-first reaches an answer, or a defensible default exists | resolve it, log it, **inform in one line** — do not ask. (librarian.md:42 "a ratified `suggested_default` is an answer".) **DEFAULT bias for this user.** |
| **escalate-with-context** | important AND genuinely needs the user's judgment (product intent, a trade-off only they own) AND they can act on it | surface — but **bundle full context inline**: plain-language *what*, *why it matters* (1 line), the options, a **recommended default first**. One batched gate, not per-item (librarian.md:37-40). |
| **suppress** | small / low-impact / reversible-and-cheap | record to a log; **never interrupt.** |

Gating is **importance × actionability**, both required to escalate:
- **importance** (closed set `critical | important | minor`): does it block convergence, touch
  correctness or user-intent, and is it costly to reverse? Only `critical`/`important` can escalate.
- **actionability-with-context**: can the user decide it *from the bundled context alone*? If not,
  it CANNOT be a bare question — either the system supplies the context or it auto-resolves and
  informs. **Hard rule: never hand the user a context-less decision.**

### 12.2 Recipient profile (who-uses-it) — config, not hardcoded

The triage thresholds + rendering are tuned by a **recipient profile** — a config block, NOT
baked into code (honors the repo's "never hardcode personal setup details" rule). Profile fields:
`verbosity` (terse), `context_appetite` (low — bundle everything, assume no digging),
`escalation_floor` (high — only important+), `default_bias` (aggressive auto-resolve),
`render` (plain language, recommended-default-first, bottom-up — matches usage-style #8). Ships
with a default profile matching this user; adjustable per project / per user.

### 12.3 Where it plugs in — everywhere a decision/finding reaches the user (exhaustive)

Surfacing is its own cross-cutting discipline — like the lens, **stated once, applied at every
user-facing gate.** The canonical home already exists: **`librarian.md` §3 "Surface at the gate"**
is the marketplace's surfacing protocol (bundle at gates, research-first, ratify-a-default). The
triage + recipient-profile + never-context-less-decision rules are an **extension of it**, not a
new system — same delta pattern as the lens extending unknowns[].

| surfacing point | file:line | what the triage adds |
|-----------------|-----------|----------------------|
| librarian unknowns gate (the canon) | librarian.md:37-43 | the 3-lane triage + recipient profile + hard never-context-less rule; bias to auto-resolve for a low-context-appetite user |
| every `AskUserQuestion` in skills | elicit, triage, architect gates, heal, the lens | rendering discipline: important-only, recommended-default-first, full context inline, batched |
| review/verify gates → user | review/SKILL.md:300; verify/SKILL.md:121 | confirmed-critical reaches user **with context bundled**; B/U auto-defaulted where safe, suppressed where minor |
| triage ambiguous → user | triage/SKILL.md:98 | only escalate if user-actionable-with-context; else research/default |
| handoff / retro reporting | handoff/SKILL.md:60-67; retro/SKILL.md:72 | report only important; suppress small; class-B carry-overs get the context bundle |
| the lens's own residue (P1 surface) | §11 | the headline to the user is the **triaged** important B/U only — auto-resolved items logged, minor suppressed, never a raw A/B/U dump |

### 12.4 How it couples with the lens (one flow)

```
lens classifies work → A / B / U items
        │
        ▼
surfacing triage (recipient-profile-tuned)
   A items + minor B/U          → suppress / log (no interrupt)
   B/U the system can settle     → auto-resolve (research / default) → inform 1 line
   important B/U, user-actionable → escalate ONE batched gate, full context, default-first
```

So the user sees: a short, plain, self-contained list of only the things that genuinely need them
— each understandable without digging, each with a recommended default they can just accept.
Everything else the system absorbs. That is the "pick up the slack" deliverable.

### 12.5 Build-plan additions (fold into §11.4–11.5)

- **ADD** to the plugin: a `recipient-profile` config (default profile = this user) + the triage
  logic in the lens agent's output contract (every B/U item carries `lane`, `importance`,
  `actionable_with_context`, and for escalations `why_it_matters` + `recommended_default` +
  `context_bundle`).
- **MODIFY** (deferred, own gate): extend `librarian.md` §3 with the triage + never-context-less
  rule so the whole pipeline's surfacing inherits it; apply the rendering discipline at the
  existing AskUserQuestion sites (exhaustive, per §8).
- **Build-order insert:** after §11.5 step 1 (lens works), add **step 1.5 — the surfacing triage +
  recipient profile**, tested in isolation: feed the lens a mix of trivial + important B/U,
  confirm only the important+actionable surfaces, with context bundled and a default; the rest is
  logged/suppressed. *Check: a known-trivial B item does NOT surface; a known-important one does,
  self-contained.*

### 12.6 Open / flagged

- **C-B (judgment):** importance scoring and the escalation floor are judgment-laden — too high
  and real decisions get auto-defaulted wrongly (silent); too low and the user gets bothered.
  Tune against real runs; the recipient profile makes the floor adjustable rather than guessed.
- **C-U (must verify when building):** "auto-resolve with a default" must itself be logged
  visibly (the user can audit what was decided for them) — silently deciding is the failure mode
  the verify-don't-claim value (#1) forbids. The log is the safety valve; design it so a
  glance shows every default the system took.
- **Tension with the lens's own honesty:** auto-resolving a class-B item means acting on
  something unverifiable. That's allowed ONLY with a logged defensible default + a way to revisit —
  never silent. The surfacing layer must not become a way to bury B work it should have shown.

