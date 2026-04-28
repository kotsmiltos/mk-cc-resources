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
| iteration cap exceeded (default 30) | infinite-loop safety |
| same phase persists ≥ `stuck_phase_threshold` iterations (default 5) | likely stuck — suggests `/heal` |
| `sprint-complete` AND `reviews/sprint-N/QA-REPORT.md` exists | already reviewed but phase didn't advance — suggests `/heal` |
| context usage > threshold (default 60%) | preserve context window for human work |

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

  max_iterations: 30              # halt if same-phase advance fires this many times in a row

  stuck_phase_threshold: 5        # halt if phase persists this many iterations without state change — suggests /heal

  context_threshold_pct: 60       # halt if estimated context usage exceeds this %

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

## Iteration Counter

The hook persists per-session counters in `state.session.autopilot_iterations` and `autopilot_last_phase`. The counter resets to zero whenever the phase changes — so progress through phases doesn't trip the safety cap. The cap exists to catch genuine stuck-loop situations (same phase, no progress, repeated advance).

## Stuck-Phase Detection

`max_iterations` (default 30) catches infinite loops eventually. `stuck_phase_threshold` (default 5) catches the **stuck-pipeline failure mode** much earlier: when `state.pipeline.phase` persists 5 iterations without changing, autopilot halts and prints `phase persisted N iterations without state change — run /heal`. The `/heal` command (essense-flow plugin) infers the correct phase from on-disk artifacts and walks the state machine forward through legal transitions on user confirmation.

A complementary forward-detect halts immediately at iteration 1 when `phase=sprint-complete` AND `reviews/sprint-N/QA-REPORT.md` already exists on disk — the most common stuck-state shape (review/triage already done, phase didn't advance).

## Context Threshold

The hook estimates context usage by reading the transcript file size and dividing by `CHARS_PER_TOKEN` (4) and `TOKEN_BUDGET` (200000). Above the configured percentage, autopilot halts. This is a rough heuristic — Claude Code does not currently expose exact token usage to hooks. Adjust `context_threshold_pct` if your runs hit early/late.

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
- Check `state.session.autopilot_iterations`. If it's growing without phase change, the underlying skill is failing to advance. Investigate that skill's runner.
- Iteration cap will eventually halt and warn.

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
