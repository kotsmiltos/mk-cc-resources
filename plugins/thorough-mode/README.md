# thorough-mode

Type a keyword, change how the turn is done. No skill to remember, no command to look up — the
modifier is injected the moment your message mentions it.

## Install

```
/plugin marketplace add kotsmiltos/mk-cc-resources
/plugin install thorough-mode@mk-cc-resources
```

Hooks only — install it standalone, not through the bundle.

## Modifiers

| Keyword | What it does |
|---|---|
| `@verify` | Prove every claim: run the tests, show the output, name the check that makes "done" checkable |
| `@debug` | Root cause first — read the code, trace to the origin, propose the fix with its rationale before touching anything |
| `@ship` | Pre-push checklist: README, CHANGELOG, version bumps, docs, and the repo guard |
| `@present` | Every choice comes back as an arrow-key question instead of a paragraph |
| `@fresh` | Distrust compressed context — re-read the key files from disk |
| `@prompt` | Write the kickoff prompt for the next cold session — including where the work must land — and save it; it starts from the previous kickoff and carries your rulings in your words, whatever the project |
| `@build` | Reuse before building; check what already exists first |
| `@fc` | Fewer clicks — everything doable gets done here, the result lands in the terminal instead of a path to open, and what is left is one keystroke |

Put the keyword anywhere in the message. They stack — `@debug @verify` fires both. Without a
keyword nothing is added: the old "Tip: add @x" hints are gone (1.17.0) — they reached only Claude,
never you.

## The kickoff check (1.17.0)

Kickoffs saved in a project's `.claude/prompts/` are checked when this sitting saves them. A kickoff
written in this sitting without its `OWNER ASKED` / `THIS PROMPT ADDS` / `COST` lines gets the same
rules `@prompt` gives, so the session fixes the file before it stops — whether or not you typed
`@prompt`. A kickoff from an earlier sitting is left alone (a later fix to an old kickoff is never
told to reshape it). Nothing to turn on; each decision leaves one line in
`.claude/thorough-mode/trace.jsonl`.

## Two things it deliberately does not do

- **It never fires on machine-generated text.** A keyword quoted inside a task notification, hook
  output, a command transcript, a finished helper's report or another Claude session's message is
  ignored; a genuine message that merely mentions one still fires.
- **It never blocks.** Every modifier is injected context — the turn continues either way.

See [CHANGELOG.md](CHANGELOG.md) for what changed between versions.
