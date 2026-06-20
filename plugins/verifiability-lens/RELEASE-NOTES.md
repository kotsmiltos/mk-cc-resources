# verifiability-lens — Release Notes

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
