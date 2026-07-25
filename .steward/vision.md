# Vision — mk-cc-resources

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## Core idea

The owner's Claude Code plugin marketplace — the toolkit that makes Claude the owner's
best ally for turning ideas into well-built software (optimal code + docs + everything
needed). Public repo, but built first for the owner's own ~40 production codebases.

## The active thrust (2026-07-21)

**Continuous transformation** (`design/continuous-transformation.md` v3 — design source
of truth). The toolkit is pivoting from phase-ceremony (essense-flow pipeline) to the
**steward loop**: a per-project living model + inbox, recomputed on every input, with
pull-based owner-present work. Ceremony retires (Phase E); the craft survives inside
steward + executor protocols. The classic pipeline stays available, no longer the
recommended path once the transition completes.

The loop now has BOTH context directions (owner direction, 2026-07-24): the long-lens
tools (steward, verifiability-lens) PUSH a fixed briefing at session open; **kb** is the
permanent PULL surface — a session asks for exactly what it needs, when it needs it
(kind x caste axes, MCP/skill/command/CLI reach). Steward stays the sole writer of
`.steward/`; kb reads it downstream. Push what's always needed, pull the rest — this is
the session-scope answer to "the big tools handle too much context to help in one
session."

## Who it serves

- The owner, primarily — real projects (crowd-game, EMDE, psience, Binance tooling…).
- Public marketplace users, secondarily — plugins must stay portable, no personal setup
  details in shipped files.

## Invariants (must stay true)

1. **No work in the owner's absence — ever.** Autonomy in DEPTH, never in TIME. The ship
   never moves unseen. Absent-owner = inbox staging only, permanently. (Owner: "this can
   never happen.")
2. **Situational awareness IS engagement.** Every integration shows a short, concrete,
   why-first diff. If the owner can't say where the ship is, the artifact failed.
3. **Mechanisms, not text.** Disciplines become hooks/gates/roles, not preached rules.
   (Owner: "if you just add the line somewhere, you're not gonna respect it.")
4. **Recompute, never accrete.** Re-derivation over patching, at every altitude —
   turn, code, project, and this repo's own design docs.
5. **Per-task cost budget:** one build pass + deterministic checks + max one review
   pass. Nothing loops. Tool quality×cost is a first-class design constraint —
   deterministic > LLM, fold > add, fire conditionally.
6. **Zero added memory load.** Interfaces attach to motions the owner already makes;
   slash commands are optional aliases, never required vocabulary.
7. **Decoupled + open-for-extension code**, enforced by measurement (`runner coupling`,
   `runner extensibility`), not by instruction.
8. **Fail-soft hooks.** Advisory injections never block tool calls; silent where they
   don't apply.

## Declared growth axes (change expected here)

- New plugins / prompt modifiers (protocol-shaped injection convention is the drop-in
  surface).
- Steward verbs beyond seed/brief/sync/next (/discuss, /test, /work — Phase B).
- External-project generalization of the steward loop (mk-cc-resources = Phase 0
  pilot; crowd-game seeded 2026-07-21, running in parallel; EMDE/psience next).
- Glossary engine language coverage (Python/TS/JS/C# today; extensibility measure is
  C#-only MVP).
- Lens firing economics (Phase C: hand-back + risk-triggered, not per-turn) — kb is now
  an instrument here: pull replaces push wherever a session can ask instead of being fed.
- kb axes are drop-in surfaces: new kinds (working unwritten), castes, source types
  (`markdown-dir` is the first), rankers (`term-overlap` is the first), and adapters
  (MCP/CLI are peers over one facade). Retrieval improves along an ANSWERED 3-rung
  ladder (Q9, 2026-07-25): deterministic term-overlap upgrades (rung 1 SHIPPED, kb
  0.4.0) → characterization pass → embeddings — each rung evidence-gated on real
  corpora (crowd-game seed is the first gate). Still parked: kb_capture MCP write
  tool, session journal + hooks.
