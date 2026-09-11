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
                            #   hooks/ = context-inject.js + next-step.js, advisory, fail-soft.
                            #   0.27.0: the DEGRADED banner fires on SessionStart ONLY (gated on
                            #   payload.hook_event_name, no counter) and next-step is SILENT on a
                            #   degraded state — measured 535 identical banners / 196 sessions
                            #   against 0 skill invocations; both hooks root-anchor via the plugin's
                            #   own lib/project-root.js (NOT project-dir.cjs, which hard-fails);
                            #   references/ = transitions, generativity-protocol (the rung-2
                            #   design-fork protocol), librarian, code-conventions (leads with
                            #   BUILD DECOUPLED), schemas/ (single-source, drift-tested).
                            #   See plugins/essense-flow/CLAUDE.md.

  essense-autopilot/        # Stop-hook autopilot for essense-flow — phase → command mapping,
                            #   halt conditions (hooks/autopilot.js). 0.5.0: the
                            #   `no .pipeline/` halt is SILENT (305 fires / 196 sessions, a
                            #   condition nobody can act on); every other halt stays loud.

  session-lifecycle/        # Session continuity: handoff / resume / claude-md-sync / retro /
                            #   meta-review (table below)

  plugin-toolkit/           # (1.12.0: harness-stats — the SCORECARD gate over drop-in metric
                            #   sources, reproduces audit 2 to the digit; trace schema v1 +
                            #   drift suite over every sibling writer.)
                            #   Plugin dev + maintenance: skill-heal, plugin-scaffold,
                            #   version-bump, docs-audit, code-glossary (deterministic Python
                            #   engine; DESIGN-V2.md is the design source), dry-refactor —
                            #   plus the repo-level CLI gates repo-guard / test-all /
                            #   registry-check (lib/ pure policy + bin/ adapters + registries
                            #   as extension surfaces). 1.11.0: repo-guard's 4th detector
                            #   machine-guard-drift — every hook's MACHINE_TEXT_MARKERS copy
                            #   must be identical or the push fails.
                            #   See plugins/plugin-toolkit/CLAUDE.md.

  schema-scout/             # Data file schema exploration CLI (Python: typer + openpyxl + rich)

  thorough-mode/            # Prompt modifiers (++/@thorough, @ship, @present, @debug, @verify,
                            #   @fresh, @prompt, @build) — hooks-only, protocol-shaped
                            #   injections, machine-text guard; @prompt is steward-aware.
                            #   See plugins/thorough-mode/CLAUDE.md.

  project-note-tracker/     # Question + bug tracker with Excel backend (tracker.py via uvx)

  alert-sounds/             # Cross-platform audio + visual alerts (Stop / Notification /
                            #   UserPromptSubmit hooks; per-event config.json toggles)

  statusline/               # Segment-based statusline — settings-level wiring, fail-soft per
                            #   segment, extend = drop a function into SEGMENTS. 0.2.0:
                            #   segSteward v2 — ⚓N✱ ▲M from the status contract, root-anchored.
                            #   See plugins/statusline/CLAUDE.md.

  verifiability-lens/       # (0.6.0: a SubagentStop RECORDER — one trace-schema-v1 line per
                            #   dispatch: a/b/u, escalations, verified/refuted, ms, tokens; never a
                            #   Stop hook.) Work-quality guardian: A/B/U verifiability + completeness +
                            #   quality-bar checks, actively verified; surfacing triage tuned
                            #   by a recipient profile. Carries NO hook since 0.5.0 — automatic
                            #   firing is turn-end's quality-lens duty, opt-in OFF. 0.5.1: the
                            #   dead hook scripts + their suite DELETED; contract tests over
                            #   the shipped files replace them.
                            #   See plugins/verifiability-lens/CLAUDE.md.

  reuse-gate/               # Reuse-first reminder on first SOURCE write (PreToolUse hook,
                            #   once per user message; never blocks, opt-in OFF, fail-open)

  steward/                  # Living-model keeper — per-project .steward/ model the steward
                            #   agent RECOMPUTES on every input (cascade pivots) and diffs
                            #   visibly; SessionStart briefing hook; owner-present work only.
                            #   Budgeted since 0.3.0: ONE background integration pass per
                            #   sitting; agent verifies only what it writes, routine diff
                            #   ≤10 lines. 0.3.1 halves the standing injection (protocol 4
                            #   lines, briefing ≤6 / 900 chars) — injected text is a
                            #   per-session tax. 0.4.0: the briefing computes its own
                            #   FRESHNESS at injection (⚠ line naming events newer than it)
                            #   and every read anchors to the nearest .git ancestor — a
                            #   subdir shell briefs from and captures to the REAL model.
                            #   0.5.0: STATUS CONTRACT — status.json lifecycle ledger
                            #   (agent = only writer, new is derived, files never move),
                            #   computed [instr] briefing lines, cursor staleness, backfill.
                            #   0.5.1: ONE item model, three readers — brief line, [instr]
                            #   and fleet table all derive from status.json (+ backlog age).
                            #   Standalone, not in mk-cc-all.
                            #   See plugins/steward/CLAUDE.md.

  turn-end/                 # (0.9.0: TRACE SCHEMA v1 — hook / duty / acted-on lines via the
                            #   pure lib/trace-line.js; judge-vs-ranker agreement inputs; acted-on
                            #   derived per closed span at the next owner prompt.
                            #   0.8.0: ground truth — Bash-aware file-touch, named-check floor,
                            #   modality asks, exec-result recorder hook pair; 0.7.1: running≠
                            #   installed on every trace line + tail.) THE single blocking Stop
                            #   hook — plugins ship DUTIES, not hooks;
                            #   one runner checks each against real state, ONE consolidated
                            #   tail per user request. Duty kinds: DEMAND (ask) + SUPPLY
                            #   (material). Shipped duties: context-recall, session-digest,
                            #   quality-lens, steward-sync, self-check (0.4.0 — default-ON,
                            #   severity:block: a turn that changed real files may not yield
                            #   until a check ran AFTER the last change or the final message
                            #   names the check + result), context-recall fallback (0.6.0 —
                            #   judge death → own-ranker picks, engine named; judge stays
                            #   default per owner quality-over-speed law), request-closure (0.5.0 — a span
                            #   woken by / dispatching agents must END by answering the
                            #   user's verbatim original request + who-did-what, not the
                            #   last agent's return). 0.7.0: judge child spawned LEAN
                            #   (no hooks/plugins/MCP; fail-open retry; −36% cost — NOT
                            #   faster on real prompts: the child deliberates 2–9k tokens),
                            #   DEFERRAL primitive (agents in flight from the transcript,
                            #   plan mode), give-up note once, tail DEMANDS-first under
                            #   the platform's ~10 KB inline bound (pointer form beyond),
                            #   sessionSupplied memory, accountable trace (engine/ms/cost/
                            #   deferred/satisfied_by/payload_keys).
                            #   See plugins/turn-end/CLAUDE.md.

  prism/                    # Multi-perspective panel skill — sole-focus agents, one lens
                            #   each (asker-named lenses win: the extension surface is the
                            #   language, zero files), parallel on the session model,
                            #   session-side synthesis with per-point lens credit, named
                            #   conflict rulings, delta line. ONE SKILL.md, zero code,
                            #   stateless — panel rulings recorded in plugins/prism/CLAUDE.md
                            #   (designed BY its own method, 2026-09-04). Bundle-safe.

  elicit/                   # Brainstorm a vision to completion — questions the gaps the owner
                            #   leaves, TEACHES a process before asking them to choose inside it,
                            #   panels genuine forks with prism. A RETARGET of essense-flow's
                            #   gap-recursion engine at .steward/vision.md + questions.md (owner
                            #   ask 2026-09-11, verbatim in plugins/elicit/CLAUDE.md): orients from
                            #   kb + the model BEFORE the first question (never re-ask what is
                            #   settled), recurses depth-first, queue always visible. Writes ONE
                            #   thing — a .steward/inbox/ capture; the steward agent stays the only
                            #   writer of the model. ONE SKILL.md, zero code, no preconditions,
                            #   every dependency degrades to a named line. Bundle-safe.
                            #   See plugins/elicit/CLAUDE.md.

  patterns/                 # Named-seam menu + pre-code pattern check — HFDP's trigger→shape
                            #   device mechanized ambient (owner directive 2026-08-27: "Claude
                            #   overall abides"; essense-flow is NOT the home). catalog/
                            #   patterns.json = single source, 41 entries (GoF/Fowler/POSA/
                            #   msdocs/Nystrom/HFDP/SOLID), JSON so every consumer JSON.parses
                            #   zero-dep; menu renders AT RUNTIME (no drift file). Two hooks,
                            #   default ON, fail-open, advisory-only (no permissionDecision,
                            #   no exit 2): pattern-menu (UserPromptSubmit, verb∧noun trigger,
                            #   machine-text + MK_TURN_END_DEPTH guards) + pattern-gate
                            #   (PreToolUse, once per prompt_id, state HOME-SIDE keyed by
                            #   project-root hash — never litters repos). /patterns browses.
                            #   Standalone, not in mk-cc-all (bundle would strip catalog/).
                            #   See plugins/patterns/CLAUDE.md.

  kb/                       # (0.14.0: all three trace writers on TRACE SCHEMA v1 through the pure
                            #   lib/trace-line.js — hook:kb-pull / hook:kb-session-start / tool:kb_*.
                            #   0.13.0: kb-pull within the MEASURED 8 KiB platform bound, hinted
                            #   ids never repeated per session, unchanged digest = one pointer
                            #   line. 0.10.3: both hooks root-anchored via lib/project-root.js —
                            #   a subdir shell no longer reads/rotates another project's
                            #   kb state. 0.11.0: status-join — steward ledger status/groups
                            #   ride as searchable themes.) Queryable knowledge base — the PULL side of the long-lens tools
                            #   (steward + lens PUSH a fixed briefing at open). Two orthogonal
                            #   axes, never collapsed: KIND (episodic/semantic/procedural/
                            #   working — CoALA) x CASTE (session→thread→project→fleet→owner,
                            #   ordered narrow→wide). Read-only engine; MCP adapter with
                            #   alwaysLoad (schemas never deferred); CLI; skills kb / kb-seed /
                            #   kb-capture; TWO hooks since 0.9.0 (kb-pull, kb-session-start —
                            #   the kb-scribe Stop hook is RETIRED into turn-end's
                            #   session-digest duty; its script DELETED in 0.12.0). 0.12.0:
                            #   kb-pull stands down in judge children + canonical six-marker
                            #   machine-text guard. See plugins/kb/CLAUDE.md.
```

Benched plugins (miltiaze, ladder-build, architect, mk-flow, safe-commit, project-structure, repo-audit) preserved on `archive/benched-plugins` branch.

## essense-flow Pipeline

```
/init → /elicit → /research → /triage → /architect → [/organize] → /build → [/glossary] → /review → /verify → complete
```

Per-phase commands, outputs, and hook details: `plugins/essense-flow/CLAUDE.md`. `/organize`
and `/glossary` require plugin-toolkit (the code-glossary engine) — hard stop with install hint
when absent; both phases are autopilot human gates.

**Two elicits, and they are not interchangeable.** `/essense-flow:elicit` is this phase — it
closes a build-ready `SPEC.md`, calls `essense-flow-tools init elicit`, writes a cursor and
enforces phase predicates, so it cannot run without `.pipeline/`. `/elicit:elicit` (the `elicit`
plugin) is the same gap-recursion engine retargeted at a project's DIRECTION in the steward model,
with no state machine and no preconditions. Route a pipeline run to the first, a "help me think
this through" to the second.

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
| `node plugins/plugin-toolkit/bin/repo-guard.js` **from the REPO ROOT** | Before a push, or when a defect class keeps coming back | Every registered detector over tracked files + git history in ONE snapshot: leaked machine paths, silenced shell failures, fix-the-fix commit chains. Exit 1 on blocking findings. **Root cwd REQUIRED** (measured 2026-08-27: run from the toolkit dir it scans ONLY plugin-toolkit — 8 findings elsewhere sat invisible since 08-23 — and the allowlist's repo-relative paths stop matching). Read the exit code directly, never after a pipe. |
| `node bin/test-all.js --root <REPO ROOT>` | Before a push, or when "is the repo green?" is answerable only from memory | Every suite in every plugin, discovery by shape (a new suite is covered the day it lands); names units shipping no suite; a suite that exits 0 while printing failures is SUSPECT, never green. Exit 1 on any red/suspect/could-not-run. **`--root` is REQUIRED from the toolkit dir** — without it discovery defaults to cwd and silently sweeps ONLY plugin-toolkit (measured 2026-08-23: 764 checks reported vs 1723 real; the historical "764 green" gate records were toolkit-scoped, not repo-wide). **1.14.0 fixed the counter itself**: it matched node:test's old `# pass N` marker, so on node 22+ (`ℹ pass N`) every node-file suite counted ZERO — the total could not move when tests were added OR removed. Current honest baseline: **32/35 suites, 1452 checks, 1 skipped**, exit 1 on three named non-green — `essense-flow:test/run-all.cjs` and code-glossary's pytest (both pre-existing, fixtures/deps outside the repo) plus `essense-flow:tests/ledger-compaction.test.js`, which RUNS AND CHECKS NOTHING (same vanished workspace; it read as a pass until the skip marker was parsed). |
| `node bin/registry-check.js --root <REPO ROOT>` | Before a push, or after any version change | Verifies the CLAIMS marketplace/bundle/doc tables make about the repo against disk — checks, never generates. Exit 1 on drift. **8 claim sources since 1.14.0**: `plugin-docs` is new — every plugin must have a README, a CHANGELOG whose NEWEST entry is the shipped version (the doc half of the version-pin law), and a marketplace description ≤200 chars (that text is what `/plugin` prints at install; turn-end's was 9,879). `doc-version` now reads a LINKED plugin name and a version in any cell, and sweeps `plugins/*/README.md` + `CHANGELOG.md` as well as the root docs. (`--root` required from the toolkit dir — without it the marketplace read fails loudly.) |
| `node plugins/plugin-toolkit/bin/harness-stats.js --root .` (1.12.0) | "Does it do anything?" — after a ship, before retiring a mechanism, on every model release (harness §5 strip rule) | The SCORECARD: 14 drop-in metric sources over `.claude/*/trace.jsonl`, `checks.jsonl`, the project's transcripts, the install ledger — hook bytes per prompt, hints followed, nudges/blocks, judge cost + agreement, tail bytes, acted-on (per surfacing KIND since 0.10.0), note-uptake (notes SUPPLIED vs notes the answer USED - content-scored, because the file-open question read 0% where real uptake was 68%), lens lines per dispatch, spawns, running≠installed. A source declaring `writer` + `vintage` makes the runner name the install date, so a zero from an uninstalled writer is not mistaken for a dead mechanism. Prints IN the session with drift vs the audit-2 baselines; a declared key that comes back absent is NAMED. `--until <audit mtime>` reproduces audit 2 at +0.0%. `--line` prints the five-key `[instr]` form (owner delegated the pick 2026-09-10; re-picked 2026-09-11 to lead with `uptake.used_pct` and carry NO byte count, per the quality-over-cost ruling → shipped default in `defaults/harness-stats.json`; a project overrides it in `.claude/harness-stats.json`). Exit 0 always (a report), 2 cannot run. |

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
| Plugin docs | Bumping a version, or adding a plugin | `plugins/<name>/CHANGELOG.md` + `README.md`, and the marketplace row's `description` | registry-check's `plugin-docs` claim fails the run without a README, without a changelog entry for the shipped version, or on a description over 200 chars |
| Root README catalog | Adding a plugin, or bumping one | `README.md` catalog row (link form: `| [name](plugins/name/README.md) | B | x.y.z |`) | `doc-version` checks the row against `plugin.json`; `B` marks bundle membership and must match `.claude-plugin/plugin.json` skills[] |

## Conventions

- **Skill definitions** use YAML frontmatter + XML-like section tags (`<objective>`, `<context>`, `<instructions>`)
- **Named constants** over magic numbers (thresholds in `analyzer.py`)
- **All paths** normalized to forward slashes (Windows compatibility)
- **Metadata convention** — pipeline template outputs include a blockquote metadata block as first content. Core fields: `type`, `output_path`, `key_decisions`, `open_questions`. Format: `> **field_name:** value`
- **Release docs** — each plugin ships `CHANGELOG.md` (Keep a Changelog: `## [x.y.z] - date` + Added/Changed/Fixed, written for whoever INSTALLS it) and a `README.md`; both are enforced by registry-check's `plugin-docs` claim. `RELEASE-NOTES.md` is RETIRED (2026-09-11) — entries older than the five most recent live verbatim in `design/notes/<plugin>-history.md`, and `/version-bump` writes the changelog entry.
- **Session artifacts** — handoff writes an append-only history: a permanent `.claude/handoffs/handoff-<ts>.md` per run + a newest-first `.claude/handoffs/INDEX.md` ledger, with `.claude/handoff.md` kept as the latest-alias `/resume` reads (resume preserves the history, never truncates). `@prompt` (thorough-mode) likewise saves each generated kickoff prompt to `.claude/prompts/` + `INDEX.md`. retro writes to `.planning/retros/` or `.claude/retros/`
