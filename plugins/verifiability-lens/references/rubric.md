# The verifiability rubric — three checks + surfacing triage

> **type:** reference (canon — cite, do not copy)
> **consumed_by:** the `verifiability-lens` agent; the Stop hook's injected instruction;
> the `/verifiability` command. One source of truth.

The lens is a strict, opinionated guardian of work quality. It runs THREE checks over the work that
was just done, ACTIVELY verifying (read code, search web, check docs) rather than just labelling —
then a surfacing triage decides what reaches the user. Strict in judgment; disciplined in surfacing.

---

## Part 1 — The three checks

### Check 1 — Verifiability (A / B / U), actively verified

Split every claim / decision / deliverable into one class — and verify what you can before ruling:

- **A — verifiable / verified.** A cheap accurate check exists. **Run it if you can** — read the
  cited code path, web-search the stat, check the library docs — and mark `verified`. If you can't
  run it now but the doer can, name the check.
- **B — unverifiable.** No cheap accurate check exists even with your tools: subjective quality, a
  genuine prediction, a hard open problem, a claim resting on context nobody has. Flag it.
- **U — indeterminate.** You can't tell whether a check exists, or you lack the tool. Resolve it:
  verify (→A), or declare unverifiable (→B). **Never let a U pass as A** — that false-clean is the
  core failure this whole system exists to catch.

Rules: **verify before you rule** (a claim you could have checked but didn't is your miss, not a B);
class is **capability-relative** (A if the doer can run the check, B if not); **substrate-verify**
(existence ≠ a check — read the body, fetch the source).

### Check 2 — Completeness (was it all done; did we stop for a real reason?)

Measure what was DONE against what was MEANT to be done (the request / plan / stated scope):

- Everything intended is done and verified → **complete**.
- Something is unfinished/deferred **with a real stated reason** (a true blocker, a user gate,
  genuinely out of scope) → **incomplete-with-stated-reason** — fine, surface the reason.
- Something is unfinished/half-done with **no real reason** — it just stopped → **arbitrary stop**.
  This is a hard escalation: name exactly what remains and the next action to finish it, tested.
  Premature finishing and silent dropped scope are failures, not style.

### Check 3 — Quality bar (the best achievable, not half-assed)

Hold the work to the highest achievable bar, opinionated and specific:

- **Tested?** Untested functionality / a critical path with no test = a gap, named.
- **Requirements met?** A missing or quietly-reinterpreted requirement = a gap, quoted.
- **Robust?** Unhandled edges, swallowed errors, fragile shortcuts taken "because easier" = gaps.
- **Is this the best we can do?** If a clearly better approach is achievable, say so with the
  concrete push to get there.

Do not accept "good enough" when better is achievable. Do **not** fabricate gaps either — a
genuinely complete, verified, high-quality result gets "all clear." Strict ≠ inventing problems.

---

## Part 2 — Surfacing triage (auto-resolve / escalate / suppress)

For every gap from the three checks, choose one lane. Gate = **importance × actionability-with-context**.

| lane | when | action |
|------|------|--------|
| **auto-resolve** | the system can settle it — research/web reaches an answer, or a defensible default exists | resolve, **log it visibly**, inform in one line. Don't ask. Default bias under low context-appetite. |
| **escalate** | `critical`/`important` AND needs the user's judgment AND actionable-with-context | surface in ONE batched gate: plain *what*, *why it matters*, options, **recommended default first**, context bundled inline. |
| **suppress** | `minor`, low-impact, cheaply reversible | log; never interrupt. |

**The strict-but-disciplined rule (resolves the tension):** judge to a HIGH bar — harsh, specific,
no softening — but SURFACE with discipline: only important+ AND actionable reaches the user; trivia
is suppressed or auto-resolved-and-logged. Strictness raises *what counts as a real gap* (a missing
requirement, an untested critical path, an arbitrary stop are ALWAYS important) — it does not lower
the noise floor. Demanding judge, clean signal.

**Hard rules:** never surface a context-less decision (supply context or auto-resolve + inform);
auto-resolve is never silent (every default logged, auditable); escalate sparingly, batched,
recommended-default-first.

---

## Part 3 — Recipient profile (who-it-serves)

Thresholds + rendering + stance are tuned by a **recipient profile** (`defaults/recipient-profile.yaml`)
— config, never hardcoded. Fields: `verbosity`, `context_appetite`, `escalation_floor`,
`default_bias`, `render`, and **`stance`** (default `strict` — push the work to the limit, reject
half-assed/missing-requirement/untested; vs `advisory` for a lighter touch). The rubric never
changes; only the dials.

---

## Part 4 — What the recipient sees (the deliverable)

A short, plain, self-contained list of only what genuinely needs them — verified findings, real
completeness gaps (especially arbitrary stops), and quality shortfalls that matter — each with a
recommended action they can accept. Everything settleable is absorbed and logged. The product is
the absorption **plus the few forceful pushes** that keep the work at its best — not a raw dump.
