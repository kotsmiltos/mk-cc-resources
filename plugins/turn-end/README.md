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
| **demand** | `ask() -> string` — asks the session to do something | `session-digest`, `quality-lens` |
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

`supply` is the one impure step, so the pure runner only reports it is **due** and the adapter
executes it: **plan (pure) → execute (impure) → compose (pure)**.

**Cost:** ~11s and ~$0.03 per fire, every turn end, by owner directive — a gate deciding when
recall matters is itself a thing that can be wrong. The fire budget caps spend too: an
exhausted request never schedules a supply duty.

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
| `quality-lens` | `advise` | `.claude/verifiability-lens.json` `{"enabled": true}` (project beats global; off by default) **and** the turn did substantive work | the lens was dispatched, **or** it was already asked this `prompt_id` |

`quality-lens` is `advise`, not `block`, on purpose: in the session that prompted this work,
passes 1–3 found real defects and passes 4–8 were the reviewer repairing its own earlier
characterisations. Until a duty can tell advancing from oscillating, it gets the channel that
continues the turn without raising an error. Set `severity: "block"` in config to enforce.

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
    "session-digest": { "enabled": true, "severity": "block" },
    "quality-lens":   { "enabled": true, "severity": "advise" }
  }
}
```

A malformed config is reported on stderr and ignored — throwing would wedge every turn.

## Diagnostics

Every fire that emits anything appends to `.claude/turn-end/trace.jsonl`. The one surface that
can hold a turn open is the one whose behaviour must be checkable from disk afterwards.

Per-request state lives in `.claude/turn-end/ledger.json`, keyed by `prompt_id`; a new request
resets it.

## Tests

```bash
node tests/turn-end.test.js
```

72 checks, no framework, own temp fixtures — it never reads the repo it ships in. Two of them
replay the measured failures: *ten consecutive work turns do not oscillate* (the old guard
returned block/allow/block/allow), and *the lens is asked at most once per user request* (all
eight observed passes were one request).

## Install

Carries a hook, so install it directly — it is not in the `mk-cc-all` bundle. Hooks register at
**install** time: update the plugin and restart, then check `.claude/turn-end/trace.jsonl`.
