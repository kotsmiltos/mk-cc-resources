# mk-cc-resources — Codebase Snapshot

> Claude Code plugin marketplace: skills distributed as installable plugins.

## Architecture

```
.claude-plugin/
  marketplace.json          # Marketplace registry — lists all plugins
  plugin.json               # Root plugin metadata (mk-cc-all) — uses custom `skills` paths
                            # to discover skills inside plugins/ (no root skills/ duplication)

plugins/
  essense-flow/             # Multi-phase AI development pipeline (headline plugin)
    .claude-plugin/plugin.json
    bin/                    # essense-flow-tools.cjs — single gateway for state ops (state-set-phase,
                            #   record-task-completion, state-reconcile, register-add --kind unknown)
    lib/                    # 19 Node.js modules (state, infer-phase, schema-validate, brief, dispatch,
                            #   verify-disk, atomic-write, with-lock, rule sweeps, etc.)
    agents/                 # 12 sub-agent defs; producer returns carry required unknowns[] (librarian)
    hooks/                  # hooks.json + scripts/: context-inject.js (UserPromptSubmit + SessionStart),
                            #   next-step.js (Stop) — both advisory, fail-soft
    skills/
      elicit/               # Pitch → SPEC.md through collaborative ideation
      research/             # Multi-perspective analysis → REQ.md
      triage/               # Categorize findings, route to correct phase
      architect/            # Decide → delegate → synthesize → pack. Produces ARCH.md + task specs
      organize/             # Optional spec-level DRY pass (code-glossary engine, spec mode)
      build/                # Execute task specs in dependency-ordered waves
      glossary/             # Optional code-level DRY audit (code-glossary engine, code mode)
      review/               # Adversarial QA — bug-finding + drift-finding + coupling-finding
                            #   (the `coupling` lens blocks cross-boundary reach-ins)
      verify/               # Top-down spec compliance audit
      context/              # State plumbing — init, status, next-step
      heal/                 # Pipeline self-heal from any degraded state
    commands/               # 14 slash commands (/init, /elicit, /organize, /glossary, etc.)
    defaults/               # config.yaml, state.yaml templates
    references/             # transitions.yaml, phase-command-map.yaml, principles.md,
                            #   librarian.md (research-first + unknowns[] protocol),
                            #   code-conventions.md (how build agents write code — cited by
                            #   task-agent + build + architect; craft, never contract; leads with
                            #   one rule: BUILD DECOUPLED — agents write blind, so units bind only
                            #   to declared contracts. Enforced at design time by the
                            #   architect-alignment lens (criterion 8 — exposes/consumes contract
                            #   integrity), at code time by the review `coupling` lens, and at audit
                            #   time by /verify's contract-compliance items (built surface honors
                            #   the declared exposes/consumes; reach-ins verdict as drift)),
                            #   schemas/ (canonical artifact shapes: task-spec, completion-record,
                            #   register-item, unknown-entry — validators, templates, and agent-def
                            #   shape blocks derive via scripts/render-schema-docs.cjs, drift-tested)

  essense-autopilot/        # Stop-hook autopilot for essense-flow
    .claude-plugin/plugin.json
    hooks/
      hooks.json            # Stop hook config
      autopilot.js          # Phase → command mapping, halt conditions

  session-lifecycle/        # Session continuity + workflow improvement
    .claude-plugin/plugin.json
    skills/
      handoff/              # Capture session state → .claude/handoffs/ (timestamped history + INDEX) + handoff.md alias
      resume/               # Restore context from handoff.md alias, validate state, preserve history
      claude-md-sync/       # Propose CLAUDE.md updates for stale sections
      retro/                # Metrics-driven retrospective (gaps before strengths)
      meta-review/          # Diagnose session friction → multi-step chains + skill friction + coverage gaps

  plugin-toolkit/           # Plugin/skill dev + maintenance toolkit
    .claude-plugin/plugin.json
    skills/
      skill-heal/           # Audit plugin's skill set against best practices
      plugin-scaffold/      # Bootstrap new plugin: dirs + cross-refs in one invocation
      version-bump/         # Cascade version updates across plugin.json + marketplace + bundle + RELEASE-NOTES
      docs-audit/           # Cross-check CLAUDE.md + README + marketplace.json vs disk state
      code-glossary/        # Functionality glossary + DRY audit (v2): deterministic Python engine
                            #   (code_glossary/ package: AST + tree-sitter, 5 signals, Pass A
                            #   clustering, frozen-schema render, drift diff) + in-session
                            #   sub-agent briefs. DESIGN-V2.md is the design source of truth.
                            #   Also powers essense-flow /organize + /glossary, and hosts the
                            #   code_glossary.dry_refactor engine sub-package.
      dry-refactor/         # /dry-refactor v3 MVP: preflight (7 Appendix-A gates) + dry-run
                            #   refactor plans from GLOSSARY.yaml. Zero source writes; live
                            #   execution deferred. Engine lives in the code-glossary package.

  schema-scout/             # Data file schema exploration CLI
    .claude-plugin/plugin.json
    skills/schema-scout/
      SKILL.md
      tool/                 # Standalone Python CLI package (typer + openpyxl + rich)

  thorough-mode/            # Prompt modifiers (++, @thorough, @ship, @present) — hooks-only
    .claude-plugin/plugin.json
    hooks/thorough-mode.js    # UserPromptSubmit hint injection (HINTS table)

  project-note-tracker/     # Question + bug tracker with Excel backend
    .claude-plugin/plugin.json
    skills/note/
      SKILL.md
      workflows/            # init, research-question, bug, agenda, meeting, resolve, etc.
      scripts/              # tracker.py — Excel I/O via uvx --with openpyxl

  alert-sounds/             # Cross-platform audio + visual alerts
    .claude-plugin/plugin.json
    hooks/
      hooks.json            # Stop, Notification, UserPromptSubmit hooks
      alert.py              # Platform-native beeps, notifications, taskbar flash
      config.json           # Per-event toggles (beep, sound, notify, flash)
    skills/alert-sounds/
      SKILL.md              # /alert-sounds config skill

  verifiability-lens/       # Auto-classifier: sorts work A (verifiable) / B (guess) / U (can't-tell),
                            #   surfaces only important + actionable + fully-contextualized decisions
    .claude-plugin/plugin.json
    agents/
      verifiability-lens.md # read-only classifier + surfacing triager (the substance)
    references/rubric.md    # CANON — A/B/U classification + surfacing triage + recipient profile
    defaults/recipient-profile.yaml  # the dials (who it serves) — config, never hardcoded
    commands/verifiability.md        # /verifiability [target] — manual trigger
    hooks/
      hooks.json            # Stop hook registration
      scripts/verifiability-stop.{sh,js}  # auto-trigger (opt-in OFF) + fire-once loop guard
    tests/verifiability-stop.test.js
```

Benched plugins (miltiaze, ladder-build, architect, mk-flow, safe-commit, project-structure, repo-audit) preserved on `archive/benched-plugins` branch.

**verifiability-lens** (design source: `design/verifiability-awareness.md`) — a strict, opinionated work-quality guardian. Two pillars. *Detection — three checks, actively verified* (agent tools: Read/Grep/Glob/WebSearch/WebFetch/context7 + Serena semantic trio find_symbol/find_referencing_symbols/get_symbols_overview/search_for_pattern for tracing code paths, fallback to Read/Grep — it confirms/refutes, not just flags): (1) verifiability A/B/U (A = a cheap accurate check exists or was run, B = genuine guess, U = can't tell; never let a U pass as A — the false-clean; capability-relative); (2) completeness (was everything meant to be done done, or an arbitrary stop — presses to continue + finish); (3) quality bar (tested, requirements met, robust, best achievable; rejects half-assed/missing-requirement/untested work). *Delivery:* a surfacing triage (auto-resolve | escalate | suppress) tuned by a recipient profile hands the user ONLY important + actionable + fully-contextualized decisions and absorbs the rest — hard rule: never a context-less decision; auto-resolutions always logged. Generalizes essense-flow's `unknowns[]` (input-side) to the output-side, and extends librarian.md's surface-at-gate protocol. Fires automatically via a Stop hook (P1 — blocks the turn, runs the lens in-session, surfaces before yielding), **opt-in OFF by default** (`.claude/verifiability-lens.json` `{"enabled":true}`), fire-exactly-once guard, fail-open — same mechanism as essense-autopilot. Carries a hook → standalone, not in the mk-cc-all bundle.

## essense-flow Pipeline

The headline plugin. State machine + per-phase skills + verification discipline.

```
/init → /elicit → /research → /triage → /architect → [/organize] → /build → [/glossary] → /review → /verify → complete
```

| Phase | Command | Output | Next |
|-------|---------|--------|------|
| Elicit | `/elicit` | `.pipeline/elicitation/SPEC.md` | `/research` |
| Research | `/research` | `.pipeline/requirements/REQ.md` | `/triage` or `/architect` |
| Triage | `/triage` | `.pipeline/triage/TRIAGE-REPORT.md` | Routes to earliest needed phase |
| Architecture | `/architect` | `.pipeline/architecture/ARCH.md` (incl. "Existing functionality considered" reuse ledger when a functionality map exists) + task specs + sprint manifest | `/build` (or `/organize`) |
| Organize *(optional)* | `/organize` | `.pipeline/architecture/ORGANIZE-REPORT.md` + consolidated task specs (originals archived to `_pre-organize/`) | `/build` |
| Build | `/build` | `.pipeline/build/sprints/<n>/` completion records + `SPRINT-REPORT.md` | `/review` (or `/glossary`) |
| Glossary *(optional)* | `/glossary` | `.pipeline/glossary/GLOSSARY.{yaml,md}` (propose-only) + `MAP.md` functionality map (consulted by /architect + /build) + `DIFF.md` drift report on re-runs (prior run snapshotted to `history/`) | `/review` (exit cue also surfaces `/dry-refactor` previews) |
| Review | `/review` | `.pipeline/review/sprints/<n>/QA-REPORT.md` | `/triage` or `/verify` |
| Verify | `/verify` | `.pipeline/verify/VERIFICATION-REPORT.md` | `complete` or `/triage` |
| Heal | `/heal` | State recovery via legal transitions | Returns to correct phase |

`/organize` and `/glossary` require plugin-toolkit (the code-glossary engine) — hard stop with install hint when absent. Both phases are autopilot human gates.

State is artifacts-authoritative: `.pipeline/state.yaml` is a derived cache. `state-reconcile` (CLI op) compares cache vs artifact inference (`lib/infer-phase.cjs`) — report-only by default, `--apply` rebuilds from disk; a missing cache auto-rebuilds inside ordinary ops. Artifact shapes single-source from `references/schemas/*.schema.yaml` (validators + templates + agent-def shape blocks derive; `npm run render-schemas`; drift-tested). Producer agents follow the librarian protocol (`references/librarian.md`): research first, declare structured `unknowns[]` in every return, masters surface them at phase gates via AskUserQuestion (`register-add --kind unknown`).

### Hooks (all fail-soft — never block tool calls)

| Hook | Event | Purpose |
|------|-------|---------|
| context-inject.js | UserPromptSubmit + SessionStart | Surfaces phase, sprint, canonical paths, degradation warnings (points at state-reconcile first) |
| next-step.js | Stop | Suggests recommended next slash command from phase-command-map.yaml |

## Session Lifecycle

Five skills for cross-session continuity and workflow self-improvement.

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `/handoff` | Session end | Captures what was done, what remains, critical context, blockers → a permanent `.claude/handoffs/handoff-<ts>.md` + `INDEX.md` ledger (append-only history), with `.claude/handoff.md` as the latest-alias. Triggers `/claude-md-sync` if CLAUDE.md stale. |
| `/resume` | Session start | Reads the `.claude/handoff.md` alias, validates branch/pipeline state, reports discrepancies, suggests first action. Marks consumed but **preserves** the `.claude/handoffs/` history (migrates a pre-1.2.0 single-file handoff into it). |
| `/claude-md-sync` | After changes | Scans git diff, identifies stale CLAUDE.md sections, proposes edits for approval. Callable standalone or by handoff. |
| `/retro` | After sprint/session | Metrics-driven retrospective. Gaps before strengths. Accepts `sprint-N`, `session`, or `all`. |
| `/meta-review` | Periodically | Diagnose session friction — multi-step workflow chains, skill friction, plugin coverage gaps. Diagnostic only. |

## Plugin Toolkit

Six composable skills for working ON plugins (and the codebases they ship in).

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `/skill-heal <plugin>` | Reviewing a plugin's skill quality | Dispatches parallel review agents, scores skills against rubric (Anthropic best practices + token efficiency + architecture coherence), produces per-skill scorecard + ranked fixes. Diagnostic only. |
| `/plugin-scaffold <name> <skills>` | Starting a new plugin | Generates directory tree + plugin.json + SKILL.md skeletons + marketplace.json entry + bundle update + README/CLAUDE.md additions + RELEASE-NOTES. |
| `/version-bump <plugin> <type>` | Shipping changes | Cascades version updates across plugin.json + marketplace.json + bundle + metadata + RELEASE-NOTES. Composable with `@ship`. |
| `/docs-audit [plugin\|all]` | Verifying doc consistency | Cross-checks CLAUDE.md + README + marketplace.json against disk. Finds drift, proposes fixes per file. |
| `/code-glossary [path]` | Auditing a codebase for DRY violations | v2: deterministic Python engine (`code_glossary/` package — Python/TS/JS/C# via stdlib AST + tree-sitter; 5-signal fingerprints; Pass A clustering; frozen-schema render via `python -m code_glossary.runner`) + in-session sub-agents (labeling against 147-verb vocab, Pass B cluster review with composite verdicts from deterministic `composed_of_candidates`, deterministic judge candidates via `runner near-misses`, Pass C substrate-verify). Optional `--scan-blocks` surfaces duplicated sub-function guard patterns. Writes GLOSSARY.yaml (frozen schema v1) + GLOSSARY.md; `runner diff --old --new` tracks duplication drift between runs ({(file, function)} identity, 6 classes); `runner map` renders MAP.md — mermaid module graph + lossless machine index, the consult-before-designing artifact essense-flow /architect + /build inject into briefs; `runner coupling` (engine 2.4.0) enforces DECOUPLED by measuring coupling — scope-aware call graph from records (a call binds to a same-module definition when one exists, so duplicated private names don't fabricate phantom edges), threshold-free binary violations (cross-module dependency cycles + reach-ins into a module's internal surface), writes COUPLING.yaml (each violation named file:function), `--fail-on-violation` CI gate; `runner extensibility` (engine 2.5.0, C#-only MVP) enforces OPEN-FOR-EXTENSION by measuring dispatch — per axis (an enum, or a declared growth axis from /elicit's ledger) it counts the add-one-instance edit-sites (`switch`/switch-expression/if-ladder/dict that enumerate the axis's instances; sites bind by ≥2 case-label overlap, no type inference), writes EXTENSIBILITY.yaml (each site named file:line), edit-count is a measurement while a declared-OPEN axis carrying a dispatch site is the binary gate (`--fail-on-violation`); intrinsic enums are advisory. Pure model `extensibility.py` + impure `indexer/dispatch_scanner.py`; design source `EXTENSIBILITY-MEASURE-DESIGN.md`. Glossary-only — does not execute refactors. Tests: `uv run pytest tests/` from the skill folder. |
| `/dry-refactor <glossary.yaml> <gloss-id>` | Planning an extraction the glossary proposed | v3 MVP: 7 Appendix-A pre-flight gates (baseline tests, git-clean, target module, verification, confidence, substrate-verify, gitignore) via `python -m code_glossary.dry_refactor.runner`, then a dry-run plan — synthesized helper + per-site edit list. **Zero source writes**; live execution ships later behind its own gate. |

Composition: `@ship` references `/version-bump` + `/docs-audit`. `/skill-heal` hints at `/docs-audit` when description quality is weak across skills. `/code-glossary`'s engine powers essense-flow's `/organize` (spec mode) + `/glossary` (code mode) phases; GLOSSARY.yaml is the input contract `/dry-refactor` consumes (Appendix A of DESIGN-V2.md; MVP = preflight + dry-run, built in v2.2).

## Cross-Reference Patterns

When changing files that follow these patterns, CHECK the related files for consistency.

| Pattern | When Triggered | Check These | Why |
|---------|---------------|-------------|-----|
| Plugin layout | Changing FORMAT of plugin.json | All `plugins/*/.claude-plugin/plugin.json` | All plugins must use same metadata format |
| SKILL.md convention | Changing section structure (XML tags, frontmatter fields) | All `plugins/*/skills/*/SKILL.md` | Shared convention across all skills |
| Marketplace registry | Adding, removing, or renaming a plugin | `.claude-plugin/marketplace.json` | Must list every plugin in `plugins/` |
| mk-cc-all bundle | Adding a new bundled plugin | `.claude-plugin/plugin.json` skills array + description | Bundle must reference new skills path |
| Workflow routing | Adding a workflow file to a skill | The skill's SKILL.md `<routing>` section | Routing table must reference new workflow |
| essense-flow hooks | Adding/changing context injection | `plugins/essense-flow/hooks/` | All 4 hooks must stay consistent |
| Session-lifecycle interop | Changing handoff output format | `plugins/session-lifecycle/skills/resume/SKILL.md` | Resume reads what handoff writes |

## Dependency Highlights

| Component | Dependencies |
|-----------|-------------|
| essense-flow | Node.js (CommonJS modules in `lib/`); /organize + /glossary additionally need plugin-toolkit (code-glossary engine) |
| essense-autopilot | Node.js (reads essense-flow state) |
| plugin-toolkit (code-glossary engine) | Python >= 3.11 via uv; pyyaml, tree-sitter + tree-sitter-typescript + tree-sitter-c-sharp; pytest (dev) |
| session-lifecycle | None (pure SKILL.md + `!`command`` shell injection) |
| schema-scout (CLI tool) | Python >= 3.10, openpyxl >= 3.1, typer >= 0.9, rich >= 13.0 |
| thorough-mode | None (hooks-only, stdlib JS) |
| project-note-tracker | Python >= 3.10, openpyxl (via uvx) |
| alert-sounds | Python >= 3.10, stdlib only (platform-native audio/notifications) |
| Build system | hatchling (schema-scout packaging) |

## Conventions

- **Skill definitions** use YAML frontmatter + XML-like section tags (`<objective>`, `<context>`, `<instructions>`)
- **Python source** (schema-scout) requires Python >= 3.10, uses openpyxl + typer + rich
- **Named constants** over magic numbers (thresholds in `analyzer.py`)
- **All paths** normalized to forward slashes (Windows compatibility)
- **Metadata convention** — pipeline template outputs include a blockquote metadata block as first content. Core fields: `type`, `output_path`, `key_decisions`, `open_questions`. Format: `> **field_name:** value`
- **Session artifacts** — handoff writes an append-only history: a permanent `.claude/handoffs/handoff-<ts>.md` per run + a newest-first `.claude/handoffs/INDEX.md` ledger, with `.claude/handoff.md` kept as the latest-alias `/resume` reads (resume preserves the history, never truncates). `@prompt` (thorough-mode) likewise saves each generated kickoff prompt to `.claude/prompts/` + `INDEX.md`. retro writes to `.planning/retros/` or `.claude/retros/`
