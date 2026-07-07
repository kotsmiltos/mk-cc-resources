# Generativity protocol — FORK → BOTH → ABSTRACT → GENERALIZE → DECOUPLE → IMPLEMENT

Canonical source. Skills cite this file at the moment a design fork is decided
(architect decide-step, elicit growth-axes declaration, build mid-flight fork routing) —
never duplicate the protocol text. Per `references/principles.md`
`## Read This Before Doing Anything` (propagation requirement: descendants cite, don't copy).

## Why this exists

An abstract "be generic" principle under-fires — it drifts out of working memory exactly
when the fork is being decided. This file is the rung-2 form: a concrete, ordered protocol
referenced at the design moment. The rung-4 backstop already ships: architect-alignment
**criterion 9** (`agents/essense-flow-architect-alignment-lens.md`) catches a closed
dispatch on a declared growth axis at design-review time. This protocol fires earlier —
before the design is even drafted — so criterion 9 finds nothing to flag.

## The protocol (ordered — run BEFORE writing any implementation design)

When a design fork appears — "should it do X or Y for different goals?", "email or slack?",
"apply-once or continuous?" — the answer is not a pick. Run these steps in order:

1. **FORK** — detect it. A request for ONE INSTANCE of a category (a notifier, a buff,
   a format, a job kind) is a SAMPLE, not the shape. Name the category; enumerate 3-5 real
   + plausible variants, including wild ones ("what else could ever exist here?").
2. **BOTH** — assume both (all) branches of the fork are needed. Do not ask the user to
   pick between two narrow models; when the honest answer is "both, generically," it is.
3. **ABSTRACT** — extract the shared flow: what is common across every variant, what varies.
4. **GENERALIZE** — design the OPEN base along the axis of variation: the generic core that
   supports ALL enumerated variants at once without knowing which is installed.
5. **DECOUPLE** — name the contract/interface a variant binds to (an extension seam:
   strategy contract, registry the dispatcher iterates, polymorphic method). Variants are
   drop-ins; adding one never edits the base. This is criterion 8's clean-contract rule
   plus criterion 9's seam-exists rule, applied at authoring time.
6. **IMPLEMENT** — only now: build the base + 1-2 starter variants as drop-ins. Never ship
   the single requested instance AS the architecture.

If a genuine fork remains after step 5, present the OPEN model and ask the user about the
EXTENSION SURFACE (what the contract should cover) — never "A or B" between narrow models.

## Anti-signals (stop; restart at step 1)

- Typechecking / switching on a concrete subtype where a contract belongs.
- Hardcoding a concrete target type where an interface belongs.
- About to ask "should it be A or B?" when the honest answer is "both, generically."

## Default-closed guard (do NOT force polymorphism on a stable axis)

Mirror of criterion 9's `growth_evidence` precondition — the protocol fires only on a
**declared or domain-intrinsic growth axis** (SPEC/REQ frames the family as open-ended /
"more coming" — the canonical source is SPEC.md's **Declared growth axes** list — or the
family is intrinsically open: plugins, formats, entity kinds). No growth signal → the fork
is a genuine closed choice: decide it once, with rationale, and move on. Explicitly closed:
bounded domain constants (days-of-week, RGB channels, compass directions, HTTP status
classes, fixed protocol codes), deliberately-sealed exhaustive unions, and data-mapping
switches (enum → value, no per-case behavior). Premature abstraction is itself a defect.

## Escalation (documented, not built)

If this rung-2 instruction proves to under-fire in practice, the rung-4 escalation is a
review-time "generativity" adversarial lens — drop-in points: `skills/review/SKILL.md`
lens roster + `agents/essense-flow-adversarial-lens.md` adaptive-lens slot, reusing
criterion 9's growth-evidence guard verbatim. Do not build it without observed under-fire
evidence.
