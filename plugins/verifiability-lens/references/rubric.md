# The verifiability rubric + surfacing triage

> **type:** reference (canon — cite, do not copy)
> **consumed_by:** the `verifiability-lens` agent; the Stop hook's injected instruction (later);
> the `/verifiability` command. One source of truth for both pillars.

This file defines two things that work as a pair:
1. **Verifiability classification** — sort any unit of work into A / B / U (detection).
2. **Surfacing triage** — decide what to do with each B/U item: auto-resolve, escalate, or
   suppress, tuned by the recipient profile (delivery).

The lens DETECTS uncertainty. The triage DECIDES what reaches the user. Detection without triage
floods the user; triage without detection has nothing to act on. Both required.

---

## Part 1 — Verifiability classification (A / B / U)

Split every produced claim / decision / deliverable into exactly one class:

- **A — verifiable.** A cheap, accurate check exists AND can be run now: a test passes, the code
  path read confirms it, a deterministic diff/grep settles it. **Name the check.**
- **B — unverifiable.** No cheap accurate check exists: an image, a prediction, a hard open
  problem, subjective quality ("reads well"), a claim resting on context nobody loaded. **Do not
  iterate blindly on a B item** — declare it, then route it through the triage (Part 2).
- **U — indeterminate (the meta-case).** You cannot tell whether a check exists, or you lack the
  tool to run one. **Resolve U:** acquire the check (→A) or declare it unverifiable (→B). **Never
  let a U pass as A** — a U masquerading as A is the false-clean failure this whole system exists
  to catch.

**Class is capability-relative.** The same claim is A for an agent that can run the check and B
for one that cannot ("the linter passes" is A with a shell, B without). Judge against the
**downstream doer's** capabilities, not your own. When you downgrade, say why.

**Discipline when classifying:**
- **Substrate-verify before classing A.** Existence ≠ a check. Read the cited code path / run the
  reasoning before calling something verifiable. A function existing with the right name is not
  evidence its body is correct.
- **Do not manufacture B to look thorough.** An all-A unit is a valid, honest result. Fabricated
  uncertainty is as harmful as fabricated certainty.

---

## Part 2 — Surfacing triage (auto-resolve / escalate / suppress)

For every B/U item — and every genuinely important A-risk — choose exactly one lane. The gate is
**importance × actionability-with-context**; both are required before anything reaches the user.

### Importance (closed set)

`critical | important | minor`. Score by: does it block convergence? does it touch correctness or
the user's intent? is it costly or irreversible to get wrong? Only `critical` and `important` may
escalate. `minor` never interrupts.

### Actionability-with-context

Can the recipient decide it **from the bundled context alone**, without going to study something?
If not, it CANNOT be surfaced as a bare question — either bundle the context that makes it
decidable, or auto-resolve it and inform.

### The three lanes

| lane | when | action |
|------|------|--------|
| **auto-resolve** | the system can settle it — research reaches an answer, or a defensible default exists | resolve it, **log it visibly**, inform in one line. Do not ask. A ratified default IS an answer. **Default bias** under a low-context-appetite profile. |
| **escalate** | `critical`/`important` AND genuinely needs the user's judgment (product intent, a trade-off only they own) AND actionable-with-context | surface in ONE batched gate (never per-item): plain-language *what*, *why it matters* (one line), the options, and a **recommended default first**. Bundle the context inline so no digging is needed. |
| **suppress** | `minor`, low-impact, or cheaply reversible | record to the log; never interrupt. |

### Hard rules (non-negotiable)

1. **Never hand the user a context-less decision.** Supply the context, or auto-resolve and inform
   — never a bare choice they'd need to do homework to answer.
2. **Auto-resolve is never silent.** Every default the system takes is written to a glanceable log
   the user can audit and revisit. Silently deciding is the failure the verify-don't-claim value
   forbids — the triage must not become a way to bury B work it should have shown.
3. **Escalate sparingly, batched.** Bundle questions at one gate; do not interrupt per item.
4. **Recommended default first.** Every escalated choice leads with the option the system would
   pick, phrased so the user can simply accept it.

---

## Part 3 — Recipient profile (who-it-serves)

The triage thresholds and rendering are tuned by a **recipient profile** — a config block, never
hardcoded (no personal setup baked into logic). Fields:

- `verbosity` — how terse the surfaced text is.
- `context_appetite` — how much the recipient will load themselves. Low → bundle everything,
  assume no digging.
- `escalation_floor` — the minimum importance that may interrupt. High → only `important`+.
- `default_bias` — how aggressively to auto-resolve vs ask. Aggressive → absorb the slack.
- `render` — voice of surfaced text: plain language, bottom-up, recommended-default-first.

The default profile (`defaults/recipient-profile.yaml`) is tuned for a time-poor recipient:
terse, low context-appetite, high escalation floor, aggressive auto-resolve, plain render. It is
adjustable per project / per user — the rubric does not change, only the dials.

---

## Part 4 — What the recipient sees (the deliverable)

A short, plain, self-contained list of only the items that genuinely need them — each
understandable without digging, each with a recommended answer they can accept. Everything else
the system absorbs: minor items suppressed, settleable items auto-resolved and logged. That
absorption — not the raw A/B/U dump — is the product.
