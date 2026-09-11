# mk-cc-resources

A Claude Code plugin marketplace built around one idea: **the session should not depend on you
remembering things.** The plugins here keep the project's direction, its decisions, and its
quality bar outside your head — and put them back in front of Claude at the moment they matter.

Seventeen plugins. Node and Python only, no services, nothing phones home.

## Install

In a Claude Code session:

```
/plugin marketplace add kotsmiltos/mk-cc-resources
/plugin install mk-cc-all@mk-cc-resources
```

`mk-cc-all` is the skills-only bundle. Plugins that carry **hooks** must be installed by name —
the bundle ships declared skill paths and nothing else:

```
/plugin install steward@mk-cc-resources
/plugin install turn-end@mk-cc-resources
/plugin install kb@mk-cc-resources          # the bundle has kb's skills; this adds its hooks + MCP server
/plugin install thorough-mode@mk-cc-resources
/plugin install patterns@mk-cc-resources
```

The `@mk-cc-resources` suffix is required — it names the marketplace the plugin comes from.
From a shell, the same thing is `claude plugin install <name>@mk-cc-resources`.

After installing or updating, **restart Claude Code**. `/clear` does not reload plugins.

## Quickstart — ten minutes to a project that remembers itself

```
/plugin install steward@mk-cc-resources
/plugin install kb@mk-cc-resources
/plugin install turn-end@mk-cc-resources
```

Restart, then in your project:

```
/steward:seed        # reads the repo, drafts a model of it, asks you 3-7 questions
/elicit:elicit       # brainstorms the vision to completion — it questions the gaps you leave
/kb:kb "why did we choose X?"    # ask the project instead of re-deriving
```

What you get from then on, without typing anything:

- **Opening the project briefs you** — where the ship is, what is next, what decisions are
  waiting on you. It tells you when it is stale rather than quietly lying about its age.
- **Talking captures ideas.** A stray thought goes to `.steward/inbox/`; the steward agent folds
  it into the model and shows you the diff of what your thought changed.
- **Ending a turn checks the work.** One consolidated message, once per request: was a check run
  after the last change, was the original question actually answered, is anything unintegrated.

Prefer the full pipeline instead? Start at [essense-flow](plugins/essense-flow/README.md).

## The catalog

Every plugin has its own README (what it does, how to drive it) and CHANGELOG (what changed, in
user terms). **B** marks what the `mk-cc-all` bundle carries; everything else installs by name.

### Think and decide

| Plugin | | Version | What it is for |
|---|---|---|---|
| [elicit](plugins/elicit/README.md) | B | 0.1.0 | Brainstorm a vision to completion — it questions the gaps you leave and teaches the processes you have not worked with |
| [prism](plugins/prism/README.md) | B | 0.1.0 | Panel a question across sole-focus agents, one lens each, then get one compiled plan with the conflicts ruled |
| [patterns](plugins/patterns/README.md) | | 0.1.1 | The named-pattern menu at the design moment — 41 patterns with the trigger that should make you reach for each |

### Build

| Plugin | | Version | What it is for |
|---|---|---|---|
| [essense-flow](plugins/essense-flow/README.md) | B | 0.27.0 | A multi-phase pipeline from pitch to shipped code: elicit → research → triage → architect → build → review → verify, with every agent claim re-checked against disk |
| [essense-autopilot](plugins/essense-autopilot/README.md) | | 0.5.0 | Advances that pipeline between phases without you typing, and halts loudly at the human gates |

### Keep the work honest

| Plugin | | Version | What it is for |
|---|---|---|---|
| [turn-end](plugins/turn-end/README.md) | | 0.10.0 | The single blocking end-of-turn hook, so no other plugin needs one. Plugins ship *duties*; one runner checks them against real state and emits ONE message per request |
| [verifiability-lens](plugins/verifiability-lens/README.md) | | 0.7.0 | Sorts every claim into verified / unverifiable / cannot-tell, reads the code and docs to confirm or refute it, and presses unfinished work to continue |
| [thorough-mode](plugins/thorough-mode/README.md) | | 1.11.3 | Keyword modifiers — `++`, `@verify`, `@debug`, `@ship`, `@fresh`, `@prompt`, `@present`, `@build` |
| [reuse-gate](plugins/reuse-gate/README.md) | | 0.1.0 | One reuse-first reminder per message, at the moment code is first written |

### Remember across sessions

| Plugin | | Version | What it is for |
|---|---|---|---|
| [steward](plugins/steward/README.md) | | 0.6.0 | A living model per project — vision, state, parts, open questions, next tasks — recomputed on every input, with the diff shown |
| [kb](plugins/kb/README.md) | B | 0.14.0 | The project's queryable knowledge base: decisions and their why, dead ends, conventions. Ask before re-deriving |
| [session-lifecycle](plugins/session-lifecycle/README.md) | B | 1.3.1 | `/handoff`, `/resume`, `/claude-md-sync`, `/retro`, `/meta-review` — an append-only handoff history |

### Everyday

| Plugin | | Version | What it is for |
|---|---|---|---|
| [statusline](plugins/statusline/README.md) | | 0.2.0 | Model · task · directory · steward anchor · a normalized context-usage bar |
| [alert-sounds](plugins/alert-sounds/README.md) | | 1.1.1 | Sound, notification, taskbar flash when Claude finishes or needs permission |
| [schema-scout](plugins/schema-scout/README.md) | B | 1.2.1 | Explore any XLSX / CSV / JSON file's real schema from the CLI |
| [project-note-tracker](plugins/project-note-tracker/README.md) | B | 1.8.0 | Track questions per handler in an Excel tracker; generate the meeting agenda |

### Work on plugins

| Plugin | | Version | What it is for |
|---|---|---|---|
| [plugin-toolkit](plugins/plugin-toolkit/README.md) | B | 1.15.0 | Build and maintain plugins — scaffold, version-bump, docs-audit, skill-heal, code-glossary, dry-refactor — plus four repository gates: `repo-guard`, `test-all`, `registry-check`, `harness-stats` |

Bundle: **mk-cc-all 2.28.0**.

## Benched plugins

`miltiaze` · `ladder-build` · `architect` · `safe-commit` · `project-structure` · `repo-audit` ·
`mk-flow` were active in earlier marketplace versions and are preserved on the
**`archive/benched-plugins`** branch — not shipped, recoverable any time:

```bash
git fetch origin archive/benched-plugins
git checkout archive/benched-plugins -- plugins/<name>
```

## Contributing to this repo

```bash
node plugins/plugin-toolkit/bin/repo-guard.js               # exit 1 = do not push
node plugins/plugin-toolkit/bin/test-all.js --root .        # every suite in every plugin
node plugins/plugin-toolkit/bin/registry-check.js --root .  # do the docs match disk?
```

Run all three from the repository root before a push, and read each exit code directly rather
than after a pipe. A plugin is pinned to its version string: **a fix without a version bump
reaches no install** — use `/version-bump` so `plugin.json`, the marketplace entry, the bundle,
the marketplace metadata and the plugin's `CHANGELOG.md` move together.

Per-plugin engineering notes live in `plugins/<name>/CLAUDE.md`; release history older than the
last five versions is kept verbatim in `design/notes/<plugin>-history.md`.

## Credits

Schema Scout inspired by [ckifonidis](https://github.com/ckifonidis). Plugin architecture
inspired by [taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources).

## License

[MIT](LICENSE)
