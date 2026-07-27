# turn-end — release notes

## 0.2.2 — 2026-07-27 — a duty that spawns an agent must not be scoped to the prompt

Reported from another project: six lens dispatches back to back, the owner typing nothing.
Diagnosed from that project's own `trace.jsonl`, not from the transcript:

```
02:05:27 pid=271fdc3c fires=0 unmet=[quality-lens]
02:13:01 pid=6dca19d8 fires=0 unmet=[quality-lens]   <- new prompt_id
02:17:11 pid=dab5e557 fires=0 unmet=[quality-lens]   <- new prompt_id
02:21:51 pid=b447d0f8 fires=0 unmet=[quality-lens]   <- new prompt_id
02:24:59 pid=e39019fd fires=0 unmet=[quality-lens]   <- new prompt_id
```

**Seven distinct `prompt_id`s in 24 minutes with no user input.** Each arrived just after a
backgrounded lens agent finished.

**A background-agent completion wakes the session as a NEW prompt.** So `quality-lens` asked
for a dispatch → the agent finished → that wake-up was a new `prompt_id` → fresh ledger → duty
unsatisfied → asked again. The duty's own mandated output manufactured the request that
re-armed it. `satisfied()`'s other arm could not save it either: it checks this turn's
`toolTargets` for the dispatch, and on the wake-up turn the dispatch was a turn ago.

This is the defect the founding capture named — *an actuator that may cause work whose
completion re-fires it* — rebuilt one layer up, because `prompt_id` was taken to be the
user-request span. **It is the PROMPT span.**

Fix: the ledger keeps **two independent buckets**.

| bucket | resets on | holds |
|---|---|---|
| `asked` + `fires` | new `prompt_id` | prompt-span duties |
| `sessionAsked` | new `session_id` | duties declaring `span: 'session'` |

`quality-lens` is now `span: 'session'` — one lens pass per sitting, and its own dispatch can no
longer un-satisfy it. `session-digest` stays prompt-span deliberately: each request *should*
distil itself. The rule for any future duty: **if its ask can cause the next prompt — above all
if it asks for a subagent — it belongs in the session span.**

Regression test replays the measured shape: the seven real `prompt_id`s, one sitting, and the
duty must be asked exactly once. 78 → **84 checks**.

Note what did work: the escalation ladder. `73a35ec3` went advise → block → block and stopped
at the budget. And the digest-cap thrashing visible in that same transcript is the old kb 1500
cap, fixed separately in kb 0.10.0.

## 0.2.1 — 2026-07-27 — find the binary, and never let a broken judge look clean

The first live fire of 0.2.0 wrote `{"id":"context-recall","error":"spawnSync claude ENOENT"}`.

**Why the probe lied.** The manual probe that "proved" the judge ran from a tool shell, where
Claude Code sets `CLAUDE_CODE_EXECPATH`. A **hook subprocess does not get it**, so the adapter
fell back to the bare name `claude`. Measured on this platform:

| candidate | result |
|---|---|
| `claude` | ENOENT — `execFile` does no `PATHEXT` lookup, a bare name never resolves |
| `claude.exe` | ENOENT — the exe lives inside `node_modules`, not on `PATH` |
| `claude.cmd` | EINVAL — Node refuses to `execFile` a `.cmd` without a shell |

and `shell: true` is the thing that hung on a multi-line prompt, so it was not a way out.

`resolveClaudeExe()` now finds a real executable: `CLAUDE_CODE_EXECPATH` when it exists on
disk, else a `PATH` scan restricted to extensions `execFile` can actually run (`.exe`/`.com`,
never `.cmd`/`.bat`), else the npm global payload
(`%APPDATA%/npm/node_modules/@anthropic-ai/claude-code/bin/`). Returns `null` rather than a
name it cannot run, and `judge()` then reports *why* without spawning.

**The second bug was the shape of the first.** The ENOENT reached `trace.jsonl` and nobody's
eyes: `supply()` returned `material: null`, which the runner renders as nothing — identical to
the common, correct "the judge decided nothing was needed". A broken judge that reads as clean
is the exact false-clean this toolkit exists to catch. A judge that cannot run now returns
material saying so, and that *"nothing was recalled" must be read as UNKNOWN, not as "nothing
was needed"*.

Verified: `resolveClaudeExe()` returns the real `claude.exe` with `CLAUDE_CODE_EXECPATH`
deleted from the env — the hook's actual situation. 72 → **78 checks**, including a regression
test asserting the resolved path is a real file and never a `.cmd`.

## 0.2.0 — 2026-07-27 — the recall half: context plugged in, not chores demanded

**This is what the plugin was for.** 0.1.x shipped the frame — one hook, a duty registry, a
`prompt_id` ledger, the escalation ladder — plus a `claude -p` adapter that *nothing called*.
The owner's actual ask was the judge: *"checks if we need additional context plugged in to
produce better results."* That is now built.

### A second duty KIND

A turn can end badly two ways: work left undone, or an answer built without knowledge the
project already had. 0.1.x only modelled the first.

- **demand** (`ask() -> string`) — asks the session to do something. Unchanged.
- **supply** (`kind: 'supply'`, `supply() -> {material}`) — hands the session *material*.

`supply` is the one impure step (it spawns a judge), so the **pure runner only reports that it
is due** (`supplyDue`); the adapter executes it and passes the result back into `decide` as
`materials`. Three passes: pure plan → impure execute → pure compose. The whole policy stays
testable without a session, which is the property the runner exists to have.

### `context-recall`

Looks at what was asked, what was answered, and what this project has already written down;
injects the notes the answer should have been built on.

**Two-phase, and the split is load-bearing:**
1. sources emit an **index** — titles and ids, *no bodies* — and the judge picks ids;
2. the runner **fetches** those ids deterministically.

So the judge *chooses*; it never *summarises*. The session receives the file's own text, and
the call stays small however much the project has written. A test asserts a verbatim marker
from the note body survives into the injected material.

Why a judge and not a ranker: lexical matching answers "which notes share words with this
prompt?" — kb's pull hook already does that cheaply at prompt time. The question here needs
reading: *given this answer, was anything material missed?* An answer can be fluent and quietly
contradict a note whose vocabulary it never used.

**Sources** are the new extension surface (`lib/sources/`), same two levels as duties: a new
*instance* is a config entry over `markdown-dir`; a new *type* is a drop-in. Shipped:
`kb-captures`, `kb-extracted`, `steward-model`. A configured directory that does not exist is
simply empty — that is what keeps this silent where nothing is written down.

**Firing policy — owner directive:** every turn end, no pre-filter. A gate that decides when
recall matters is itself a thing that can be wrong, and a silent miss is the failure this
exists to remove. Measured cost ~11s / ~$0.03 per fire. The fire budget now caps *spend* too:
an exhausted request never schedules a supply duty.

Prompt-injection posture: the request and answer are framed to the judge as **data, not
instructions**, explicitly. `parseVerdict` strips the ```json fence the model measurably tends
to add, and returns `null` on garbage rather than pretending nothing was needed.

### Test harness fix, found the honest way

Three new tests had async bodies and the sync `check()` helper would have counted them as
passing before their assertions ran. `check()` now *rejects* a promise-returning body and
`checkAsync()` collects them, with the report awaiting all of them. It caught all three
immediately. 53 → **72 checks**.

## 0.1.1 — 2026-07-27 — the meta-loop guard judged the NAME, not the shape

Found by the **first live fire**, which is the only reason it was found: the runner emitted one
message naming one duty where a written-down prediction said two. `quality-lens` had silently
excused itself.

Cause: the guard inherited from the retired hook matched `verifiability[_ -]?(class|lens|pass)`,
so any turn containing the plain words "verifiability-lens" read as the lens surfacing its own
rollup. The turn in question was an *answer about which hooks were installed* — it named the
plugin six times and reported nothing. Enumerating spellings of a name answers "was it
mentioned?"; the question is "is this a report?"

Fix — discriminate on the rollup's **form**, two signals:
- a **bracketed tool marker** (`[verifiability-lens]`, `[turn-end]`, `[kb-scribe]`), which the
  tools emit and prose essentially never contains; or
- **two co-occurring structural tokens** from a rollup's vocabulary (`escalations`,
  `auto-resolved`, `suppressed_count`, `unit_type`, `intended_scope`, `context_refs`, `A/B/U`).
  Any one of them shows up in ordinary writing about the lens, so one hit proves nothing; a real
  rollup always carries several at once. `rollup` itself was dropped from the list as too common
  in prose.

Fails closed either way — the old bug skipped the duty rather than looping it — but a guard that
silently suppresses is exactly the false-clean this toolkit exists to catch.

Same over-broad pattern was in the retired `verifiability-stop.js`, so this bug shipped there
first and was inherited wholesale. 49 → **53 checks**, including the near-verbatim prose that
triggered it.

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
