# mk-cc-resources — Codebase Snapshot

> Claude Code plugin marketplace: skills distributed as installable plugins.

Deep per-plugin notes live in `plugins/<name>/CLAUDE.md` — loaded automatically when working
under that plugin's directory. This root file is orientation + the rules that apply repo-wide.

## Architecture

```
.claude-plugin/
  marketplace.json          # Marketplace registry — lists all plugins
  plugin.json               # Root plugin metadata (mk-cc-all) — uses custom `skills` paths
                            # to discover skills inside plugins/ (no root skills/ duplication)

plugins/
  essense-flow/             # Multi-phase AI development pipeline (headline plugin).
                            #   bin/ = essense-flow-tools.cjs, the single gateway for state ops;
                            #   lib/ = 19 Node modules; agents/ = 12 sub-agent defs (librarian
                            #   protocol — producer returns carry required unknowns[]);
                            #   hooks/ = context-inject.js + next-step.js, advisory, fail-soft;
                            #   references/ = transitions, generativity-protocol (the rung-2
                            #   design-fork protocol), librarian, code-conventions (leads with
                            #   BUILD DECOUPLED), schemas/ (single-source, drift-tested).
                            #   See plugins/essense-flow/CLAUDE.md.

  essense-autopilot/        # Stop-hook autopilot for essense-flow — phase → command mapping,
                            #   halt conditions (hooks/autopilot.js)

  session-lifecycle/        # Session continuity: handoff / resume / claude-md-sync / retro /
                            #   meta-review (table below)

  plugin-toolkit/           # Plugin dev + maintenance: skill-heal, plugin-scaffold,
                            #   version-bump, docs-audit, code-glossary (deterministic Python
                            #   engine; DESIGN-V2.md is the design source), dry-refactor —
                            #   plus the repo-level CLI gates repo-guard / test-all /
                            #   registry-check (lib/ pure policy + bin/ adapters + registries
                            #   as extension surfaces). See plugins/plugin-toolkit/CLAUDE.md.

  schema-scout/             # Data file schema exploration CLI (Python: typer + openpyxl + rich)

  thorough-mode/            # Prompt modifiers (++/@thorough, @ship, @present, @debug, @verify,
                            #   @fresh, @prompt, @build) — hooks-only, protocol-shaped
                            #   injections, machine-text guard; @prompt is steward-aware.
                            #   See plugins/thorough-mode/CLAUDE.md.

  project-note-tracker/     # Question + bug tracker with Excel backend (tracker.py via uvx)

  alert-sounds/             # Cross-platform audio + visual alerts (Stop / Notification /
                            #   UserPromptSubmit hooks; per-event config.json toggles)

  statusline/               # Segment-based statusline — settings-level wiring, fail-soft per
                            #   segment, extend = drop a function into SEGMENTS.
                            #   See plugins/statusline/CLAUDE.md.

  verifiability-lens/       # Work-quality guardian: A/B/U verifiability + completeness +
                            #   quality-bar checks, actively verified; surfacing triage tuned
                            #   by a recipient profile. Carries NO hook since 0.5.0 — automatic
                            #   firing is turn-end's quality-lens duty, opt-in OFF.
                            #   See plugins/verifiability-lens/CLAUDE.md.

  reuse-gate/               # Reuse-first reminder on first SOURCE write (PreToolUse hook,
                            #   once per user message; never blocks, opt-in OFF, fail-open)

  steward/                  # Living-model keeper — per-project .steward/ model the steward
                            #   agent RECOMPUTES on every input (cascade pivots) and diffs
                            #   visibly; SessionStart briefing hook; owner-present work only.
                            #   Budgeted since 0.3.0: ONE background integration pass per
                            #   sitting; agent verifies only what it writes, routine diff
                            #   ≤15 lines. Standalone, not in mk-cc-all.
                            #   See plugins/steward/CLAUDE.md.

  turn-end/                 # THE single blocking Stop hook — plugins ship DUTIES, not hooks;
                            #   one runner checks each against real state, ONE consolidated
                            #   tail per user request. Duty kinds: DEMAND (ask) + SUPPLY
                            #   (material). Shipped duties: context-recall, session-digest,
                            #   quality-lens, steward-sync, self-check (0.4.0 — default-ON,
                            #   severity:block: a turn that changed real files may not yield
                            #   until a check ran AFTER the last change or the final message
                            #   names the check + result). See plugins/turn-end/CLAUDE.md.

  kb/                       # Queryable knowledge base — the PULL side of the long-lens tools
                            #   (steward + lens PUSH a fixed briefing at open). Two orthogonal
                            #   axes, never collapsed: KIND (episodic/semantic/procedural/
                            #   working — CoALA) x CASTE (session→thread→project→fleet→owner,
                            #   ordered narrow→wide). Read-only engine; MCP adapter with
                            #   alwaysLoad (schemas never deferred); CLI; skills kb / kb-seed /
                            #   kb-capture; TWO hooks since 0.9.0 (kb-pull, kb-session-start —
                            #   the kb-scribe Stop hook is RETIRED into turn-end's
                            #   session-digest duty). See plugins/kb/CLAUDE.md.
```

Benched plugins (miltiaze, ladder-build, architect, mk-flow, safe-commit, project-structure, repo-audit) preserved on `archive/benched-plugins` branch.

## essense-flow Pipeline

```
/init → /elicit → /research → /triage → /architect → [/organize] → /build → [/glossary] → /review → /verify → complete
```

Per-phase commands, outputs, and hook details: `plugins/essense-flow/CLAUDE.md`. `/organize`
and `/glossary` require plugin-toolkit (the code-glossary engine) — hard stop with install hint
when absent; both phases are autopilot human gates.

State is artifacts-authoritative: `.pipeline/state.yaml` is a derived cache. `state-reconcile`
(CLI op) compares cache vs artifact inference (`lib/infer-phase.cjs`) — report-only by default,
`--apply` rebuilds from disk; a missing cache auto-rebuilds inside ordinary ops. Producer agents
follow the librarian protocol (`references/librarian.md`): research first, declare structured
`unknowns[]` in every return, masters surface them at phase gates via AskUserQuestion.

## Session Lifecycle

| Skill | Trigger | Notes |
|-------|---------|-------|
| `/handoff` | Session end | Append-only history: permanent `.claude/handoffs/handoff-<ts>.md` + `INDEX.md` ledger, `.claude/handoff.md` latest-alias. Critical Context is quality-gated: ≥1 rejected approach/gotcha/constraint with its why, or a reasoned "none". Triggers `/claude-md-sync` if stale. |
| `/resume` | Session start | Reads the alias, validates branch/pipeline state, reports discrepancies; **preserves** the handoffs history. |
| `/claude-md-sync` | After changes | Proposes CLAUDE.md edits from git diff; per-section approval. |
| `/retro` | After sprint/session | Metrics-driven; gaps before strengths. |
| `/meta-review` | Periodically | Diagnoses session friction. Diagnostic only. |

## Plugin Toolkit

Skills for working ON plugins (one-liners in the tree above; detail in
`plugins/plugin-toolkit/CLAUDE.md`), plus three repo-level gates run from the toolkit dir:

| Gate | When | One verdict |
|------|------|-------------|
| `node bin/repo-guard.js` | Before a push, or when a defect class keeps coming back | Every registered detector over tracked files + git history in ONE snapshot: leaked machine paths, silenced shell failures, fix-the-fix commit chains. Exit 1 on blocking findings. |
| `node bin/test-all.js` | Before a push, or when "is the repo green?" is answerable only from memory | Every suite in every plugin, discovery by shape (a new suite is covered the day it lands); names units shipping no suite; a suite that exits 0 while printing failures is SUSPECT, never green. Exit 1 on any red/suspect/could-not-run. |
| `node bin/registry-check.js` | Before a push, or after any version change | Verifies the CLAIMS marketplace/bundle/doc tables make about the repo against disk — checks, never generates. Exit 1 on drift. |

**code-glossary scope limit (measured 2026-07-28):** `runner coupling` and cross-file clustering
assume ONE codebase whose modules genuinely import each other — run across this marketplace of
independently-installed plugins they mislead (phantom cross-plugin coupling; extraction proposals
that would pin separately-versioned plugins to each other). Run per-plugin, or apply
package-boundary judgement; see `.claude/kb/captures/20260728-0430-cross-plugin-duplication-is-correct-do-not-extract.md`.

Composition: `@ship` references `/version-bump` + `/docs-audit`. `/code-glossary`'s engine powers
essense-flow's `/organize` (spec mode) + `/glossary` (code mode); GLOSSARY.yaml is the input
contract `/dry-refactor` consumes.

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
| Plugin CLAUDE.md notes | Changing a plugin's behavior/shape | `plugins/<name>/CLAUDE.md` | Deep notes live with the plugin; root stays orientation-only |

## Conventions

- **Skill definitions** use YAML frontmatter + XML-like section tags (`<objective>`, `<context>`, `<instructions>`)
- **Named constants** over magic numbers (thresholds in `analyzer.py`)
- **All paths** normalized to forward slashes (Windows compatibility)
- **Metadata convention** — pipeline template outputs include a blockquote metadata block as first content. Core fields: `type`, `output_path`, `key_decisions`, `open_questions`. Format: `> **field_name:** value`
- **Session artifacts** — handoff writes an append-only history: a permanent `.claude/handoffs/handoff-<ts>.md` per run + a newest-first `.claude/handoffs/INDEX.md` ledger, with `.claude/handoff.md` kept as the latest-alias `/resume` reads (resume preserves the history, never truncates). `@prompt` (thorough-mode) likewise saves each generated kickoff prompt to `.claude/prompts/` + `INDEX.md`. retro writes to `.planning/retros/` or `.claude/retros/`
