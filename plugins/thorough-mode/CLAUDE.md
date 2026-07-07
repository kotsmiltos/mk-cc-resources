# Prompt Modifiers

Keyword triggers that inject behavioral rules into the current response.

## Injection shape (the convention new modifiers drop into)

An abstract imperative list ("be careful", "re-read") under-fires — it drifts out of working memory at exactly the moment it matters. Protocol-bearing injections follow this shape instead: **failure named** (what the modifier guards against) → **ordered RESPONSE** (numbered steps run in order) → **ANTI-SIGNALS** (concrete tells that the failure is happening right now; each names where to return to) → **EXIT CHECK** (the verifiable condition that proves the modifier was honored, not just read). `@thorough`, `@fresh`, and `@prompt` carry the full shape; a new modifier should too. Checklist-style modifiers (`@ship`) and already-stepped ones (`@build`, `@debug`, `@verify`) are exempt where their form is inherently concrete.

## Available Modifiers

### `++` / `@thorough` — Thorough Mode
Guards against satisficing — stopping at "looks addressed" instead of "each item verifiably addressed":
- ENUMERATE first: list every item/file/question/constraint the request contains — the request IS the checklist
- WORK THE LIST: each item fully, one at a time — never batch, merge, or hand-wave; in doubt, include
- RE-READ before ending: check the request against the list; anything skimmed/dropped goes back to the list
- Anti-signals: "the rest are similar", sampling a few of many, paraphrasing an unre-read instruction
- Exit check: every enumerated item has what-was-done + evidence — an item without evidence is not done

### `@ship` — Pre-Push Checklist
Enforces documentation and versioning hygiene before pushing:
- README.md reflects new features and changed behavior
- CHANGELOG / RELEASE-NOTES have entries for the changes
- Version numbers are bumped (package.json, plugin.json, marketplace.json). In mk-cc-resources plugin repo, invoke `/version-bump` (plugin-toolkit) to cascade correctly across plugin.json + marketplace.json + bundle + metadata + RELEASE-NOTES in one go.
- CLAUDE.md reflects new patterns or conventions
- Cross-doc consistency: in mk-cc-resources plugin repo, consider `/docs-audit` (plugin-toolkit) to detect drift between CLAUDE.md + README + marketplace.json + disk state
- New skills/commands/hooks are documented
- Reports what was checked and updated before pushing

### `@present` — Interactive Question Format
Forces all choices and decisions through `AskUserQuestion` with arrow-key navigation:
- No inline A/B/C or numbered option lists in the response body
- Uses labels, descriptions, previews, and multiSelect as appropriate
- Batches up to 4 independent decisions per call
- Recommended option listed first

### `@debug` — Root Cause Investigation
Enforces investigation before fixing:
- Read relevant code first — understand what it does and WHY
- Find the ROOT CAUSE, not just the symptom — trace back to origin
- Check for patterns — similar issues in related files?
- Propose fix with rationale BEFORE implementing
- Never layer patches on patches — fix the design if wrong

### `@verify` — Paranoid Verification
Proves every claim with evidence before declaring done:
- Verify the RESULT, not what you wrote — check files exist, tests pass, hooks fire
- State the verifiable check: "tests pass + parseX returns Y" not "done"
- Run test suite after EACH change, not at end of batch
- Verify by reading code, not by checking file exists (existence ≠ implementation)
- If you can't verify, say so explicitly

### `@fresh` — Context Refresh
Assumes the mental model has drifted; rebuilds it from disk, not memory:
- NAME the load-bearing sources (files to edit, constraint docs, latest user instructions)
- RE-READ each from disk NOW — compressed/summarized earlier reads don't count
- DIFF against the mental model: state what changed vs what was believed ("no drift found on X" counts; silence doesn't)
- Only then act, verifying each constraint against current disk state
- Anti-signals: citing file:line from memory, editing a file not seen this turn, "as established earlier" unchecked
- Exit check: can list what was re-read + drift found (or "none" per source)

### `@prompt` — Next-Session Kickoff Prompt
Produces a copy-paste prompt to start the NEXT session from a cold context. Ordered protocol — DRAFT → VERIFY → COLD-READ → SAVE → SHOW:
- DRAFT as ONE fenced code block, verbatim-copyable — objective first; minimal cold-start context (repo/branch, key paths, current state, done/remaining); concrete first action + the verifiable check that proves it done; open decisions/blockers; references to durable artifacts (handoff.md, RELEASE-NOTES, task specs) instead of restating them; working-style carried forward (e.g. `++`, `@verify`)
- VERIFY every citation against the substrate: each file path, command, branch, and artifact the prompt cites is checked against current disk/git before it goes in — the cold session inherits citations as ground truth; one stale path poisons its first minutes
- COLD-READ the draft as its zero-memory reader: can it act from this alone? A question surfacing on re-read means the prompt isn't done
- SAVES the generated prompt to an append-only `.claude/prompts/` history + `INDEX.md` ledger (not just shown once), so prompts accumulate for review — same history pattern session-lifecycle gives handoffs
- Exit check: every citation disk-verified this turn + cold-read surfaced no open question

### `@build` — Plan, Review, Build
Plans a change, reviews the plan against the bar, then implements it:
- PLAN: enumerate code to MODIFY (file/symbol + what changes), ADD (new files/functions/types + where), REMOVE (what's deleted/replaced + why safe); order of ops + verifiable check per step
- REVIEW: is it the best option (name the rejected alternative)? is it already built here or served by a package/library (reuse-first — reuse/extend, don't reinvent)? does it match existing style/implementation patterns (read neighbors, reuse helpers)? does it honor project conventions (code-conventions.md / CLAUDE.md)? surface risks/unknowns
- BUILD: smallest viable steps, verify after each, fix at root, no drift from the plan — if the plan was wrong, revise and re-review rather than patch around it

## Smart Hints

When you describe the intent without using the keyword (e.g., "don't skip anything", "push it", "show me choices with arrows"), the hook shows a one-line hint suggesting the relevant modifier. Hints are suppressed when the modifier is already active — no nagging.

## Sub-agent Propagation

When dispatching sub-agents while a modifier is active, pass the behavioral instructions through in the agent prompt. The trigger keywords are detected by the hook at the conversation level — sub-agents need the rules stated explicitly in their prompts.
