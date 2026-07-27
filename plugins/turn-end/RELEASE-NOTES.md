# turn-end — release notes

## 0.1.0 — 2026-07-27

First release. One blocking Stop hook over a duty registry, replacing the two mutually
re-arming blocking hooks that shipped in `kb` and `verifiability-lens`.

### Why

`f39a3ee` (2026-07-25, kb 0.6.0) added a **second** blocking Stop hook. Zero of the 28 commits
since 07-24 touched the lens hook — the regression was the pairing, not either half:

- `kb-scribe-stop.js:63` — `PRODUCE_TOOLS` included `Agent`, so the lens's mandated *dispatch*
  turn counted as producing work → scribe blocked.
- The digest-write turn used `Write`; scribe excluded it, but the lens had no scribe guard →
  the lens blocked.
- The fix turn used `Edit` → scribe blocked again.

Measured: kb-scribe blocked 6 and the lens fired 3 in one sitting over ONE user request;
another session ran 8 passes at ~70k tokens each. Separately, `verifiability-stop.js:148`'s
"fire-exactly-once guard" bounds *consecutive* blocks, not total fires — simulating ten work
turns through `decide()` returns block, allow, block, allow, … a steady 50% duty cycle,
unbounded.

### What ships

- **`lib/runner.js`** — pure. Registry walk → per-duty `applies`/`satisfied` → ONE emission.
- **`lib/context.js`** — the single frozen snapshot, with memoized disk reads so every duty
  sees the same tree, and whole-turn transcript extraction.
- **`lib/ledger.js`** — per-`prompt_id` state. A new request resets it.
- **`lib/duties/`** — the extension surface. `session-digest` (from kb) and `quality-lens`
  (from verifiability-lens).
- **`lib/judges/`** — judgment surface; `claude -p` adapter with the recursion guard the
  platform does not provide. No shipped duty uses it.
- **`hooks/`** — the one Stop registration; the adapter holds no policy.
- **49 checks**, own temp fixtures.

### Platform facts established by experiment

Run in a scratch project, not inferred:

- **Prompt hooks bill to the subscription.** Session model `haiku`, hook model pinned
  `claude-sonnet-4-5`; `modelUsage` came back with a separate sonnet entry (`provider:
  firstParty`) inside the same `total_cost_usd`, while `ANTHROPIC_API_KEY` and
  `CLAUDE_CODE_OAUTH_TOKEN` were both unset with no `apiKeyHelper` — no key exists to bill to.
  This supersedes the earlier billing constraint, which was only ever true of a hook calling
  the Messages API itself.
- **Prompt hooks block on Stop**, and `reason` becomes the model's next instruction: asked for
  PEAR, hook returned `{"ok":false,"reason":"…BANANA…"}`, `num_turns` 1→2, result `BANANA`.
- **`stop_hook_active` exists** — false on the first fire, true on the continuation, same
  `prompt_id`. An earlier note claimed no field marks a continuation turn.
- **The platform ends a turn after 8 consecutive blocks.** The runaway was exactly 8 passes.
- **`hookSpecificOutput.additionalContext` on Stop** continues the turn under the same loop
  protections but is labelled `Stop hook feedback` rather than a hook error.
- **`recursion_depth` is not real** — a doc summariser invented it (zero hits in the reference,
  and the same summary also got the response schema wrong). Read the raw doc.
- **`claude -p --bare` cannot be used**: exit 1, *"Not logged in · Please run /login"*.

### Deliberately not in this release

- **essense-autopilot is not yet a duty.** Its decision logic is welded into `main()` (only
  `countInFlightAgents` is exported), so migrating it means first extracting a pure `decide()`
  in that plugin. Shipping a second, thinner "what's next" here would create a competing source
  of truth. Until then autopilot still owns its own blocking Stop hook, and the
  one-blocking-tail invariant holds only where it is not installed.
- **The advance-vs-oscillate verdict.** `quality-lens` ships as `advise` precisely because it
  cannot yet tell a new finding from a repair of its own earlier one. The validation set for a
  future classifier already exists: passes 1–3 advancing, 4–8 oscillating, crossover at 3–4.
