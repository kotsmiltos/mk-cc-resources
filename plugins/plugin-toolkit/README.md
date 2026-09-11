# plugin-toolkit

Tools for working ON Claude Code plugins — and four gates for the repository that ships them.

## Install

```
/plugin marketplace add kotsmiltos/mk-cc-resources
/plugin install plugin-toolkit@mk-cc-resources
```

The skills reach you through the `mk-cc-all` bundle too; the `bin/` gates below only exist where
this repository is checked out, because a bundle ships declared skill paths and nothing else.

## Skills

| Command | What it does |
|---|---|
| `/skill-heal <plugin>` | Audit a plugin's skills against current best practice — parallel review agents, a per-skill scorecard, ranked fixes. Diagnostic only. |
| `/plugin-scaffold <name> <skills>` | Bootstrap a plugin: directory tree, `plugin.json`, skill skeletons, marketplace entry, bundle wiring, README, CHANGELOG, CLAUDE.md notes. |
| `/version-bump <plugin> <patch\|minor\|major>` | Cascade a version across `plugin.json`, the marketplace entry, the bundle, marketplace metadata and `CHANGELOG.md` — and verify they all agree afterwards. |
| `/docs-audit [plugin\|all]` | Cross-check the docs against disk: version mismatches, stale references, missing entries, with the fix per file. |
| `/code-glossary [path]` | Index every function in a codebase, fingerprint it, cluster the duplicates, and write `GLOSSARY.yaml` + `GLOSSARY.md`. Also measures duplication drift between runs, module coupling, and how many edit sites adding one instance costs. Proposes; never refactors. |
| `/dry-refactor <glossary.yaml> <id>` | Turn one extractable cluster into a reviewable plan — seven pre-flight gates, then the synthesized helper and the per-site edit list. Writes no source. |

## Repository gates

Run these from the repository root, and read the exit code directly — never after a pipe.

```bash
node plugins/plugin-toolkit/bin/repo-guard.js              # exit 1 = do not push
node plugins/plugin-toolkit/bin/test-all.js --root .       # every suite in every plugin
node plugins/plugin-toolkit/bin/registry-check.js --root . # do the docs match disk?
node plugins/plugin-toolkit/bin/harness-stats.js --root .  # is any of this doing anything?
```

- **repo-guard** — leaked machine paths, shell whose failure is indistinguishable from success,
  fix-the-fix commit chains, and guard lists that have drifted apart between plugins.
- **test-all** — discovers suites by shape, so a new one is covered the day it lands. A suite that
  exits 0 while printing failures is reported as suspect, never as green; so is one that runs and
  checks nothing.
- **registry-check** — checks the claims the marketplace, the bundle and the docs make about this
  repo against what is actually on disk. It checks; it never generates.
- **harness-stats** — one scorecard over every trace, ledger and transcript the project left
  behind: hook bytes per prompt, whether surfaced notes were used, nudges and blocks, judge cost
  and agreement, and whether the code you are running is the code you installed.

## Scope limit worth knowing

`/code-glossary`'s coupling and cross-file clustering assume ONE codebase whose modules genuinely
import each other. Run across a marketplace of independently-installed plugins they mislead —
phantom cross-plugin coupling, and extraction proposals that would pin separately-versioned
plugins to each other. Run it per plugin.

See [CHANGELOG.md](CHANGELOG.md) for what changed between versions.
