# Code conventions

Production-code conventions every code-writing agent applies. These shape **how**
code is written; the task spec remains the only contract for **what** to build.
Apply the conventions that fit the language/stack — never let one contradict the
task spec. Cited by `skills/build` (task agents) and `skills/architect` (so task
specs are designed to allow, not fight, these conventions).

These are general good-engineering principles, distilled from real production
codebases. They are the positive form — the templates to reach for — not a
catalogue of mistakes.

---

## The one rule: build decoupled

**You are one agent building one unit. You do not know where it ends up, who
will call it, or what it will be used for. So you cannot couple to any of that —
you have to build it to stand on its own.** Every other rule below is downstream
of this one.

This is not an aesthetic preference; it is forced by how the work is built.
Units are designed by separate sub-architects and written by separate task
agents, in parallel, each blind to the others' internals. The only thing that
survives that blindness is a **contract**: a named surface a unit offers, and
the named surfaces it consumes. Couple to a contract and the system composes;
couple to a neighbour's internals, a caller's assumptions, or a shared global
and the system seizes the moment anything moves.

Concretely, every unit you write:

- **Exposes a contract, hides everything else.** Name the functions / types /
  endpoints callers may depend on and their shapes; keep the rest private and
  free to change. If your task spec has an `exposes` block, that block IS your
  public surface — nothing outside it is promised.
- **Depends only on contracts, never on internals.** Call a provider through the
  shape it advertises (your spec's `consumes` block when present); never reach
  past it into *how* it works, its private helpers, or its data layout. Depend on
  an interface/abstraction, not a concrete implementation.
- **Assumes nothing about its caller.** No "the caller will have already done X,"
  no reading a global the caller happened to set, no ordering you don't enforce
  yourself. Validate your own inputs; surface your own errors.
- **Owns no shared mutable state.** No cross-unit globals, no singletons two units
  both write, no module that two units mutate. Pass state through the contract;
  centralize any unavoidable shared mutation behind one owner (see *Structure*).
- **Could be lifted out whole.** A good unit could be moved to another project, or
  have its provider swapped for a different implementation of the same contract,
  with only its contract — not a rewrite — telling you what breaks. If swapping a
  neighbour would force you to change code *inside* your unit, you coupled to its
  internals; pull the dependency back to the contract.

The test is mechanical, not a matter of taste: **trace every name your unit
reaches for. If any of them is something the contract doesn't promise — a
sibling's private helper, a caller's pre-set global, a concrete class where an
interface belongs — that is coupling, and it is a defect.** The review phase
hunts exactly this (the `coupling` lens) and a confirmed cross-boundary reach-in
blocks the sprint. Decoupling is not advice here; it is a gate.

---

## Before you build: reuse what exists

**Writing new code is the last resort, not the first move.** Before you implement
anything, establish that the capability is not already served — inside this
codebase or by a dependency you can adopt. Duplicated capability is the same
defect as duplicated definition (see *Single source of truth*): two
implementations of one thing, drifting apart, doubling the surface to maintain,
test, and secure.

Two places to look, in order:

- **Inside the codebase first.** Search for an existing function/module that
  already does this — Grep/Glob, and the functionality map (glossary `MAP.md`)
  when one exists. If it exists, **consume it through its contract; do not
  reimplement it.** If it *almost* fits, extend it or depend on it — a near-
  duplicate is still a duplicate.
- **Then a package or library.** For general, well-solved problems (parsing,
  dates, HTTP, crypto, retries, validation, serialization), a mature, actively-
  maintained dependency usually beats a hand-rolled version. Check what's
  available (Context7 / the package registry). Adopt it when it fits: pin the
  version, and **wrap it behind your own contract** so the rest of the code
  depends on the shape, not the vendor.

Only when neither serves the need — nothing in the codebase, no dependency that
fits, or a hard constraint rules them out (license, size, security, or an
over-heavy dep for a trivial need) — do you write it yourself. Record *why* the
existing options were rejected; "I didn't look" is not a reason. And when you do
write it, build it decoupled and reusable (the rule above) so the *next* unit
finds and reuses yours instead of writing a third copy.

This is a **design-time decision first**: the architect prefers reuse when
shaping task specs, and any spec that rebuilds an existing function or
reimplements what an available package serves must justify why in its
`agency_rationale`. At **build time** it is a *check*, not a licence to rewrite
scope — a task agent that discovers the capability already exists surfaces it; it
does not silently rebuild, and it does not silently skip a closed spec.

---

## Correctness you can prove

- **Verify by reading the code path, not by checking a file exists.** A function
  existing at a path is not evidence it works — read the body, trace caller →
  callee. Existence ≠ implementation.
- **Run the relevant test/build after each substantive change, not at the end of a
  batch.** Compounding errors are expensive to unwind. State the verifiable check
  that proves the change works ("parseX returns Y for Z"), not "done."
- **Fix at the root; never patch a patch.** If a prior change was wrong, revert it
  and find the real cause. Band-aids stack and rot the codebase.
- **Do the whole scope, not part of it.** No silent partial work, no premature
  "finished," no deferral "because easier." If unsure, include over exclude.

## Structure (corollaries of *build decoupled*)

Each of these is the lead rule applied to a specific axis — they are how a unit
stays liftable, not separate preferences.

- **Layered, acyclic dependencies.** Keep a pure-logic core free of framework/IO
  deps so it is testable in isolation; push framework/IO to the edges. Acyclic is
  the structural form of "depend on contracts, not internals" — a cycle means two
  units reached into each other.
- **One responsibility per unit.** Split god-classes/god-functions by concern;
  prefer early-return over deep nesting. A unit with one job has one small
  contract; a unit with five jobs leaks five ways.
- **Centralize state mutation in one ordered pipeline** rather than scattering
  writes; make effect ordering explicit (priority/tick order), not incidental.
  This is "owns no shared mutable state" — one owner mutates, everyone else asks
  through the contract.
- **Single source of truth.** Define an enum/constant/schema once and derive from
  it; when you touch a shared concern, update every consumer or state none needed.
  Duplicated definitions are two units silently coupled through a copy.

## Config & constants

- **No magic numbers or strings** — name every tunable as a constant. For
  domain/physical constants, comment the unit and cite the source; mark
  derived-from-spec values as "not a tuning knob."
- **Fail-fast, validated config.** Required secrets have no default — the app
  refuses to boot without them. Validate at load (type, range, cross-field). Never
  commit secrets: read from env; commit only `*.example` / `*.template`.

## Robustness

- **Classify errors before retrying.** Retry only transient failures (timeouts,
  429, 5xx) with backoff; re-raise permanent ones (auth, bad-param, precision)
  immediately. Self-heal on known recoverable codes.
- **Nothing fails silently.** Log with enough context to diagnose; degrade
  gracefully with a *visible* signal — never a silent empty result that hides the
  failure, never a bare catch that swallows the cause or leaks internals to callers.
- **Atomic writes for critical local state**: temp file → flush/fsync → atomic
  replace. Don't leave half-written state on crash.
- **Plan-then-apply for dangerous operations.** Build the plan (dry-run), then
  execute as a separate step; verify-after for irreversible steps — re-read to
  confirm, don't assume success.

## Portability & hygiene

- **Portable paths**: forward slashes, relative or configurable. No machine-specific
  absolute paths, usernames, or environment assumptions.
- **No dead/commented-out code as version control**, no debug scaffolding left in
  shipped paths, no leaked resources (dispose what you open), symmetric
  setup/teardown (subscribe/unsubscribe, open/close).

## Tests

- **Tests as living spec**: concrete-example unit tests; a *failing test first* when
  reproducing a regression (watch it fail, then fix); a smoke/sanity pass before an
  expensive full run.
- **Guard invariants with a test.** Where an architectural invariant must hold,
  write a fitness/guard test that asserts it — don't rely on hope.

## Verify behavior, not just units

Unit tests are the floor, not the ceiling — green units routinely miss
integration and behavioral bugs. Exercise the **real artifact end to end** and
produce evidence a human can inspect.

- **Build or run an end-to-end check matched to the surface.** Web UI →
  Playwright/Puppeteer flow; HTTP API → request smoke against a running server +
  response/schema assertion; CLI → subprocess invocation on real fixtures;
  game/sim/visual → headless run capturing screenshots/metrics; data pipeline →
  golden-file diff. A passing unit suite is not a substitute for seeing the thing
  actually run.
- **Acquire the means to verify — never silently skip it.** Decision order:
  1. A suitable verification tool/harness **already wired** in the project → use it.
  2. It exists but **isn't installed/available** to you → **request it** by name
     (declare the dependency and what it would verify). In essense-flow, surface
     this as an `unknowns` entry / tool request to master per `references/librarian.md`
     — a missing verification capability is a declared gap, not a dropped step.
  3. **Nothing exists** → build the minimal harness as part of the work: a smoke
     script, a runnable fixture, a small headless runner. The harness ships with
     the feature.
- **Make the result observable to the human.** Emit a screenshot, a captured log,
  or a printed actual-vs-expected so the outcome is *verifiable*, not asserted.
  "It works" is a claim; the captured run is the proof.
