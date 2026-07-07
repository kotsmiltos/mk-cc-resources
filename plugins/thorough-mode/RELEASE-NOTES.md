# Release notes — thorough-mode

## 1.8.0 — Protocol-shaped injections: `@thorough`, `@fresh`, `@prompt` fire where the work happens

An abstract imperative list ("be careful", "re-read key files") under-fires — it drifts out of working memory at exactly the moment it matters. Same lesson that shipped essense-flow's generativity protocol (0.25.0): instruct the protocol WHERE IT RUNS, not as background text. The three most-used modifiers now carry a full protocol shape — **failure named → ordered RESPONSE → ANTI-SIGNALS → EXIT CHECK** — instead of a flat bullet list. The shape is documented once in the plugin CLAUDE.md as the convention new modifiers drop into.

- **`++` / `@thorough`** — names its failure (satisficing: stopping at "looks addressed") and becomes ENUMERATE → WORK THE LIST → RE-READ: the request is written out as a checklist before acting, each item worked one at a time, the request re-checked against the list before ending. Anti-signals catch the live tells ("the rest are similar", sampling a few of many, paraphrasing an unre-read instruction). Exit check: every enumerated item has what-was-done + evidence.
- **`@fresh`** — becomes NAME → RE-READ → DIFF → ACT: name the load-bearing sources, re-read each from disk (compressed reads don't count), then **state the drift found vs the mental model** — an explicit "no drift found on X" counts, silence doesn't. Anti-signals: citing file:line from memory, editing a file not seen this turn, "as established earlier" unchecked. Exit check: can list what was re-read + drift per source.
- **`@prompt`** — becomes DRAFT → **VERIFY** → **COLD-READ** → SAVE → SHOW. Two new steps close the gap that hurts most at cold start: (VERIFY) every file path, command, branch, and artifact the prompt cites is **checked against current disk/git before it goes in** — the cold session inherits citations as ground truth, one stale path poisons its first minutes (the substrate-verify rule from essense-flow's architect constraints, applied to prompts); (COLD-READ) re-read the draft as its zero-memory reader — a question surfacing means the prompt isn't done. Draft content + append-only save protocol unchanged from 1.7.0.

No changes to @ship, @present, @debug, @verify, @build (already checklist- or step-shaped) or to any trigger/hint regex. Verified end-to-end by piping UserPromptSubmit payloads: `node --check` clean; each token fires its new injection (`++`→"ENUMERATE first", `@fresh`→"DIFF against your mental model", `@prompt`→"COLD-READ"); a plain prompt emits 0 bytes; all three fire together on a combined prompt; the `@fresh` hint still fires on keyword-less "re-read" intent and stays suppressed when `@fresh` is active.

## 1.7.0 — `@prompt` now saves the prompt it generates (append-only history)

`@prompt` produced a great kickoff prompt and then it vanished into the transcript — shown once, never kept. Now it accumulates, so you can review past prompts and improve the pattern from real examples.

- **`@prompt` saves each generated prompt** to a permanent `.claude/prompts/prompt-<ts>.md` and PREPENDS a newest-first line to `.claude/prompts/INDEX.md` (created with a `# Prompt index` header if absent), then confirms where it saved. Never overwrites a prior prompt — an append-only history, the same pattern session-lifecycle 1.2.0 gives handoffs.
- Purely additive to the existing `@prompt` injection (same prompt content + format); the only change is it now also persists + indexes. Hook syntax verified; `@prompt` still triggers and the injection now carries the save step.

## 1.6.0 — Two new modifiers: `@prompt` and `@build`

**`@prompt` — next-session kickoff prompt.** Injects instructions to produce a **copy-paste prompt that kicks off the next session** — output as one fenced code block, assuming a fresh context with no memory of the current one: objective up top, minimal cold-start context (repo/branch, key paths, current state, done/remaining), concrete first action + its verifiable check, open decisions/blockers, references to durable artifacts (handoff.md, RELEASE-NOTES, task specs) rather than restating them, and any working-style to carry forward (`++`, `@verify`).

**`@build` — plan, review, build.** Injects a three-phase workflow for a change: (1) PLAN — a detailed change plan broken into MODIFY (file/symbol + what changes), ADD (new code + where), REMOVE (what's deleted/replaced + why safe), with order-of-ops + per-step verifiable check; (2) REVIEW the plan before building — is it the best option (name the rejected alternative)? does it match the codebase's existing style/implementation patterns (read neighbors, reuse helpers)? does it honor project conventions (`code-conventions.md` / CLAUDE.md)? surface risks/unknowns; (3) BUILD in smallest viable steps, verify after each, fix at root, no drift — if the plan was wrong, revise and re-review rather than patch around it.

Both carry smart hints that suggest the modifier when the intent is described without the keyword ("give me the prompt to kick off the next session"; "plan it out then build", "what will you touch").

Verified: each hook fires on its token (injects the block), each hint fires on keyword-less intent, both inject together when combined, and a plain prompt emits nothing (no false trigger). No changes to other modifiers.

## 1.5.0 — @ship integration with plugin-toolkit

`@ship` modifier updated to reference `/version-bump` and `/docs-audit` from the new plugin-toolkit. When `@ship` fires in an mk-cc-resources plugin repo, the injection now points Claude at `/version-bump` for semver cascading (plugin.json + marketplace entry + bundle + metadata + RELEASE-NOTES in one shot) and `/docs-audit` for cross-doc drift detection (CLAUDE.md + README + marketplace.json vs disk state). Outside that repo, `@ship` falls back to the generic checklist.

No changes to other modifiers (++/@thorough, @present, @debug, @verify, @fresh).

## 1.4.0 — Add @debug, @verify, @fresh modifiers

Three new prompt modifiers mined from recurring rules across 4+ projects:
- **@debug** — root cause investigation before fixing (read code first, trace to origin, check patterns, propose fix with rationale)
- **@verify** — paranoid verification of every claim (prove results not intentions, run tests after each change, state verifiable check not "done")
- **@fresh** — context refresh (re-read key files, don't trust compressed reads, verify each constraint against current disk)

Each has smart hints that fire on natural language intent without the keyword. All stack with each other and existing modifiers.

## 1.3.2 — Prior versions

(See git history for changes prior to RELEASE-NOTES creation.)
