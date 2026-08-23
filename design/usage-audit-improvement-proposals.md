# Usage-audit improvement proposals — kb / steward / turn-end

> **RE-DERIVED 2026-08-23 (same day):** the owner judged these six themes patch-shaped and
> asked for the whole-system design. That re-derivation is `design/logbook-spine.md` — the
> themes below survive as its verified MECHANICS (§7 there maps each), but the architecture
> and staging live in the spine doc. Read that first; this doc remains the evidence record
> for the prototypes and per-theme verification.

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

> **Provenance:** Claude proposals, 2026-08-23, derived from the four-project usage audit
> (evidence: `.steward/inbox/20260823-1330-four-project-plugin-usage-audit-findings.md`).
> Owner has decided NOTHING here. Substrate claims verified against source this session:
> `steward-brief.js` (raw `payload.cwd`, `endsWith('.md')` counter, no freshness check),
> kb hooks (`process.cwd()` ×3), `markdown-dir.js:273` (`path.resolve` accepts absolute dirs),
> kb `CLAUDE.md` (0.10.2 fixed digest rotation; roadmap items 2/3/4 pending).

Design rules applied throughout: generalize-first (name the category, build the open base),
cheapest-substrate-first (deterministic > LLM), cross-plugin duplication over shared modules
(capture 20260728-0430), any alternative brings its own measured number.

---

## Theme 1 — Freshness contracts for derived surfaces (the staleness class)

**Category:** any artifact derived at time T and later presented as "now". Audit instances:
steward briefing (wrong in all 4 projects), state.md position claims, tasks.md completed-task
instructions, `.claude/prompts/INDEX.md`, doc tables (docs-audit's territory). The class is
"materialized view without invalidation" — the fix is a freshness contract, not a better writer.

**Rung 1 — presenter-side staleness stamp (deterministic, hook).** `steward-brief.js` compares
`briefing.md` mtime against the newest event mtime it can read for free (top-level `inbox/*.md`,
`log.md`; optionally `.git/HEAD` target file mtime — fs reads only, no child process). If newer
events exist: prefix one line — `⚠ briefing generated <date>; N newer event(s) since — treat
position claims as stale`. Zero LLM, ~3 stat calls. Same pattern available to any injector
(kb digest already rotates by sitting; lens briefing if ever revived).
*Check:* unit test — briefing older than an inbox item ⇒ stamp line present; fresh ⇒ absent.

**Rung 2 — move volatile claims out of the written text.** The claims that keep going stale are
a closed set of CLASSES: git position, install versions, counts, test tallies. Convention change
(agents/steward.md + briefing spec): the agent writes durable narrative only; volatile position
facts are either omitted or computed by the hook at injection (inbox count already is). The
false-install-claim defect becomes structurally impossible for computed classes.
*Check:* briefing spec lists the banned volatile classes; agent test fixture regenerating a
briefing containing "installs on X" fails review.

**Rung 3 — verification-scope patch (the "verify what you write" hole).** agents/steward.md
Economy section: a claim REWRITTEN or carried forward into a regenerated file counts as
written — one targeted read of its authoritative substrate (installs → installed_plugins.json,
refs → .git refs, counts → readdir) or drop the claim. Keeps the 0.3.0 budget; widens scope
only to claims the pass actually emits.

## Theme 2 — Root-anchored state, everywhere (the cwd class)

**Category:** any write resolving a relative path against the shell's cwd. turn-end fixed
itself in 0.4.1 (`resolveProjectRoot`: nearest ancestor with `.git`, HOME-guarded). Still
exposed: kb hooks (`process.cwd()` in kb-pull.js:150, kb-session-start.js:261,
kb-scribe-stop.js:246), steward-brief.js (raw `payload.cwd`), and the steward PROTOCOL text
itself — the session's `Write` to `.steward/inbox/...` resolves against wherever the shell sits
(measured casualty: aithseis `build-and-sell\.steward\inbox\20260813-0530-...md`, invisible to
the real model).

**Moves (each independent):**
1. Duplicate `resolveProjectRoot` into kb hooks + steward-brief (per-plugin copy, kept in step
   by hand — the cap-block precedent).
2. One clause in the injected steward protocol line: capture path is `<git root>/.steward/inbox/`.
   Cheap, closes the live protocol-level leak.
3. Orphan detector, cheapest viable: the steward AGENT's integrate job gains a step — glob for
   `**/.steward/` below root (bounded depth, skip node_modules/Library) and surface any stray as
   a diff line ("orphan model state at X — merge or delete"). Agent-side, so no session-open cost.
*Check:* fixture repo with a nested `.steward/` ⇒ integrate diff names it; kb hook test opens
from a subdir ⇒ state lands at root.

## Theme 3 — The inbox item as a lifecycle contract (can't-delete + counter drift)

**Category:** staged-item lifecycle: pending → integrated (tombstone) → swept. Today three
consumers disagree on "what is a pending item": steward-brief counts every `.md`
(steward-brief.js:114 — source of twin-game's tombstoned-README workaround), turn-end's
steward-sync counts top-level non-dot `.md` (better, still tombstone-blind), the agent writes
`# CONSUMED` stubs it cannot delete (crowd-game stub sat forever; this session deleted one by
hand).

**Contract:** PENDING ⇔ top-level non-dot `.md` whose first line does NOT start with a tombstone
marker (`# CONSUMED`). Both counters adopt it (duplicated predicate + mirrored tests). Deletion
becomes cosmetic: the steward-sync ask (or session wrap-up) sweeps tombstones opportunistically.
No new agent permissions; the visible-trace property survives.
*Check:* both suites — inbox holding done/, .gitkeep, one CONSUMED stub, one real item ⇒ count 1.

## Theme 4 — Close the pull gap where pull pays (the kb half-success)

The audit answers kb roadmap gate 1 (dogfood): mid-work deliberate pull is rare
(auto:manual — twin 89:15, aithseis 76:5, crowd 122:0); push demonstrably fed reasoning.
Conclusion: don't moralize sessions into querying — add fire-points at the moments a query
pays, and measure.

1. **Fire-point ladder (open surface).** Existing points: prompt (kb-pull), session-open
   (kb-session-start), turn-end (context-recall). Missing: MID-turn decision moments. Concrete:
   a pre-write fire-point — reuse-gate's exact pattern (PreToolUse, once per user message,
   fail-open, opt-in) scoring the target file's path+topic against KB titles via the existing
   ranker; one hint line when it clears the floor. This is kb roadmap item 4's PreToolUse leg
   with reuse-gate as the proven pre-filter shape. Extension surface: fire-points as config
   entries over one scoring engine, not new hooks per idea.
2. **Measure hint-follow-rate before building more.** trace.jsonl already holds hints-fired
   and kb_read/kb_query calls. A small `bin/kb.js stats` (or plugin-toolkit script) computes:
   hints shown → hint followed within the session; recall-supplied files that duplicate ignored
   hints (the measured miss). Gives the owner-required number to judge whether the gap even
   costs anything. *Check:* run over twin-game's real trace; report follow-rate.
3. **Un-gate roadmap rung 2 (characterization/enrichment pass)** — its evidence gate
   ("show where lexical matching fails") is satisfied by aithseis capture
   `20260727-kb-probe-and-abbreviation-rules.md` (YC/"Y Combinator" zero-hit; slug-query
   pseudo-verification). LLM-once-at-index, cached by content hash, query stays deterministic.
4. **Teach the narrowing loop ambiently:** when kb-pull's floor cuts hints, append the one-line
   "N more held back — kb_query '<facet>'" nudge the engine already computes for MCP callers.

## Theme 5 — Fleet caste store: the upstream feedback channel

**Category:** knowledge wider than one project. The caste axis (session→thread→project→fleet→
owner) SHIPPED for this and is unused above project. Downstream projects patched plugin defects
locally (gitignore litter rules, inbox tombstones, protocol workarounds) and the signals reached
mk-cc-resources only via this audit.

**Proposal:** a home-anchored store `~/.claude/kb/fleet/` shipped as a default source
(markdown-dir; `path.resolve` at markdown-dir.js:273 already accepts absolute dirs — needs only
`~` expansion for a portable committed default; home-anchored precedent exists:
`~/.claude/kb/cued.json`, `~/.claude/steward/fleet.json`). kb-capture skill gains a routing
rule: tool/plugin friction or cross-project knowledge → `caste: fleet` → home store. Every
project's kb-pull then surfaces fleet entries; mk-cc-resources sessions see downstream friction
the day it's filed. Future `org` caste = another config entry, no new mechanism.
*Check:* capture filed from a consumer project fixture; kb_query in a second project returns it
with caste fleet; kb-pull hint fires on a matching prompt.

## Theme 6 — Self-enforcing format contracts (drift class)

1. **Frontmatter drift** (2 frontmatter-less captures found): `collectAll` already reports
   per-source errors; extend with WARNINGS — entry missing frontmatter in a frontmatter-expected
   source ⇒ warning surfaced in `kb_overview` + session-start line ("2 captures untyped").
   Never fatal (per-file override fallback is by design); just visible.
2. **Digest-bloat guard** (aithseis broke its own pointer-file rule): turn-end's session-digest
   duty gains a deterministic satisfied() leg — digest over a size budget ⇒ the ask says
   "compress: it is a distillation, not a log" (the duty text already says this; the check makes
   it bind). Budget config-overridable like everything else.

## Already fixed — no action (recorded so nobody re-derives)

- Stop-hook timeout self-kill: fixed 0.3.1 (timeout 90); live-proven in twin-game (52 judge
  supplies, 0 errors) + this repo today. crowd-game unproven only because dormant.
- Judge-child digest rotation + stale sitting marker: fixed kb 0.10.2 (MK_TURN_END_DEPTH
  children stand down; minutes-fresh digest never rotates).

## Explicitly NOT proposed

- A shared cross-plugin library for resolveProjectRoot / cap-block / inbox predicate —
  independence of installs wins (capture 20260728-0430); duplicate and mirror-test.
- Giving the steward agent delete powers — tombstone-aware counters achieve the outcome with
  no new capability surface.
- An LLM-side staleness judge — every staleness check above is stat-call arithmetic.

## Verification results (2026-08-23 — prototypes run against the four projects' REAL state)

Each mechanism was prototyped and executed; verdicts compared against the audit's hand-derived
ground truth. Script basis: temp prototypes (staleness stamp, resolveProjectRoot replay,
tombstone predicate, follow-rate calc, fleet-source e2e via `bin/kb.js`).

- **Theme 1 staleness stamp — CONFIRMED, not speculated.** fs-only prototype (briefing mtime vs
  inbox/log/.git-HEAD-ref mtimes) reproduced all four known verdicts with the exact evidence the
  audit found manually: mk-cc STALE by exactly the 1 new audit-findings item; twin STALE
  (2 inbox + log + git-HEAD — the "froze 8 commits behind" case); crowd STALE (4); aithseis
  STALE (11 — the 10-item backlog + log). Break case: fresh fixture ⇒ FRESH. Nuance discovered:
  the stamp should reuse Theme 3's predicate so tombstones don't count as "newer events"
  (crowd's flagged list includes the CONSUMED stub) — themes 1+3 compose.
- **Theme 2 root anchoring — CONFIRMED.** turn-end's exact resolveProjectRoot logic
  (turn-end.js:41) replayed from the three REAL stray-write origins resolves each to the correct
  repo root (aithseis/build-and-sell → aithseis; crowd Assets\Tests\Agents and .steward\inbox →
  crowd root). Limits, stated: a cwd outside any repo falls back to itself, and the
  crowd-gamecrowd-game doubled-path bug is a different class (essense-flow path concat) this
  does not fix.
- **Theme 3 tombstone predicate — CONFIRMED on real inboxes.** crowd: naive 2 vs contract 1,
  correctly isolating the real CONSUMED stub (the exact divergence twin-game worked around);
  other three projects unchanged (no false positives). Fixture break cases pass. NEW REQUIREMENT
  found: `CONSUMED` appears NOWHERE in the steward plugin — the marker is ad-hoc agent behavior;
  the contract must pin the marker spec in agents/steward.md, not only fix counters.
- **Theme 4 follow-rate metric — COMPUTED from real traces** (feasibility proven): reads that
  followed a hint = mk-cc 3/3, twin 5/6, aithseis 3/3, crowd 0/0; self-initiated kb_query =
  1/9/1/3. Reading: the push→pull funnel WORKS (nearly every deliberate read was hint-initiated);
  the gap is self-initiated querying, which is what the pre-write fire-point targets. Prototype
  metric is coarse (hint-any-time-earlier, no session window) — refine before trusting deltas.
- **Theme 5 fleet store — E2E PASS TODAY, zero code changes:** absolute-dir source in
  `.claude/kb.json` collects, ranks, and caste-filters through the real CLI (`caste: fleet`
  already in shipped defaults, registry.js:32). TWO enablers confirmed needed: `~` expansion for
  a portable shipped default, and — caught by the break case — a MISSING source dir is silently
  empty (no per-source error surfaces), violating the plugin's own "nothing fails silently"
  convention; the fleet default must ship with a visible missing-dir note or it will break
  invisibly on machines without the store.
- **Theme 6 — not prototyped** (trivial mechanics: warning list + size compare); feasibility
  asserted, flagged as the one unverified theme.
- **Genericity (the not-a-patch test — one mechanism, N real instances):** T1 one mtime-compare
  diagnosed 4 different staleness shapes; T2 one function covers 3 real strays across 2 plugins'
  state classes and is already production-proven by turn-end 0.4.1; T3 one predicate serves 3
  consumers (brief hook, steward-sync duty, agent); T4 one metric ran unchanged on 4 corpora;
  T5 reuses the existing caste axis + source type — no new concepts anywhere.

## Suggested order (cost × pain)

1. Theme 1 rung 1 + Theme 3 (small, deterministic, kill the two most user-visible daily paper cuts)
2. Theme 2 moves 1–2 (closes the live orphan class)
3. Theme 4 item 2 (measure before building more pull surface)
4. Theme 5 (new capability, medium)
5. Theme 1 rungs 2–3, Theme 2 move 3, Theme 4 items 1/3/4, Theme 6 (as evidence directs)
