---
artifact: decision
schema_version: 1
produced_by: /architect (or /elicit, /research when phase-specific)
read_by: any phase that revisits this choice
id: "{{DECISION_ID}}"
status: decided | superseded | reversed
decided_at: "{{TIMESTAMP}}"
phase: "{{PHASE}}"
tags: []
---

<!--
TEMPLATE CONTRACT — read this before producing output.

Required inputs (read-only): the context that produced the decision (relevant SPEC/REQ/ARCH excerpts referenced by ID, not pasted)
Must NOT contain: implementation code; restatement of unrelated context; later-decided rationale (use a new DEC that supersedes this one)

Operating contract: think → verify → surface.
A decision record exists to make a choice and the reasons behind it durable.
The future reader is asking "why did we do it this way?" — answer them, then stop.
-->

## 1. Decision

**Purpose:** one sentence — what was decided.

**PASS:** active voice, specific ("we will use X for Y"). Not "we should consider", not "we plan to".
**FAIL:** weasel words ("may", "consider"); restates the problem instead of stating the choice.
**If stuck:** if you cannot state the decision in one sentence, the decision is not yet made — return to the question.

## 2. Context

**Purpose:** what was true when the decision was made — relevant constraints, prior decisions, observations.

**PASS:** facts only, not opinions; references SPEC/REQ/ARCH/prior DECs by ID; describes the state of the world that necessitated the choice.
**FAIL:** mixes context with rationale; restates the entire spec; no references to other artifacts.
**If stuck:** ask "what would have been different if X were true?" — that's context.

## 3. Alternatives Considered

**Purpose:** show the work — what else was on the table and why it was rejected.

| Alternative | Pros | Cons |
|-------------|------|------|

**PASS:** at least one rejected alternative; pros/cons are concrete (not "easier" without saying easier-than-what); honest about why this option lost.
**FAIL:** strawman alternatives; "we considered X but ruled it out" without saying why; missing alternatives that would obviously have been considered.
**If stuck:** if the decision was truly only-option, write `_no alternatives considered — only viable approach_` and explain why.

## 4. Rationale

**Purpose:** why this option won — the bridge between context and decision.

**PASS:** explains the trade-off in concrete terms; references context items by what's important; honest about what was sacrificed.
**FAIL:** "best practice"; "industry standard"; "performance" without measurement; implicitly admitting bias without saying so.
**If stuck:** if rationale collapses to "felt right", that is not a rationale — surface as an open decision and revisit.

## 5. Consequences

**Purpose:** what becomes true after this decision lands — both intended and accepted.

Format — bullet list with `[+]`, `[-]`, `[?]` prefixes:
- `[+]` desired outcome enabled by this decision
- `[-]` cost or constraint accepted by this decision
- `[?]` open question this decision creates

**PASS:** at least one of each prefix where applicable; consequences are specific (not "things will be better").
**FAIL:** only `[+]` items (every decision has costs); vague "improves things"; missing follow-on questions.
**If stuck:** if this decision has no `[-]` items, you are likely missing a real cost — re-examine.

---

**Size signal:** typically half a page to one page. Longer than two pages indicates either a wrong-sized decision (should be split) or rationale leaking into context.
**Completion check:** before saving, verify status is one of `decided | superseded | reversed`; if superseded, link the superseding DEC.
