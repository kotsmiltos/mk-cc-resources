# Release notes — essense-autopilot

## 0.4.2 - 2026-09-11 - vendored js-yaml ships its ESM entry point

An installed plugin cannot run `npm install`, so js-yaml is vendored - but this plugin's
`.gitignore` ignores `node_modules/`, so the force-added files went in WITHOUT `dist/`, and
js-yaml 4's exports map resolves `import "js-yaml"` to `./dist/js-yaml.mjs`.

This plugin was NOT failing: it loads js-yaml through `require("js-yaml")` -> `index.js`, which was
present. The missing file was latent - the first ESM `import` anywhere in its tree (or a
dependency's) would have failed the same silent way essense-flow did. Fixed rather than exempted.

Now committed whole (3 `dist/` files); both loaders verified. Guarded going forward by
plugin-toolkit's `vendored-entrypoint` registry-check claim, which resolves every vendored
`exports`/`main`/`module` target against disk and FAILS the run on a miss - per CONDITION, not
per package. Version bumped because a plugin is pinned to its version string: without a bump the
fix would never reach an install.

## 0.4.1 — 2026-09-06 — lazy yaml, no bash wrapper

js-yaml loads only after the `.pipeline/` walk finds a pipeline; a non-pipeline repo pays
node startup and nothing else (measured 236–346 ms → ~100 ms per Stop, ~430 fires in audit 2).
hooks.json invokes node directly (`command: node, args: [...]`, the turn-end shape) instead
of a bash wrapper that cost ~70 ms per fire. Inside a pipeline project a missing js-yaml is
now REPORTED in the allow reason instead of a silent exit.

## 0.4.0 — Flat state schema support + gates derived from the state machine

The autopilot was silently broken against every current essense-flow project: it read `state.pipeline.phase`, but essense-flow's state schema has been flat (top-level `phase`/`sprint`/`wave`) since 0.9 — every Stop-hook fire halted with "no pipeline block". It also keyed blockers on `blocked_on`, a field the live schema replaced with `halt_reason`.

- **Both state shapes accepted** — flat preferred, the legacy `pipeline:` block still tolerated for old projects.
- **Blocker detection** — `blocked_on` (legacy) or `halt_reason` (live schema).
- **`human_gates` + `terminal` derive from essense-flow's `references/transitions.yaml`** when the plugin is installed as a sibling — the state machine owns those lists; the autopilot can no longer drift from it. Hardcoded defaults remain the fail-soft fallback, and per-project `config.yaml` still overrides both.

Verified: 44/44 tests (3 new flat-schema cases pin the advance, `halt_reason`, and human-gate paths; all legacy fixtures still pass); live sandbox run against a flat-schema project emits the `/architect` advance decision.

(Versions before 0.4.0 predate this file; history lives in git.)
