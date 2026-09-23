# Prompt Modifiers

Keyword triggers that inject behavioral rules into the current response.

## Injection shape (the convention new modifiers drop into)

An abstract imperative list ("be careful", "re-read") under-fires — it drifts out of working memory at exactly the moment it matters. Protocol-bearing injections follow this shape instead: **failure named** (what the modifier guards against) → **ordered RESPONSE** (numbered steps run in order) → **ANTI-SIGNALS** (concrete tells that the failure is happening right now; each names where to return to) → **EXIT CHECK** (the verifiable condition that proves the modifier was honored, not just read). `@fresh`, `@prompt`, and `@fc` carry the full shape; a new modifier should too. Checklist-style modifiers (`@ship`) and already-stepped ones (`@build`, `@debug`, `@verify`) are exempt where their form is inherently concrete.

## Available Modifiers

### `++` / `@thorough` — RETIRED 2026-09-20
Was the enumerate-first protocol (list every item, work the list, re-read before ending). Owner
ruling after two measured +0 results in the with/without eval (plugin-toolkit `plugin-eval`,
sonnet, 3 runs/arm, the Unity haptics task): graded on "verified done" it read 0/3 with vs 2/3
without; graded on the very shape it promised (an enumerated list before the first write, items
closed one by one) it read 0/3 vs 0/3 — the model went straight to code either way. The trigger
regexes, the injection and the "add `++`" hint are gone; the token injects nothing. The global
`verification-rules.js` hook in the owner's `~/.claude/hooks/` still carries its own `++`
augment — outside this repo, the owner's to remove.

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
- DRAFT as ONE fenced code block, verbatim-copyable — objective first; minimal cold-start context (repo/branch, key paths, current state, done/remaining); concrete first action + the verifiable check that proves it done; **the sitting's END STATE and where the work must LAND** (committed, pushed, or explicitly "stays local because X"); open decisions/blockers; references to durable artifacts (handoff.md, CHANGELOG.md, task specs) instead of restating them; working-style carried forward (e.g. `@verify`, `@fc`)
- The END STATE clause (1.12.2) is carried by BOTH branches — the base injection and `PROMPT_STEWARD_INJECTION` (as step 1b), because a steward project never reaches the base text. Measured 2026-09-14 across 23 real sessions: opening on a kickoff file produced 1.7× the commits per owner message (2.11 vs 1.22, held within a single project so difficulty is constant), but 15 of the 23 never pushed and one project sat ~40 commits local-only for a month. The relay was carrying the work and not the landing.
- VERIFY every citation against the substrate: each file path, command, branch, and artifact the prompt cites is checked against current disk/git before it goes in — the cold session inherits citations as ground truth; one stale path poisons its first minutes
- COLD-READ the draft as its zero-memory reader: can it act from this alone? A question surfacing on re-read means the prompt isn't done
- SAVES the generated prompt to an append-only `.claude/prompts/` history + `INDEX.md` ledger (not just shown once), so prompts accumulate for review — same history pattern session-lifecycle gives handoffs
- Exit check: every citation disk-verified this turn + cold-read surfaced no open question
- **Kickoff contract (1.14.0, both branches).** The block's first three lines are fixed: `OWNER ASKED (verbatim): "…"` (the owner's words, quoted, never paraphrased), `THIS PROMPT ADDS: …` (every scope/phase/agent beyond those words, or "nothing"), `COST: <phases> · <expected sub-agent dispatches> · <expected hours>`. "Ask nothing" / "never stop early" may appear only inside the quote. Why: 2026-09-20 a kickoff written by hand in the session's voice read the owner's "test for all the phases making that" as a ten-phase build pipeline and his "it should ask me nothing, just go" as never stop; the receiving session spent 2h40m / 37 sub-agent dispatches before the owner intervened. The owner reviews three lines, not a page.
- **Honest escape (1.15.0).** When the owner's words for the work are not in the conversation, line 1 reads `OWNER ASKED: not in this conversation — the ask came from <where>`; "verbatim" labels only text copied from this conversation. The first real use (09-20, same evening) wrote a paraphrase under the label.
- **No receiving-side guard (removed 1.15.0).** 1.14.0's `[kickoff-guard]` injected a cost line + one-keystroke menu on any prompt saying "ask me nothing" without the verbatim line. It fired on the owner's own typing ("it should ask me nothing, just go") and a paraphrase under the label silenced it; the 2026-09-23 clean-up dropped it. Do not re-add a check on every prompt for this — the contract is on the writing side.

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
