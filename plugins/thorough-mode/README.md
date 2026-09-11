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
| `++` / `@thorough` | Enumerate everything the request contains, work the list item by item, re-read before finishing |
| `@verify` | Prove every claim: run the tests, show the output, name the check that makes "done" checkable |
| `@debug` | Root cause first — read the code, trace to the origin, propose the fix with its rationale before touching anything |
| `@ship` | Pre-push checklist: README, CHANGELOG, version bumps, docs, and the repo guard |
| `@present` | Every choice comes back as an arrow-key question instead of a paragraph |
| `@fresh` | Distrust compressed context — re-read the key files from disk |
| `@prompt` | Write the kickoff prompt for the next cold session, and save it |
| `@build` | Reuse before building; check what already exists first |

Put the keyword anywhere in the message. They stack — `++ @verify` fires both. Describe the
intent without the keyword ("prove it", "root cause", "re-read the file") and you get a one-line
hint naming the shorthand.

## Two things it deliberately does not do

- **It never fires on machine-generated text.** A keyword quoted inside a task notification, hook
  output or a command transcript is ignored; a genuine message that merely mentions one still fires.
- **It never blocks.** Every modifier is injected context — the turn continues either way.

See [CHANGELOG.md](CHANGELOG.md) for what changed between versions.
