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

## Structure

- **Layered, acyclic dependencies.** Keep a pure-logic core free of framework/IO
  deps so it is testable in isolation; push framework/IO to the edges.
- **One responsibility per unit.** Split god-classes/god-functions by concern;
  prefer early-return over deep nesting.
- **Centralize state mutation in one ordered pipeline** rather than scattering
  writes; make effect ordering explicit (priority/tick order), not incidental.
- **Single source of truth.** Define an enum/constant/schema once and derive from
  it; when you touch a shared concern, update every consumer or state none needed.

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
