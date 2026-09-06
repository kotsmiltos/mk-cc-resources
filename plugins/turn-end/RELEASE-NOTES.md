# turn-end — release notes

## 0.7.0 — 2026-09-06 — the accountable, cheap, un-loopable turn end (audit 2, tasks #22 #23 #24)

Judge child spawned LEAN — `--setting-sources ""` + `--disable-slash-commands` +
`--strict-mcp-config` (measured on a one-word probe: 33.0 s → 3.9 s wall, no hook fires,
OAuth intact; the empty source list is UNDOCUMENTED and works because empties are filtered
before validation, so the spawn is fail-open: an argument-class failure retries once without
the lean args and the verdict says `lean: applied | fallback`; a timeout never retries).
DEFERRAL primitive: a duty may return a named reason from `defer()`; lib/deferral.js holds
the shared predicates (background agents in flight — derived from the transcript's launch
tool_use ids vs `<tool-use-id>` completion notices, no payload field required; plan mode via
the documented `permission_mode`). request-closure + quality-lens defer while agents run;
session-digest also under plan mode. Exhaustion note emitted ONCE at the budget line, silent
after (measured 08-27: the note continued the turn six times until the platform's cap).
Tail renders DEMANDS first, then errors, then material, hard-capped at 9,000 chars — under
the platform's ~10 KB inline bound past which a hook's output is replaced by a 2 KB preview
(measured 53× + once for this runner's own tail); the BRIEF (pointer) form stands in when the
full text would not fit, and the substitution is said. Session-scoped `sessionSupplied`
memory: a note already handed over this sitting returns as one pointer line. Errored duties
are never silent. session-digest satisfied against the request's own transcript timestamp,
not the first fire's. steward-sync joins the status.json ledger (files never move; the ask
listed integrated items forever). Trace carries engine / ms / costUsd / lean / deferred /
errors / satisfied_by / agents_in_flight / emitted_chars / payload_keys / permission_mode —
dogfood leg (b) is computable from disk at last. Suite: 170 checks in ~1 s (E2E fixtures
disable recall; no real judge spawn; exe check skips by name without a binary).

## 0.6.0 — context-recall: fail-open ranker fallback (the judge stays)

Owner ruling 2026-08-23, verbatim: '46 seconds is not really a problem… we go for quality,
not necessarily speed.' The judge STAYS the default engine — its choice quality is the
point. But a judge death used to lose the whole recall payload (measured: three live
ETIMEDOUTs in ONE sitting, 2026-08-23; 39/52 timeout kills before 0.3.1), and a dead fire
IS a quality failure. Now, when and only when the judge cannot deliver, a deliberately tiny
term-overlap ranker picks instead (floor: 2 shared terms; cap 3) and the injected material
NAMES the engine ('recall via FALLBACK RANKER — the judge could not run (…)'); supply()
returns engine: 'judge' | 'fallback-ranker' for the trace. Zero lexical matches still
reports could-NOT-run naming BOTH engines. The ranker is turn-end's own copy on purpose —
importing kb's would couple independently-installed plugins. 146/146 (3 new).

## 0.5.0 — 2026-08-10 — request-closure: end by answering the user, not the last agent

A sixth duty. Owner symptom (verbatim in
`.steward/inbox/20260810-1914-final-message-must-answer-original-request.md`): "if agents fire
and things happen then at the end i should get a neat message answering my first thing, not
what the last agent did." The mechanism was already measured
(`.claude/kb/captures/20260727-0800-a-background-agent-completion-is-a-new-prompt.md`): a
backgrounded agent finishing wakes the session as a NEW prompt, the model perceives the
task-notification as the request and reports the agent's return; the user's actual question is
turns back. The extraction always saw through this — wake entries are non-boundaries, so
`ctx.turn.userRequest` still held the genuine ask — but nothing handed that fact back to the
model at the moment it yields, and no duty policed the ANSWER (all five police work
discipline).

`request-closure` applies when the span was woken by an agent or dispatched one, and its ask
embeds the user's VERBATIM request plus the span's agent activity: lead with the answer to
THAT, then one who-did-what line per agent, machinery notes last. PROMPT span deliberately —
the inverse of quality-lens's reasoning: every wake is a new prompt_id, so the prompt bucket
resets and the duty re-nudges at EVERY wake-yield, each of which is a user-visible resting
state. Safe because this ask spawns nothing — it can never manufacture the prompt that
re-arms it, so the session-span rule for agent-asking duties does not bind. Satisfaction is
asked-once-per-prompt from the ledger: whether prose "answers" a request is not decidable
without a judge, and this duty is deliberately zero-tokens — compliance trusted after one
nudge, `advise` by default, promotable per project.

New turn fact `turn.wakeCount`: machine-classified `<task-notification>` user entries in the
span. `WAKE_MARKERS` is the open surface — a scheduled wake-up becomes a new marker, not new
code; a user pasting a marker mid-message leads with their own text and never counts.

**Set by the owner:** that the guarantee exists; severity default left to Claude's
recommendation. **Chosen by Claude, not requested:** `advise` first, prompt span (diverging
from the lens-review suggestion of a third request-span ledger bucket — unnecessary once the
per-wake cadence is the desired one), priority 40, the 600-char excerpt clip. 143/143 checks
(10 new, including the full nudge→release→re-arm replay and junk-transcript robustness).

## 0.4.1 — 2026-08-03 — state anchors to the project root; the steward ask goes terse

Measured twice in one sitting: `payload.cwd` follows the shell's `cd`, so running a plugin's
tests left a stray `plugins/<name>/.claude/` ledger AND split the session-span ledger across
cwd buckets — a duty that had already asked re-asked from the fresh bucket, which the owner
met as a duplicate quality-lens demand. All state (config, ledger, trace) now anchors to the
nearest ancestor holding `.git` (dir or file — worktrees included), never adopting HOME or
anything above it (a dotfiles repo at `~` would otherwise swallow every non-git dir on the
machine, including test tempdirs); with no `.git` the raw cwd stands, so non-git behavior and
every existing fixture are unchanged. New E2E: a fire from a subdir writes ONE ledger at the
root and no stray state.

steward-sync's ask cut from a six-line recompute sermon to two lines naming the items and the
action (owner directive, "make the steward lighter") — the recompute discipline lives in the
steward agent's own mandate, not re-prosed on every fire. It also now says the batching rule
out loud: dispatch only if the sitting's one background pass has not run. The home-boundary
guard compares case-insensitively on Windows (c:\users\… vs C:\Users\… walked past the
boundary and could adopt a dotfiles .git). 133/133 checks.

## 0.4.0 — 2026-08-01 — self-check: no more "DONE" without a check

A fifth duty, and the first default-ON blocking one. Owner directive (verbatim in
`.steward/inbox/20260801-2349-self-check-before-done.md`): "when claude comes back with his
work, it has already checked it's own work … just arbitrarily calling 'DONE' … make sure this
has happened before finishing and me having to ask." The triggering incident, another project:
terrain authored blind — verified by sampling numbers, never rendered, never looked at;
"verifiably correct" shipped where "looks right" was the bar, and the owner had to ask.

`self-check` is the CHEAP tier of that guarantee: zero tokens, pure scans over the turn
snapshot. A turn that changed real files may not yield until ONE evidence detector passes: a
check-shaped command ran AFTER the last change (test/lint/typecheck/build runners), the turn
executed what it wrote AND LOOKED at the output (a render script run then its output Read;
vcs/file-plumbing commands never count as runs), the verifiability lens was dispatched (the
deep tier supersedes), or the final message NAMES the check with its observed result
("Check: node tests/x.test.js → 110/110 pass"). The last is the universal escape hatch —
whatever exotic check the work needed, one sentence satisfies — and it is what makes
`severity: block` safe: compliance is never more than a sentence away, and a false "Check:" is
an EXPLICIT claim the deep tier or the owner can catch, strictly better than the silent
no-check this duty kills. quality-lens stays opt-in (~70k tokens a pass, firing economics
deliberately parked): the tiers are complementary, not competing.

**Set by the owner:** that the guarantee exists, default-on, before-yield ("me having to ask"
is the failure mode). **Chosen by Claude, not requested:** the tier split, `block`, priority 15,
the four starter detectors, the internal-tree exclusions (`.claude` / `.steward` / `.pipeline` +
tmp — mandated bookkeeping is not fresh work, the registry's re-arm rule), and fail-toward-
silence when the ordered snapshot is absent. Demote or disable per project:
`.claude/turn-end.json` → `{"duties":{"self-check":{"severity":"advise"}}}` / `{"enabled":false}`.

Ordering is load-bearing — a check that ran before the last edit verifies nothing about the
edit — so `extractTurn` now also emits ORDERED `toolCalls` `[{name, target?, command?}]`; the
flat name/target lists cannot express "after". Evidence detectors are an open registry
(`EVIDENCE`): a new modality is a new detector, never a runner change.

**Second owner pass, same day (verbatim):** "this needs to have ways to look right? it needs
to have used enough logs for it to be able to understand what happened … and it also should
check that it tested to break it and not only happy paths." Bare execution refused:
`ran-and-looked` requires a Read AFTER the run; non-executing command heads (`git`, `cat`,
`rm`, …) never count as runs; the ask now teaches the full loop — run with enough logging
that the output SAYS what happened (can't-read-it is a finding, not a pass), compare observed
vs ASKED, and at least one break attempt off the happy path. What no regex can judge (were
the breaks real, was it what was asked) stays the deep tier's job.

**Lens pass over the build found two more, both fixed:** (1) a `decision:block` reason lands
in the transcript as a USER-role `Stop hook feedback:` entry and reset `extractTurn`'s turn
boundary — the post-block fire saw an empty turn and every duty silently released, so the
ladder's hard rung dissolved and a refusal read identical to success; boundary detection now
skips machine-prefixed user entries (the same prefix rule kb-pull and thorough-mode already
apply), with a real-shaped replay test. (2) The named-check regex accepted the planning
phrase "make sure the tests pass" — result tense only now.

130/130 checks (was 110): the full ladder replayed (nudge → comply → allow; ignore → block),
before-the-edit checks rejected, run-without-look rejected, git-naming-the-file rejected,
planning prose rejected, block-feedback boundary replayed with the real transcript shape,
bookkeeping writes not counted as work, old snapshots silent, plus an adapter E2E.

Duties register at install time — `claude plugin update turn-end@mk-cc-resources` + restart
before expecting the new duty. **0.4.0 is unproven-live until one full-ladder live fire is on
record** (edit a scratch file, yield unchecked, ignore the nudge, confirm block → comply).

## 0.3.1 — 2026-07-31 — the hook budget no longer kills its own judge

`hooks.json` set `timeout: 30` while a real context-recall fire measures ~40–46s against a real
corpus — so the platform killed the WHOLE runner at ~31–32s on exactly the fires where the judge
ran. A platform kill loses everything: every duty's output, not just the verdict, and the
`hook_cancelled` record reaches only the transcript, nobody's eyes. Measured across 50 sessions /
4 projects (/doctor scan, 2026-07-27→31): 39 of 52 turn-end fires died at the timeout;
crowd-game never completed one.

Now `timeout: 90`. The invariant the 30 violated: **the hook budget must exceed the judge
budget.** The judge already carries its own 60s execFile timeout and degrades to a NAMED
no-verdict ("context recall could NOT run…") — that is the budget that should govern, and it can
only govern if the platform doesn't kill the runner first. Measured pass after the change: one
real end-to-end fire against a live session transcript — judge ran, clean verdict, 40.6s,
exit 0, trace line written.

Evidence: `.claude/kb/captures/20260731-1950-turn-end-stop-timeout-kills-its-own-judge.md`.
Found by /doctor + the verifiability-lens (which upgraded the attribution from plausible to
proven by reading `hooks.json:12` against the measured 46s). Hooks register at INSTALL time —
`claude plugin update turn-end@mk-cc-resources` + restart before expecting the new budget.

## 0.3.0 — 2026-07-27 — a third duty: the model gets recomputed, not just written to

`steward-sync`. A living model is only worth what its last recompute was worth. Captures land in
`.steward/inbox/` mid-conversation and cost nothing to write; the RECOMPUTE is the expensive
half, and nothing forced it — a pilot model went a full session stale, its state front asserting
one thing while the tree said another, with every capture present and correct. Staging a capture
is not recomputing a model, and the stale front is exactly the part staging does not touch.

**Shape set by the owner:** `severity: advise`, **session** span, silent on an empty inbox,
applies on `.steward/inbox/*.md` count > 0, satisfied on count == 0. **Chosen by Claude, not
requested:** the priority (25, between the digest and the lens), the wording of the ask, and the
definition of an item.

**Session span is load-bearing here.** The ask is *dispatch the steward agent*, and a
backgrounded agent's completion wakes the session as a new `prompt_id` — so a prompt-span record
would reset at the exact moment the dispatch paid off. This is the same defect that produced the
span axis in 0.2.x, and the duty that would have re-triggered it.

**What counts as an item is modelled, not enumerated.** The inbox also holds `done/` (the archive
of integrated items) and `.gitkeep` (present only so a directory whose contents are gitignored
survives a clone). Counting directory entries reads **4** against a real inbox of **3**, and
never reaches zero, because the placeholder is permanent. An item is therefore a top-level FILE
whose name ends in `.md` and does not begin with a dot — which excludes both without naming
either, and excludes the next placeholder some tool drops in.

**New disk primitive:** `ctx.disk.list(rel)` returns typed, sorted directory entries — memoized
with every other read, so two duties can never see different trees. It is deliberately
meaningless on its own: duties disagree about which entries count, so filtering is the duty's
job. `hasFilesIn` is now derived from it rather than doing its own `readdir`, so the two cannot
disagree about a tree and one syscall serves both.

95 → **110 checks**. Beyond the duty's own behaviour: the `done/`+`.gitkeep` count is a named
regression, the span is asserted at the contract, seven `prompt_id`s in one sitting must produce
exactly one ask, and an end-to-end fire proves the adapter's `sessionSpanIds` derivation
actually files this duty in the session bucket (the one seam unit tests cannot reach).

Also corrected here: this README claimed **72 checks** when the suite ran 95 — a hand-written
count going stale, the defect class the project already has on its own task list.

## 0.2.4 — 2026-07-27 — satisfaction must be a DISK fact, not a tool-call fact

Found by the duty refusing to clear while the file it demanded already existed and had just been
updated. `session-digest.satisfied()` checked only `toolTargets` for a `Write`/`Edit` carrying
the digest's `file_path`. The digest had been written with **Bash**, which carries no
`file_path`, so the check saw nothing and kept asking.

The design note for this duty says satisfaction is *"a disk fact … rather than a content hash of
the turn's text"* — and then the implementation asked **how** the work was done instead of
**whether** it was done. Same family as a sweep matching a name instead of a shape.

Tool evidence stays as the fast path (exact when present). The general path is the file's own
`mtime` against `startedAt`, a new ledger field stamped when a request's ledger is created — so
"did this file change during this request?" is answered from disk and cannot be fooled by the
method used.

93 → **95 checks**: a digest written by a `Bash` turn with no `file_path` anywhere must satisfy
the duty, and a digest untouched since the request began must not.

## 0.2.3 — 2026-07-27 — stop speaking in the owner's voice, and stop capping silently

Owner: *"we originally put a stupid/wrong number in that you decided to do on your own, i never
spoke something of it"* … *"not just numbers but in general not speaking and doing things in my
voice."* Three fixes, all requested.

**1. The false "owner directive".** Source, README and RELEASE-NOTES all recorded the firing
policy as an owner decree. What happened: Claude wrote a 3-option menu, authored every option,
marked one "(Recommended)", and quoted ~11s per fire — a figure that **measured 46s**. The owner
picked an option. Recorded now as exactly that, with the bad estimate visible, because a choice
made on a wrong number should stay revisable instead of hardening into a rule.

**2. The IMPORTANT definition was Claude's, delivered as doctrine.** `session-digest`'s ask told
every session what knowledge is worth keeping, in text a model reads as law, indistinguishable
from something the project set. It now SAYS it is a Claude default, and a project can replace it
outright: `{"duties":{"session-digest":{"important":[…]}}}`. When set, the disclaimer disappears
— an owner-set rule is not hedged.

**3. Silent caps that made "nothing was missed" unfalsifiable.** `MAX_INDEX_ENTRIES = 80` capped
what the judge could even see, with nothing reporting it — the same bug as the retired 1500-char
digest cap, not merely the same shape. Auditing it surfaced a **worse one underneath**:
`markdown-dir` defaulted to `maxEntries || 60`, and no shipped source overrode it, so every index
had already stopped at 60 notes before the 80 was reached.

Bounds are now split by what they cost when they bite:

| class | examples | default | when it bites |
|---|---|---|---|
| content-discarding | `maxIndexEntries`, `maxChosen` | **off** | stated in the prompt (`LIST TRUNCATED — showing N of M … you have NOT seen the rest`) and in the result (`the judge asked for N notes … dropped, not judged irrelevant`) |
| excerpt | `maxContentChars`, `maxTotalChars` | kept | already announced inline by `clip()` |

`parseVerdict` no longer silently slices the judge's answer; capping moved to `supply()`, the one
place that still knows how much was dropped and can say so.

87 → **93 checks**, including: defaults assert as literally `null`, a truncated index must carry
both numbers, a clipped selection must be reported, and `markdown-dir` must index all 75 of 75
notes.

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

**Firing policy — what happened:** Claude offered three options, marked the cheap-pre-filter one
"(Recommended)", and quoted ~11s per fire. The owner chose every-turn-end. **That ~11s was
Claude's estimate and it was wrong — measured 46s** (see 0.2.1), so the choice rests on a bad
number and is worth re-taking. It was recorded here and in source as an "owner directive" until
0.2.3 corrected it. The fire budget now caps *spend* too: an exhausted request never schedules a
supply duty.

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
