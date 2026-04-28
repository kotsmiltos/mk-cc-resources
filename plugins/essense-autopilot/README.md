# essense-autopilot

Stop-hook autopilot for [essense-flow](../essense-flow) pipelines. Drives the pipeline forward through state-machine phases without you having to type between steps. Halts cleanly when human input is genuinely needed.

## What It Does

When Claude finishes a turn, this plugin checks `.pipeline/state.yaml` against a configured phase → command map and the project's `.pipeline/config.yaml`. If the pipeline is mid-flight in an autonomous phase, the hook **blocks the stop and instructs Claude to invoke the next command**. Claude continues. Loop repeats until the pipeline reaches a halt condition (see below).

Mechanism: Claude Code's `Stop` hook supports `{decision: "block", reason: "..."}` to keep Claude active. This plugin uses that primitive, parameterised by the existing essense-flow `AUTO_ADVANCE_MAP` (mirrored as `flow` in config so it's user-overridable per project).

## Status: Opt-in. Default disabled.

The plugin ships disabled. You must edit `.pipeline/config.yaml` per project to turn it on.

## Install

This plugin is part of the `mk-cc-resources` marketplace. It is shipped alongside but separate from `essense-flow` — install both:

```
/plugin install essense-flow@mk-cc-resources
/plugin install essense-autopilot@mk-cc-resources
```

Then in any project that has been initialized with `/init` (essense-flow), edit `.pipeline/config.yaml`:

```yaml
autopilot:
  enabled: true
```

That is the only required setting. Defaults take over for the rest.

## Halt Conditions

The autopilot **stops blocking** (i.e. lets Claude end the turn) under any of:

| Condition | Why |
|---|---|
| `.pipeline/` not found | nothing to drive |
| `autopilot.enabled: false` | not opted in (default state) |
| `state.blocked_on` is set | a real blocker — needs you to resolve |
| `state.pipeline.phase` ∈ `human_gates` | phase requires dialogue (e.g. `eliciting`, `verifying`) |
| `state.pipeline.phase` ∈ `terminal` | pipeline is done (`complete`) |
| no `flow[phase]` mapping | unknown phase — fail-safe halt |
| no progress since last fire (same phase + sprint + wave) | same command would re-fire with no advancement — suggests `/heal` |
| `sprint-complete` AND `reviews/sprint-N/QA-REPORT.md` exists | already reviewed but phase didn't advance — suggests `/heal` |
| background `Agent` calls in flight (unpaired tool_use in transcript, fresh < 60 min) | orchestrator awaiting completion |

Any of these → autopilot lets Claude stop normally. You see the report and decide what to do.

## Config Schema

Full schema with defaults:

```yaml
autopilot:
  enabled: false                  # default: off — must opt in per project

  human_gates:                    # phases that require dialogue / decision — autopilot won't drive these
    - idle
    - eliciting
    - verifying

  terminal:                       # phases meaning "pipeline done"
    - complete

  flow:                           # phase → command. Override per-project to customize.
    research: /triage
    requirements-ready: /architect
    architecture: /build
    sprinting: /build
    sprint-complete: /review
    reviewing: /triage
```

You can override any subset. Unspecified keys fall back to defaults.

### Customizing the Flow

Common overrides:

```yaml
autopilot:
  enabled: true
  flow:
    # Treat 'reviewing' as a human gate by removing it from flow
    reviewing: null
```

Or add a phase to `human_gates`:

```yaml
autopilot:
  enabled: true
  human_gates: [idle, eliciting, verifying, reviewing]
```

## Progress Markers

The hook persists progress signals in `state.session`: `autopilot_last_phase`, `autopilot_last_sprint`, `autopilot_last_wave`, and `autopilot_last_advance_at`. On each fire, it compares the current `(phase, sprint, wave)` against the last-recorded triple. If all three match — and no Agent calls are in flight — the prior auto-advance produced no forward motion, so the same command would re-fire with the same result. Halt with `/heal` hint instead of looping.

## No-Progress Detection

This replaces the prior magic-number iteration counter (`max_iterations=30`, `stuck_phase_threshold=5`). The new mechanism is signal-driven: phase, sprint number, and wave are the natural progress dimensions. If none changed since the last fire, you are stuck — halt immediately with diagnostic `no progress since last auto-advance (phase 'X', sprint N, wave M unchanged) — run /heal to inspect state vs disk artifacts and walk forward`.

A complementary forward-detect halts on the very first fire when `phase=sprint-complete` AND `reviews/sprint-N/QA-REPORT.md` already exists on disk — the most common stuck-state shape (review already done, phase didn't advance).

## Background-Agent In-Flight Detection

The orchestrator (essense-flow skills like `/architect`, `/research`, `/build`, `/review`) dispatches background `Agent` tool calls that span multiple turns — perspective swarms, parallel reviewers, build waves. Phase doesn't change while these run, but that's correct behavior, not a stuck pipeline. Without protection, every Stop hook between dispatch and collection would auto-advance the same command, eventually false-firing the no-progress halt with a misleading "/heal" diagnostic.

The hook scans the transcript JSONL (`transcript_path` in the Stop payload) for `tool_use` entries with `name: "Agent"` whose `id` has no matching `tool_result.tool_use_id`. Unpaired = in flight. When detected:

- **Halt without auto-advance** — Claude stops normally; user can wait or send any prompt to resume
- **Progress markers NOT updated** — so the no-progress check fires correctly when agents finish and the next phase transition lands
- **Stderr diagnostic** — reports count + age of oldest unpaired Agent

Stale entries (older than 60 minutes, hardcoded internally) are treated as crashed agents — autopilot proceeds with a stderr warning.

The transcript JSONL schema is undocumented; if it changes, this check returns "no in-flight agents" (count=0), degrading gracefully, never false-halt.

## Manual Override

To stop autopilot mid-loop in an active session, type `STOP` (or any explicit instruction telling Claude to halt). The auto-advance signal already includes "Reply STOP to pause" — Claude honors that.

To turn autopilot off entirely, edit `.pipeline/config.yaml`:

```yaml
autopilot:
  enabled: false
```

## Known Limitations

These come from upstream Claude Code, not this plugin:

- **`decision: "block"` is not always honored** ([anthropics/claude-code#8615](https://github.com/anthropics/claude-code/issues/8615)). Some sessions stop anyway. When it works, it works well; when it doesn't, you fall back to the existing essense-flow auto-advance signal — your next prompt continues the pipeline.
- **Plugin-installed Stop hooks via exit code 2 have intermittent issues** ([anthropics/claude-code#10412](https://github.com/anthropics/claude-code/issues/10412)). This plugin uses the JSON `decision: "block"` path which is the more reliable mechanism, but be aware of the upstream issue.
- **Stop hook can hang on external API timeouts** if the hook makes network calls. This plugin makes none — pure local file reads. Should not be affected.

## Troubleshooting

**Autopilot doesn't fire.**
1. `.pipeline/config.yaml` has `autopilot.enabled: true`?
2. `.pipeline/state.yaml` has a real phase, not blocked, not in human_gates?
3. Run the hook manually:
   ```
   echo '{"transcript_path":"/tmp/x"}' | node ~/.claude/plugins/cache/mk-cc-resources/essense-autopilot/<version>/hooks/scripts/autopilot.js
   ```
   Should print `{"decision":"block","reason":"..."}` if conditions are met. Empty output = halted (check stderr for reason).

**Autopilot loops on the same phase.**
- Should not happen — no-progress detection halts on the second fire when `(phase, sprint, wave)` is unchanged. If you see it loop more than once, check `state.session.autopilot_last_phase` / `_last_sprint` / `_last_wave` — if they're not being persisted, the hook is failing to write `state.yaml`.
- Run `/heal` to inspect state vs disk artifacts and walk the pipeline forward.

**Autopilot halts at unexpected phase.**
- Check `human_gates` and `flow` in your config — phases not in `flow` halt by default. Add the phase to `flow` if it should auto-advance.

## Architecture

```
~/.claude/plugins/cache/mk-cc-resources/essense-autopilot/<ver>/
├── .claude-plugin/plugin.json    # plugin manifest
├── package.json                   # js-yaml dependency
├── hooks/
│   ├── hooks.json                 # registers Stop hook
│   └── scripts/
│       ├── autopilot.sh           # bash wrapper (cross-platform shebang)
│       └── autopilot.js           # the actual hook logic
└── README.md                      # this file
```

The plugin reads `.pipeline/config.yaml` from the user's project (located by walking up from cwd until `.pipeline/` is found). It does not read essense-flow's plugin internals — config is the contract.

## Why A Separate Plugin

Keeping autopilot separate from essense-flow:

- Lets users adopt essense-flow without autopilot (most common case — default off, separate plugin clean)
- Avoids tangling autopilot bugs (which depend on upstream Claude Code Stop-hook reliability) with essense-flow's pipeline correctness
- Makes the autopilot's behavior auditable in one place — this plugin is small, focused, opt-in

## License

ISC.
