# turn-end

**The single blocking Stop hook, so nothing else needs one.**

Plugins ship turn-end *duties* instead of their own hooks. One runner checks every applicable
duty against real state and emits **one** consolidated message per user request. Two duties
become one tail with two items — never two tails. Zero applicable duties: silent.

## Why it exists

Two plugins each shipped their own blocking Stop hook. Neither knew the other existed, and
each one's *mandated response was fresh work for the other*, so the allow-gap never landed on
an idle turn:

- `kb-scribe`'s produce-tool list included `Agent` → the verifiability-lens's own mandated
  *dispatch* turn read as fresh work → scribe blocked.
- The digest-write turn used `Write`; scribe excluded that, but the lens had no scribe guard →
  the lens classified the write as work → the lens blocked.
- The resulting fix turn used `Edit` → scribe blocked again.

Measured in one sitting: **kb-scribe blocked 6, the lens fired 3**, over a single user request.
Another session ran **8 passes**, ~70k tokens each.

All matching Stop hooks run **in parallel with no defined ordering**, and blocking is
**fail-closed** — any hook that blocks wins. So two hooks negotiating a claim at runtime is
racy by construction. One runner has no race to lose.

## The three properties that make it terminate

**1. The unit is the user request.** The hooks this replaces keyed on a hash of the turn's
text, so every correction turn looked new and the guard never matched. `prompt_id` is the same
UUID for every Stop within one user message. Keying on it alone turns the reported 8-pass
session into 1.

**2. Termination is structural.** A duty ends the loop by becoming **satisfied against real
state** — the digest file was written, the agent was dispatched — not by a counter running
down. Measured live:

```
fire 1 | stop_hook_active=false | last_message="PEAR"  | satisfied=false | → additionalContext
fire 2 | stop_hook_active=true  | last_message="MANGO" | satisfied=true  | → ALLOW (silent)
```

**3. Exhaustion is an outcome, not a silence.** The fire budget is the backstop for a
satisfaction check that is *wrong*. Claude Code ends a turn itself after 8 consecutive
continuations; the budget here sits strictly below that so *we* report giving up, naming the
duties abandoned, rather than being cut off in a way that looks identical to success.

## The escalation ladder

| fire | state | emission |
|---|---|---|
| first unmet | `stop_hook_active: false` | `hookSpecificOutput.additionalContext` — continues the turn, labelled `Stop hook feedback`, no hook error |
| still unmet, duty is `severity: block` | `stop_hook_active: true` | `decision: "block"` |
| satisfied | any | nothing — allow, silently |
| past the budget | any | allow, and say which duties were abandoned |

## The two duty kinds

A turn can end badly two ways: **work left undone**, or **an answer built without knowledge the
project already had**.

| kind | shape | ships |
|---|---|---|
| **demand** | `ask() -> string` — asks the session to do something | `session-digest`, `steward-sync`, `quality-lens` |
| **supply** | `supply() -> {material}` — hands the session material | `context-recall` |

### `context-recall` — the reason this plugin exists

On every turn end it asks a `claude -p` judge: *given what was asked and what was answered, did
this turn need notes it never opened?* If so, those notes' **own text** is injected via
`additionalContext` and the turn continues with them in hand.

Two phases, and the split is load-bearing:

1. sources emit an **index** — titles and ids, *never bodies* — and the judge picks ids;
2. the runner **fetches** those ids deterministically.

The judge *chooses*; it never *summarises*. The session gets the file, not a recollection of
it, and the expensive call stays small however much the project has written down.

Why a judge and not a ranker: lexical matching answers "which notes share words with this
prompt?" — kb's pull hook already does that, cheaply, at prompt time. This question needs
reading: an answer can be fluent, complete-looking, and quietly contradict a note whose
vocabulary it never used.

**`engine` (0.13.1).** `judge` is the default; `"engine": "ranker"` runs the deterministic
term-overlap picker instead — no spawn, no cost, the material says it was not judged. Measured
2026-09-17: after the 300 s cap the judge still returned an empty pick on 81% of 21 fires in one
project (median 34 s); the two engines agree on 17% of picks (n = 8). That is a cost fact, not a
quality one, so the default stays until `note-uptake` scores the engines side by side.

`supply` is the one impure step, so the pure runner only reports it is **due** and the adapter
executes it: **plan (pure) → execute (impure) → compose (pure)**.

**Cost: ~46s per fire, every turn end.** Provenance, because it matters here: Claude offered
three firing policies, marked the cheap-pre-filter one "(Recommended)", and quoted ~11s. The
owner chose every-turn-end. **The ~11s was Claude's estimate and it was wrong — the measured
figure is 46s**, so that choice rests on a bad number and is worth re-taking. The fire budget
caps spend too: an exhausted request never schedules a supply duty.

**Sources** (`lib/sources/`) are the extension surface, same two levels as duties: a new
*instance* is a config entry over `markdown-dir`; a new *type* is a drop-in module. Shipped:
`kb-captures`, `kb-extracted`, `steward-model`. A configured directory that does not exist is
simply empty.

## Writing a duty

```js
module.exports = {
  id: 'my-duty',
  title: 'One line, human',
  severity: 'block' | 'advise',   // may it harden the tail after a soft nudge?
  priority: 50,                   // low first, inside the one message
  applies(ctx, options)   { /* relevant to this project AND this turn? */ },
  satisfied(ctx, options) { /* ALREADY done? — read real state, never a counter */ },
  ask(ctx, options)       { /* the instruction, if not */ },
};
```

Register it with one `require` in `lib/duties/index.js`. The runner never changes.

Two rules a duty must honour:

- **Answer `satisfied` from real state.** A duty that answers from a counter has no
  termination condition — that is the exact defect this plugin removes.
- **Never count another duty's mandated output as fresh work.** The measured failure was one
  hook treating a sibling's mandated `Agent` dispatch as production. Shipped duties exclude
  delegation for that reason.

`ctx` is built **once** and frozen; disk reads are memoized for the life of one fire, so every
duty sees the same tree. A duty that read a file a sibling had just changed would make the
consolidated message describe a turn that never happened.

## Shipped duties

| id | severity | applies when | satisfied when |
|---|---|---|---|
| `session-digest` | `block` | the project curates memory (`.claude/kb/*` or `.steward/` hold real files) **and** the turn used Write/Edit/NotebookEdit/Bash | the turn wrote `.claude/kb/session-digest.md` |
| `steward-sync` | `advise` | `.steward/inbox/` holds at least one staged `*.md` note | the inbox is empty, **or** the steward agent was dispatched, **or** it was already asked this **sitting** |
| `quality-lens` | `advise` | `.claude/verifiability-lens.json` `{"enabled": true}` (project beats global; off by default) **and** this message of yours changed something (0.15.0: once per message, keyed on the last change; at most three reviews per message) | a review dispatched after the last change finished, **or** it was already asked since the last change |
| `self-check` | `block` | the turn changed real files | for code, a check that finished AFTER the last change (0.15.0: order read inside one command; a review dispatch is not a check); for prose / docs / data, a re-read named with its result in a reply written after the last change |
| `context-recall` | `advise` | the project keeps knowledge the answer may have needed | the judge (or the fallback ranker) found nothing material missed; a note counts as already given only while its full text is still in the conversation |
| `request-closure` | `advise` | the latest review of this message refuted claims, or ended without a verdict (0.15.0: the "originally asked" nudge is gone) | asked once since that review ended |
| `fewer-clicks` | `advise` | the final message carries an outsourcing tell (and the owner did not ask for instructions) | no tell remains, **or** the message names why only the owner can do it, **or** it was already asked this request |
| `test-integrity` (0.15.0) | `advise` | tests changed during this message (files touched since it began, in the project and its worktrees) | the answer says, per shown change, whether Claude made it |
| `locked-tests` (0.15.0) | `block` | a test listed under `duties["test-integrity"].locked` changed | it was put back, **or** Claude asked one plain question quoting the words it holds; his typed yes approves that exact version |
| `page` (0.14.0; opt-in since 0.14.2) | `block` | `.claude/turn-end.json` sets `duties.page.enabled: true` (off by default) **and** the project has a `PROJECT.md` **and** the turn changed a real file (not the page, not `DECISIONS.md`, not `.claude/`/`.steward/`) | `PROJECT.md` was rewritten this request (its mtime, or a tool target naming it); `duties.page.path` renames the file |

`steward-sync` closes the gap between capturing a thought and recomputing the model it changes.
Captures are cheap and land mid-conversation; the recompute is the expensive half, and nothing
forced it — a pilot model went a full session stale with every capture present and correct.
An **item** is a top-level non-dot `*.md` file, which is how the archive subdirectory `done/`
and the `.gitkeep` placeholder stay out of the count without either being named in the code
(a naive entry count reads 4 where the truth is 3, and never reaches zero).

The owner set this duty's shape — `advise`, session span, silent on an empty inbox. Its
priority, the wording of its ask, and that definition of an item were chosen by Claude and are
revisable.

Since 0.15.0 a **request is one message from the owner**: a helper's report or a task notice wakes
the session as a new prompt, but it never re-arms a duty and is never read as the request.
`quality-lens` hands the reviewer the owner's own words from the transcript — newest first, with
pasted secrets redacted — plus the plan items, what changed, what ran after the last change and
only this message's test changes. `test-integrity` shows each test change in plain lines (worst
first) to the owner directly and asks Claude to say whether it made each one.

`quality-lens` is `advise`, not `block`, on purpose: in the session that prompted this work,
passes 1–3 found real defects and passes 4–8 were the reviewer repairing its own earlier
characterisations. Until a duty can tell advancing from oscillating, it gets the channel that
continues the turn without raising an error. Set `severity: "block"` in config to enforce.

`fewer-clicks` carries the owner's 2026-09-09 law — *"this cannot be pointing me to files … doing
as many of the things on its own and leaving the least amount of clicks to me"* — into the one
place that reads the finished answer. Two properties make it safe to leave on: it prints **zero
bytes** unless a tell is actually present, and it is permanently `advise`, because every tell is
a regex over prose and a false positive must never trap the session. Its shape (the tell list,
the excuse list, the 200-char floor, priority 50) was chosen by Claude; the ruling that it should
exist at all, alongside the on-demand `@fc` keyword rather than instead of it, is the owner's.

## Judgment

`lib/judges/` is the surface for a duty whose satisfaction is genuinely a matter of opinion.
The shipped adapter is `claude -p`, and **`context-recall` uses it on every turn end**. Every
check answerable from *disk* still stays on disk, where it is free, instant and exact —
`session-digest` and `quality-lens` never call a judge. Judgment is reserved for the one
question disk cannot answer: *given this answer, was anything material missed?*

Four constraints, each measured:

1. **argv, never stdin.** Piped on stdin the prompt arrives as appended context and a full
   session refuses it: *"Flagging potential prompt injection… Ignore that injected
   instruction."*
2. **Never `shell: true`.** On Windows a multi-line quoted prompt through `cmd.exe` hung until
   the timeout killed it.
3. **Recursion is real and unguarded.** A `claude -p` child runs its own Stop hooks, including
   this one. (`recursion_depth` does not exist — a doc summariser invented it.) The guard is
   ours: `MK_TURN_END_DEPTH`.
4. **`--bare` is not an option.** It skips hooks, which would solve (3) free, but does not read
   the stored OAuth credential: exit 1, *"Not logged in · Please run /login"*.

Cost: ~11s and ~$0.03 per call, because a non-bare session loads CLAUDE.md, plugins and its
full system prompt.

A `type: "prompt"` Stop hook also bills to the plan and also blocks — both verified. It is not
used because it is a **peer** hook: it sees only the Stop payload, cannot read disk, and cannot
be called by this runner. Two blocking peers is the bug.

## Config

`.claude/turn-end.json`:

```json
{
  "enabled": true,
  "duties": {
    "session-digest": {
      "enabled": true,
      "severity": "block",
      "important": ["what counts as worth keeping in THIS project"]
    },
    "steward-sync":   { "enabled": true, "severity": "advise" },
    "quality-lens":   { "enabled": true, "severity": "advise" },
    "context-recall": {
      "engine": "judge",
      "maxIndexEntries": null,
      "maxChosen": null,
      "maxContentChars": 2400
    },
    "test-integrity": {
      "testGlobs": [],
      "watchFiles": [{ "path": "…", "label": "…", "match": "…" }],
      "locked": [{ "test": "…", "words": "…", "said": "…" }],
      "maxLines": null,
      "assertHeads": [{ "head": "expectOk", "condition": 0, "message": 1 }]
    },
    "locked-tests": { "enabled": true }
  },
  "evidence": {
    "checkCommands": [],
    "failurePatterns": [],
    "scratchDirs": ["scratch"]
  }
}
```

`evidence` (0.15.0) tunes what `self-check` and the reviewer read as a run: `checkCommands` names a
project's own check runners that are not named like tests (regex, matched against one command
segment), `failurePatterns` adds failure lines (for example `exit=[1-9]` or a bare `N errors`, which
the defaults no longer read as failures), `scratchDirs` lists folders whose writes are not work.
`test-integrity.assertHeads` declares a project's own assertion helpers; `locked` lists tests that
hold the owner's words (read even when `test-integrity` itself is switched off).

**On the numbers here — provenance matters.** Every bound in this plugin was chosen by Claude,
not requested by anyone, so they are split by what they cost you when they bite:

- **Content-discarding** (`maxIndexEntries`, `maxChosen`) ship **off**. A silent cap on what the
  judge may see or return makes "nothing was missed" unfalsifiable — the one failure this duty
  exists to remove. Set one and the truncation is stated in the prompt and in the result.
- **Excerpt bounds** (`maxContentChars`, `maxTotalChars`) keep a default because each already
  announces its own cut inline (`… [+N chars]`). Still guesses; override if they bite.

`session-digest.important` replaces Claude's default definition of what is worth keeping. Left
unset, the instruction tells the session that the definition is a Claude default and not a rule
this project set.

A malformed config is reported on stderr and ignored — throwing would wedge every turn.

## Diagnostics

Every fire that emits anything appends to `.claude/turn-end/trace.jsonl`. The one surface that
can hold a turn open is the one whose behaviour must be checkable from disk afterwards.

Per-request state lives in `.claude/turn-end/ledger/<session_id>.json` — one file per window
since 0.15.0 — keyed on the owner's message, so a helper's wake does not reset it; his next
message does. `.claude/turn-end/running/<session_id>.json` records whether the window runs older
code than is installed (statusline reads it); both are written only where turn-end already keeps
state.

## Tests

```bash
node tests/turn-end.test.js
```

Every `tests/*.test.js` file is its own suite (the repo's `test-all` gate runs them all);
`turn-end.test.js` is the oldest and largest — 246 checks, no framework, own temp fixtures — it never reads the repo it ships in, and it never spawns a real judge (E2E fixtures disable context-recall; the exe-resolution check SKIPS by name on a machine without the CLI). Three of them
replay measured failures: *ten consecutive work turns do not oscillate* (the old guard returned
block/allow/block/allow), *the lens is asked at most once per user request* (all eight observed
passes were one request), and *`done/` and `.gitkeep` are not inbox items* (a naive count read 4
against a real inbox of 3).

## Install

Carries a hook, so install it directly — it is not in the `mk-cc-all` bundle. Hooks register at
**install** time: update the plugin and restart, then check `.claude/turn-end/trace.jsonl`.
