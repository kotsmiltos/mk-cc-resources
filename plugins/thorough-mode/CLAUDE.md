# Prompt Modifiers

Keyword triggers that inject behavioral rules into the current response.

## Injection shape (the convention new modifiers drop into)

An abstract imperative list ("be careful", "re-read") under-fires — it drifts out of working memory at exactly the moment it matters. Protocol-bearing injections follow this shape instead: **failure named** (what the modifier guards against) → **ordered RESPONSE** (numbered steps run in order) → **ANTI-SIGNALS** (concrete tells that the failure is happening right now; each names where to return to) → **EXIT CHECK** (the verifiable condition that proves the modifier was honored, not just read). `@thorough`, `@fresh`, `@prompt`, and `@fc` carry the full shape; a new modifier should too. Checklist-style modifiers (`@ship`) and already-stepped ones (`@build`, `@debug`, `@verify`) are exempt where their form is inherently concrete.

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
- CHANGELOG.md has an entry for the changes (user-facing, Keep a Changelog headings)
- Version numbers are bumped (package.json, plugin.json, marketplace.json). In mk-cc-resources plugin repo, invoke `/version-bump` (plugin-toolkit) to cascade correctly across plugin.json + marketplace.json + bundle + metadata + CHANGELOG.md in one go.
- CLAUDE.md reflects new patterns or conventions
- Cross-doc consistency: in mk-cc-resources plugin repo, consider `/docs-audit` (plugin-toolkit) to detect drift between CLAUDE.md + README + marketplace.json + disk state
- Repo pathologies: PROBE for `plugins/plugin-toolkit/bin/repo-guard.js` first, and run it only if present — repo-guard lives in the plugin-toolkit source tree, never in an install (the bundle ships `skills` only), so naming its path unconditionally would point every other project at a file that is not there. Exit 1 means do not push
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
- DRAFT as ONE fenced code block, verbatim-copyable — objective first; minimal cold-start context (repo/branch, key paths, current state, done/remaining); concrete first action + the verifiable check that proves it done; open decisions/blockers; references to durable artifacts (handoff.md, CHANGELOG.md, task specs) instead of restating them; working-style carried forward (e.g. `++`, `@verify`)
- VERIFY every citation against the substrate: each file path, command, branch, and artifact the prompt cites is checked against current disk/git before it goes in — the cold session inherits citations as ground truth; one stale path poisons its first minutes
- COLD-READ the draft as its zero-memory reader: can it act from this alone? A question surfacing on re-read means the prompt isn't done
- SAVES the generated prompt to an append-only `.claude/prompts/` history + `INDEX.md` ledger (not just shown once), so prompts accumulate for review — same history pattern session-lifecycle gives handoffs
- Exit check: every citation disk-verified this turn + cold-read surfaced no open question

### `@build` — Plan, Review, Build
Plans a change, reviews the plan against the bar, then implements it:
- PLAN: enumerate code to MODIFY (file/symbol + what changes), ADD (new files/functions/types + where), REMOVE (what's deleted/replaced + why safe); order of ops + verifiable check per step
- REVIEW: is it the best option (name the rejected alternative)? is it already built here or served by a package/library (reuse-first — reuse/extend, don't reinvent)? does it match existing style/implementation patterns (read neighbors, reuse helpers)? does it honor project conventions (code-conventions.md / CLAUDE.md)? surface risks/unknowns
- BUILD: smallest viable steps, verify after each, fix at root, no drift from the plan — if the plan was wrong, revise and re-review rather than patch around it

### `@fc` — Fewer Clicks
Guards against OUTSOURCING — ending a turn with work the user now has to do (a path to open, a command to run, a choice buried in prose) that you had the tools to do here:
- SPLIT: what you can do in this environment vs what genuinely requires the user (their credentials, an interactive login, an outward/irreversible action, a judgment they own) — the second list stays short and justified; "faster if you do it" is not a justification
- DO your whole side in this sitting: runnable -> run it and paste the output; readable -> read it and show what matters; fixable -> fix it; comparable -> diff it and show the diff
- DELIVER IN-ENVIRONMENT: the content lands in the terminal, already digested; a path/id/section-ref is a machine address, cited AFTER the content, never instead of it
- MINIMIZE remaining clicks: every decision is ONE keystroke (AskUserQuestion, batched, recommended default first); anything the user must run comes as a paste-ready one-liner
- STILL CONFIRM destructive, outward-facing, or irreversible actions — `@fc` makes the ask one keystroke, it does not remove it
- Anti-signals: "you can run...", "check the file at...", "see <path>", a to-do list addressed to the user, reporting a file was written without showing its content
- Exit check: everything left on the user is something only they can do, each with the exact command or a one-keystroke question

Provenance: owner law, verbatim 2026-09-09 — "this cannot be pointing me to files. it needs to be giving me everything i need in a digestible manner within this environment ... doing as many of the things on its own and leaving the least amount of clicks to me". `@fc` is that law on demand; the modifier does not make it the default.

## Smart Hints

When you describe the intent without using the keyword (e.g., "don't skip anything", "push it", "show me choices with arrows"), the hook shows a one-line hint suggesting the relevant modifier. Hints are suppressed when the modifier is already active — no nagging.

## Sub-agent Propagation

When dispatching sub-agents while a modifier is active, pass the behavioral instructions through in the agent prompt. The trigger keywords are detected by the hook at the conversation level — sub-agents need the rules stated explicitly in their prompts.
