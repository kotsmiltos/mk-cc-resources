# verifiability-lens — Release Notes

## 0.3.2 — Test hardening (lens-caught, on its own build)

The lens ran against its own 0.3.0/0.3.1 ship and flagged two real gaps; both fixed here:
- **BLOCK_REASON contract is now regression-proof.** The 37 hook tests asserted nothing about the
  0.3.0 hook contract — a regression that stripped the completeness / `intended_scope` /
  continue-not-stop instructions would have passed. Added two string-assertion tests that the
  injected BLOCK_REASON contains `intended_scope`, `completeness`, `continue the work`,
  `subagent_type: verifiability-lens`, and `Do NOT dump raw classes`. (The agent's LLM *judgment*
  stays untestable — fair; the hook *contract* shouldn't be.)
- **Test harness no longer hides a partial run.** Added a failure counter, a denominator
  (`39/39 passed`), and an explicit `process.exit(failed ? 1 : 0)` — a mid-suite assertion failure
  now prints `FAIL` + the count and exits non-zero, instead of printing a plausible-looking
  `N passed`. **39/39 passed.**

This release was driven by the tool judging itself — exactly its job (completeness + quality bar).

## 0.3.1 — Serena semantic code tools (trace, don't just grep)

Added read-only Serena tools to the agent so code-claim verification can *trace* instead of
text-match: `mcp__serena__find_symbol` (real definition + body), `find_referencing_symbols` (who
actually calls it — proves wiring, not just existence), `get_symbols_overview` (structure),
`search_for_pattern` (semantic search). Gives "existence ≠ implementation" real teeth.

Agent prefers Serena where the workspace is onboarded as a Serena project; **falls back to
Read/Grep/Glob** when it's unavailable (Serena is a per-workspace MCP — not present in every repo).
Read-only, no new risk. Deliberately NOT added: Bash (execution breaks the judge-don't-run design +
per-turn cost/risk), Write/Edit (it judges, never fixes), AskUserQuestion/Agent (surfacing goes
through the main agent; no recursion). Trigger code unchanged — 37/37 hook tests still pass.

## 0.3.0 — Active verification + completeness + quality bar + strict stance

The lens grows from a passive classifier into a strict, opinionated work-quality guardian.

- **Web + docs access (it can now fact-check, not just flag).** Agent tools expanded to
  `Read, Grep, Glob, WebSearch, WebFetch, mcp__context7__*`. For a load-bearing research/factual
  claim it now actively searches/fetches/checks docs to **confirm or refute** it — class A means
  *verified*, not just *checkable*. (Closes the prior read-only blind spot on web claims.) It still
  verifies judiciously — the claims that matter, not every trivial line.
- **Completeness check (no arbitrary stops).** It measures what was *done* against what was *meant*
  to be done (`intended_scope`). A turn that stopped with a real reason (blocker/gate/out-of-scope)
  is fine; a turn that just stopped half-done → `incomplete-ARBITRARY-STOP`, a hard escalation that
  names what remains and presses to continue + finish, tested. The hook now passes `intended_scope`
  and, on an arbitrary-stop/unmet-requirement flag, instructs the doer to **continue rather than
  stop**.
- **Quality bar (push to the best achievable).** Holds the work to tested / requirements-met /
  robust / best-achievable, and flags half-assed shortcuts, missing requirements, and untested
  critical paths with the concrete push to fix each.
- **Strict, opinionated stance.** New `stance` profile dial (default `strict`). Resolves the
  tension with the recipient profile explicitly: **strict judgment, disciplined surfacing** — it
  judges to a high bar (harsh, specific, no softening) but still surfaces only important+actionable
  items. Strictness raises *what counts as a real gap*; it does not lower the noise floor. It does
  NOT fabricate gaps — a genuinely complete, verified, high-quality result still gets "all clear."

Unchanged: the Stop-hook trigger logic (whole-turn read, work-tool triggers, meta-loop + question
hard-skips, fire-once guard, fail-open, opt-in). 37/37 hook unit tests still pass (this release
changes the agent/rubric/profile/BLOCK_REASON prose + the agent's tool set, not the trigger code).

## 0.2.4 — Critical fix: read the whole turn, not just the last message (it never fired)

**Bug (why it silently never fired on real work):** the hook inspected only the LAST assistant
message of a turn. But a turn calls its tools in *earlier* messages and almost always **ends with a
text-only summary** ("Done. Build clean."). So the tool-based trigger saw no tools → the hook
allowed the stop → nothing fired. This is why 0.2.2/0.2.3 looked installed-and-enabled but produced
`no fire` on a session that clearly did Edit/Bash/Read work. (0.2.0/0.2.1 accidentally fired because
their loose prose regex matched words in the summary; making the trigger tool-based in 0.2.2 exposed
the latent flaw.)

**Fix:** `extractTurn` now aggregates the **entire current turn** — every assistant message since
the last genuine user prompt (tool_result relay messages are *not* turn boundaries) — collecting all
tool names used and the combined text. The trigger now sees the work even when the turn ends
text-only.

**Verified:** 37/37 unit tests (adds whole-turn aggregation across messages ending text-only, and
current-turn-only isolation so a prior turn's tools don't leak) + run against a **real session
transcript**: `extractTurn` returned `[Bash,Edit,…]` from a turn that ended with a text summary, and
the hook returned `{"decision":"block"}`. Guards (meta-loop, question, fire-once, fail-open)
unchanged.

## 0.2.3 — Also fire on research, web, subagents, and file reads

Per request: the default trigger now covers all **substantive-work** turns, not just code
production — because research/web/agent output is exactly where unverifiable (class B/U) claims
hide. The trigger tool set is now:
- **produce/run:** Write, Edit, NotebookEdit, Bash
- **investigate:** Read, Grep, Glob
- **research:** Agent / Task (spawned subagents), WebSearch, WebFetch, and any MCP tool (`mcp__*`,
  e.g. Context7 docs).

Guards unchanged and reordered so they stay correct: the **meta-loop guard** (the lens's own
dispatch/surfacing) is checked first — even a turn that calls the Agent tool to spawn the lens is
skipped; a **pure question** (text-only, no work tool) is skipped; but a turn that *did* work and
also asked something still fires (the work is worth checking). Prose-only claim checking remains
opt-in (`check_prose_claims`).

**Verified:** 36/36 unit tests (adds Read/Grep/WebSearch/WebFetch/Agent/MCP triggers, did-work-then-asked
fires, lens-dispatch skips) + a process smoke: web-search / spawned-agent / file-read / MCP-fetch /
code-edit all **block**; pure question / lens-dispatch / lens-surfacing / casual prose all **allow**.

## 0.2.2 — Fix: stop firing on conversation (artifact-trigger default + meta-loop guard)

**Bug:** in chat/coaching sessions the hook fired nearly every turn — including on plain
questions and on the lens's own surfaced output (the fact-checker checking its own report). Root
cause: the pre-filter triggered on bare prose words (`done`, `works`, `ready`, `the plan`) that
appear constantly in ordinary conversation.

**Fix — the pre-filter is now precise:**
- **Default trigger = artifact-producing turns only** (a code/command tool ran: Write / Edit /
  NotebookEdit / Bash). High-signal; quiet in conversation.
- **Prose-claim checking is opt-in** via `check_prose_claims: true` in the config, and narrowed to
  strong shipping/verification phrasing (`tests pass`, `shipped`, `committed`, `pushed`, …) — not
  casual "done/ready/works".
- **Two hard skips regardless of mode:** a turn that is the lens's own surfaced rollup
  (`[verifiability-lens]`, `rollup`, `escalations`, …) never triggers — kills the check-the-check
  meta-loop; and a turn that is purely a question (`…?` with no strong claim) never triggers.

**Verified:** 28/28 unit tests (adds question-skip, lens-surfacing-skip, artifact-default,
prose-opt-in, `resolveFlag` cases) + a process smoke reproducing the report — question turn,
lens-surfacing turn, and casual coaching prose all **allow** (no block); a real code turn still
**blocks**. Fail-open + fire-once guard unchanged.

**Enable prose checking (opt-in):** add `"check_prose_claims": true` to your
`~/.claude/verifiability-lens.json` (or a project one). Off by default.

## 0.2.1 — Global enable switch (turn it on everywhere with one file)

The opt-in can now be set globally, so it works across all your projects without dropping a config
into each repo. Enable precedence (high → low), resolved by the new pure `resolveEnabled`:
- env `VERIFIABILITY_LENS_ENABLED=1` — forces ON.
- project `./.claude/verifiability-lens.json` `{"enabled": true|false}` — an **explicit repo
  decision wins**, so a repo can opt OUT of a global ON with `{"enabled": false}`.
- global `~/.claude/verifiability-lens.json` `{"enabled": true}` — the **everywhere switch**.
- else OFF.

**Verified:** 18/18 unit tests (adds 5 `resolveEnabled` precedence cases) + a global-config
process smoke (global ON enables a project with no local config; project `{"enabled":false}`
overrides global ON). Fail-open unchanged: any unreadable/ambiguous config defers, never blocks.

## 0.2.0 — Automatic trigger: the Stop hook (opt-in)

The lens now fires by itself. A Stop hook (P1 — block + in-session classification) runs every
classify-worthy turn with no prompt: when the last assistant turn asserts a plan / claim / result,
the hook returns `{decision:"block", reason:"…dispatch the verifiability-lens…"}` and the same
session classifies what it just produced and surfaces only the triaged escalations before yielding.
Same mechanism essense-autopilot uses.

Ships:
- **`hooks/scripts/verifiability-stop.js`** — the Stop hook. Reads the transcript's last assistant
  message, deterministic pre-filter (claim / plan / code-write markers), and a **fire-exactly-once
  loop guard**: after a block the next fire is force-released (`awaiting`), and a content hash skips
  re-classifying the same content — so an infinite block is impossible even if hashes drift.
  **Opt-in, OFF by default** (`.claude/verifiability-lens.json` `{"enabled":true}` or env
  `VERIFIABILITY_LENS_ENABLED=1`). **Fail-open** on any error/ambiguity → allows the stop (blocking
  wrongly is worse than missing one classification). No reentrancy concern: the lens runs as an
  in-session subagent (SubagentStop ≠ Stop), so it can't trigger itself.
- **`hooks/scripts/verifiability-stop.sh`** + **`hooks/hooks.json`** — bash wrapper + Stop
  registration (mirrors essense-autopilot).
- **`tests/verifiability-stop.test.js`** — 13 unit tests on the guard.

**Verified:**
- `node tests/verifiability-stop.test.js` → **13/13 pass** (classify-worthy detection; disabled
  allows; fresh→block; awaiting→release; same-content→skip-no-loop; new-content→re-block;
  transcript extraction; missing-file fail-open).
- Process-level smoke (spawn the real hook with a stdin payload): fire1 → `decision:block`;
  fire2 → release (empty stdout); fire3 → no re-block; disabled → allow; state persisted with
  `awaiting` cleared.

**To enable:** add `.claude/verifiability-lens.json` `{"enabled": true}` to a project (default OFF).

**Not yet (own gates):** in-band pipeline-gate dispatch; PostToolUse fire points; extend
librarian.md's surfacing protocol with the triage; the §4 schema deepening.

## 0.1.0 — The lens + manual trigger (detection + surfacing, no auto-fire yet)

First cut. Classifies work into A (verifiable) / B (unverifiable) / U (can't-tell) and triages
each B/U item into auto-resolve / escalate / suppress, tuned by a recipient profile — so the user
sees only the important, actionable, fully-contextualized decisions and the rest is absorbed.

Ships:
- **`agents/verifiability-lens.md`** — read-only classifier + triager. Substrate-verifies before
  classing A; class is capability-relative; never lets a U pass as A; triages every B/U item;
  never surfaces a context-less decision; auto-resolutions always carry a logged default. Returns
  a triaged rollup, not a raw class dump. Quorum tolerant (crash → synthetic class-U, never silent
  "all clear").
- **`references/rubric.md`** — the canon (cite, don't copy): A/B/U classification (Part 1) +
  surfacing triage (Part 2) + recipient profile (Part 3) + the deliverable (Part 4). One source of
  truth for the agent, the command, and the future hook.
- **`defaults/recipient-profile.yaml`** — the dials, default-tuned for a time-poor recipient
  (terse, low context-appetite, high escalation floor, aggressive auto-resolve). Adjustable; never
  hardcoded into logic.
- **`commands/verifiability.md`** — `/verifiability [target]` manual trigger; shows the triaged
  rollup (headline + escalations + one-line auto-resolved/suppressed note), not the raw classes.

**Not yet (next version):** the automatic Stop-hook trigger (fires every classify-worthy turn,
blocks the turn, runs the lens in-session, surfaces the triaged result before yielding) — opt-in,
off by default, with a fire-exactly-once loop guard. In-band pipeline-gate dispatch + the §4 schema
deepening are deferred to their own gates.

**Verified:** lens rubric produces a sound A/B/U + triage partition on a sample plan (isolation
test); plugin.json valid; recipient-profile.yaml valid; registered in marketplace.json. The hook
is intentionally absent in 0.1 so nothing fires automatically (no loop risk) while the classifier
is proven.

Design source of truth: `design/verifiability-awareness.md`.
