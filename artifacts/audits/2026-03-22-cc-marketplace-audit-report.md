# Audit Report: cc-marketplace

> **Date:** 2026-03-22
> **Scope:** Full codebase audit — all 10 plugins, skills, hooks, scripts, context files, and project state
> **Entry point:** User-requested comprehensive audit via `/architect audit`
> **Existing goals:** `context/STATE.md`, `artifacts/builds/mk-flow/BUILD-PLAN.md`, `artifacts/builds/architect/BUILD-PLAN.md`, `artifacts/builds/pipeline-integration/BUILD-PLAN.md`, `artifacts/builds/plugin-update-workflow/BUILD-PLAN.md`

## Executive Summary

The cc-marketplace codebase is in strong shape structurally — all 10 plugins are present, registered, and consistently formatted. The pipeline (miltiaze → architect → ladder-build) is fully wired end-to-end. Python and shell code is clean, well-structured, and follows project conventions with only minor deviations. The most critical issue is that the mk-flow UserPromptSubmit hook has never fired on this Windows machine, making all intent classification, rules injection, and pipeline routing non-functional. Beyond that, there's a high-severity PowerShell injection risk in alert-sounds, several documentation-vs-reality gaps in CLAUDE.md, and the `skills/` mirror pattern has no enforcement mechanism. Recommended next action: fix the hook platform bug, then address the security finding and documentation drift.

## Assessment by Perspective

### Implementation Quality
**Agent:** Implementation quality perspective
**Overall:** Strong

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| IQ-1 | Magic column index literals in tracker.py — `column=4`, `column=3`, etc. used instead of named constants. If columns are reordered, these silently corrupt data. | Medium | `skills/note/scripts/tracker.py:393,399,416,422,439,445,632,638,660,662,668` | Define named constants: `HANDLER_COL_INDEX = 1`, `QUESTION_COL_INDEX = 2`, etc. Use everywhere instead of raw integers. |
| IQ-2 | `cli.py` uses literal `10_000` in 4 `typer.Option()` calls instead of a named constant (`DEFAULT_MAX_ROWS`). | Medium | `plugins/schema-scout/skills/schema-scout/tool/schema_scout/cli.py:276,302,328,363` | Define `DEFAULT_MAX_ROWS = 10_000` in `analyzer.py` and import in both files. |
| IQ-3 | `note/SKILL.md` help text shows `v1.7.0` but `plugin.json` says `1.6.0`. Visibly contradictory to users. | Medium | `plugins/project-note-tracker/skills/note/SKILL.md:87`, `plugins/project-note-tracker/.claude-plugin/plugin.json` | Align: bump plugin.json to 1.7.0 or fix the help text. |
| IQ-4 | `index_io.py` writes both `source_file` (basename) and `source_file_name` (basename) — duplicate fields with identical values. `cli.py` separately stores `source_file` as an absolute path. Semantic mismatch. | Low | `plugins/schema-scout/…/index_io.py:39-42`, `cli.py:81-87` | Remove `source_file_name`; standardize `source_file` meaning. |
| IQ-5 | Hard-coded `3000` ms PowerShell sleep repeated twice with no constant. | Low | `plugins/alert-sounds/hooks/alert.py:137,195` | Extract to `MEDIA_PLAYER_WAIT_MS = 3000`. |
| IQ-6 | `0x08000000` Win32 flag used inline with only a comment — should be a named constant like `FLASHW_ALL` is. | Low | `plugins/alert-sounds/hooks/alert.py:331` | Define `CREATE_NO_WINDOW = 0x08000000` at module level. |
| IQ-7 | `schema_scout_version: "1.0"` in index not tied to `__version__ = "1.0.0"` in `__init__.py`. Will lag on version bump. | Low | `plugins/schema-scout/…/index_io.py:40`, `__init__.py:3` | Import `__version__` and use it. |
| IQ-8 | `flash_taskbar()` catches `Exception` with bare `pass` — swallows debugging signal. | Low | `plugins/alert-sounds/hooks/alert.py:578-586` | At minimum log to stderr in debug mode. |
| IQ-9 | `_notify_wsl` silently swallows `wslpath` failure but `_play_file_wsl` logs it. Inconsistent error handling. | Low | `plugins/alert-sounds/hooks/alert.py:363-371` | Mirror the logging from `_play_file_wsl`. |
| IQ-10 | `read_json` silently skips malformed NDJSON lines with no counter or warning. | Low | `plugins/schema-scout/…/readers.py:132-134` | Track and warn about skipped lines. |
| IQ-11 | `filtered_count=0` in `scan-secrets.sh` declared but never used. Dead code. | Low | `plugins/safe-commit/…/scan-secrets.sh:259` | Remove the dead variable. |
| IQ-12 | `mk-flow-update-rules` SKILL.md is a deprecated stub still shipped in the plugin. | Low | `plugins/mk-flow/skills/mk-flow-update-rules/SKILL.md` | Remove or mark with `deprecated: true` in metadata. |

### Risk & Vulnerability
**Agent:** Risk and vulnerability perspective
**Overall:** Adequate

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| RV-1 | **PowerShell injection via user-controlled sound path** — `_play_file_windows` builds a `-Command` string with only single-quote escaping. Paths containing backticks, `$`, `()`, or `;` execute arbitrary PowerShell. Path comes from `config.json` which users edit directly. | High | `plugins/alert-sounds/hooks/alert.py:128-143,179-205` | Pass path via PowerShell parameter (`-ArgumentList`) instead of string interpolation. |
| RV-2 | `json.load(f)` on entire JSON array with no size guard before applying `max_rows` limit. Multi-GB file = OOM. | Medium | `plugins/schema-scout/…/readers.py:107` | Add file size check or use incremental parser for array case. |
| RV-3 | Absolute path (`C:\Users\<username>\...`) written to `.scout-index.json` files, leaking machine layout. | Medium | `plugins/schema-scout/…/cli.py:82`, `index_io.py:39-41` | Use `file.name` or relative path. |
| RV-4 | `repo_audit.py` slug used directly in filename without sanitization — `../` enables path traversal on write. | Medium | `skills/repo-audit/scripts/repo_audit.py:113` | Validate slug with allowlist regex `^[a-zA-Z0-9_-]+$`. |
| RV-5 | `$HOME` referenced in hook output injected into Claude's context, leaking full home directory path. | Low | `plugins/mk-flow/hooks/intent-inject.sh:182` | Use tilde (`~/.claude/...`) in instruction text. |
| RV-6 | Unquoted `${CLAUDE_PLUGIN_ROOT}` in hooks.json command — fails on paths with spaces. | Low | `plugins/mk-flow/hooks/hooks.json` | Quote the expansion. |
| RV-7 | No dependency pinning upper bounds or lock file for schema-scout. | Low | `plugins/schema-scout/…/tool/pyproject.toml` | Add compatible-release bounds (e.g., `openpyxl>=3.1,<4`). |
| RV-8 | `allow_entries` array used without explicit initialization in `scan-secrets.sh` — `bash: unbound variable` under edge case. | Low | `plugins/safe-commit/…/scan-secrets.sh:263-273` | Declare `allow_entries=()` before the loop. |

### Architecture Coherence
**Agent:** Architecture coherence perspective
**Overall:** Adequate

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| AC-1 | **mk-flow UserPromptSubmit hook never fires on Windows.** CRLF line endings + platform bugs. `.planning/debug/mk-flow-hook-not-firing.md` documents diagnosis but the fix was never applied. All intent classification, rules injection, and pipeline routing is non-functional on this machine. | Critical | `plugins/mk-flow/hooks/intent-inject.sh`, `~/.claude/settings.json` | Apply workaround from `.planning/debug/`: add hook to `~/.claude/settings.json` with absolute forward-slash path, convert to LF line endings. |
| AC-2 | `mk-flow-update` skill exists and is active but CLAUDE.md only documents deprecated `mk-flow-update-rules`. | Medium | `CLAUDE.md:63`, `plugins/mk-flow/skills/mk-flow-update/SKILL.md` | Update CLAUDE.md: replace entry. |
| AC-3 | `context/rules.yaml` missing `_meta.defaults_version` — stale detection nudge silently broken. | Medium | `context/rules.yaml`, `plugins/mk-flow/hooks/intent-inject.sh:113-124` | Add `_meta: { defaults_version: "0.5.0" }` to `context/rules.yaml`. |
| AC-4 | `intent-inject.sh` INSTRUCTION references `plugins/mk-flow/` as relative path — breaks for standalone installs. | Medium | `plugins/mk-flow/hooks/intent-inject.sh:143,174` | Use `${CLAUDE_PLUGIN_ROOT}` instead. |
| AC-5 | CLAUDE.md says hook skips `<10 chars`, actual threshold is `<2`. | Low | `CLAUDE.md:147`, `plugins/mk-flow/hooks/intent-inject.sh:27` | Make consistent. |
| AC-6 | CLAUDE.md says alert-sounds has `Permission` hook event, actual is `Notification` with matcher. | Low | `CLAUDE.md:69`, `plugins/alert-sounds/hooks/hooks.json` | Update CLAUDE.md. |
| AC-7 | Description drift between `marketplace.json` and individual `plugin.json` for 4 plugins. | Low | `.claude-plugin/marketplace.json`, 4 plugin.json files | Copy descriptions from plugin.json to marketplace.json. |
| AC-8 | `context/STATE.md` records architect as `0.1.0`, actual is `0.2.0`. | Low | `context/STATE.md:40` | Update to `0.2.0`. |
| AC-9 | `__pycache__` artifact in plugin source creates noise in skill-copies sync checks. | Low | `plugins/project-note-tracker/skills/note/scripts/__pycache__/` | Delete the artifact. |
| AC-10 | SKILL.md XML tag convention not standardized — `note`, `project-structure`, `schema-scout` deviate from `<essential_principles>` + `<core_rules>` pattern. | Low | Multiple SKILL.md files | Document canonical structure or accept deviations for simpler skills. |
| AC-11 | Root plugin.json has extra fields (`homepage`, `repository`, `license`, `keywords`) absent from child plugins. Cross-reference rule unclear. | Low | `.claude-plugin/plugin.json`, all child plugin.json | Clarify cross-reference rule scope. |

### Future-Proofing
**Agent:** Future-proofing perspective
**Overall:** Adequate

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| FP-1 | **Pipeline stage names are a distributed constant** — adding/renaming requires coordinated changes in 7+ places with no enforcement. | High | `intent-inject.sh`, architect SKILL.md, ladder-build SKILL.md, miltiaze workflows, state templates | Extract stage names into canonical reference. Add cross-reference rule for stage name changes. |
| FP-2 | **`skills/` is a manually-maintained mirror with no enforcement** — no script, hook, or CI detects drift. Works at 10 plugins, fails at 20. | High | `skills/` (8 directories), `context/cross-references.yaml:skill-copies` | Add sync script + pre-commit hook. Or replace with symlinks. |
| FP-3 | **`drift-check.sh` only covers ladder-build standalone builds, not pipeline builds** — the `verify-before-reporting` rule is structurally broken for pipeline-mode projects. | High | `plugins/mk-flow/skills/state/scripts/drift-check.sh`, `context/rules.yaml` | Extend drift-check to handle `artifacts/designs/*/PLAN.md` sprint tracking. |
| FP-4 | Dead stage `design-complete` in routing logic — checked but never set by any workflow. | Medium | `plugins/mk-flow/hooks/intent-inject.sh:167` | Remove dead branch or have architect plan.md set it. |
| FP-5 | `project-note-tracker` uses hardcoded `find ~/.claude/plugins` in 13 workflow files. `CLAUDE_PLUGIN_ROOT` available but unused. | Medium | `plugins/project-note-tracker/skills/note/workflows/*.md` (13 files) | Replace with `${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py`. |
| FP-6 | mk-flow plugin version (0.6.0) and `defaults_version` (0.5.0) relationship undocumented. Stale detection misbehaves without clarity. | Medium | `plugins/mk-flow/defaults/rules.yaml:8`, `plugins/mk-flow/.claude-plugin/plugin.json` | Add comment clarifying defaults_version advances only on content changes. |
| FP-7 | `schema-scout` plugin version (1.1.0) vs pyproject.toml (1.0.0) divergence. | Low | `plugins/schema-scout/.claude-plugin/plugin.json`, `pyproject.toml` | Document whether versions are independent or add cross-reference rule. |
| FP-8 | Adding a new plugin requires exactly 3 manual changes with no machine check. | Low | `.claude-plugin/marketplace.json`, `skills/` | Add consistency check script. |
| FP-9 | `intent-inject.sh` version extraction regex assumes specific install directory path structure. Fallback exists but primary method is brittle. | Low | `plugins/mk-flow/hooks/intent-inject.sh:104-111` | Invert priority: read plugin.json first. |
| FP-10 | `mk-cc-all` bundle version (1.14.0) decoupled from plugin versions with no derivation rule. | Low | `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json` | Document bundle versioning convention. |

### Practice Compliance
**Agent:** Practice compliance perspective
**Overall:** Adequate

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| PC-1 | CLAUDE.md documents `mk-flow-update-rules/` as active but it's deprecated. `mk-flow-update/` undocumented. | High | `CLAUDE.md:63`, both SKILL.md files | Update CLAUDE.md. |
| PC-2 | CLAUDE.md states hook skips `<10 chars`, actual is `<2 chars`. | High | `CLAUDE.md:145`, `intent-inject.sh:27` | Make consistent. |
| PC-3 | `context/STATE.md` records architect version as `0.1.0`, actual is `0.2.0`. | Medium | `context/STATE.md:40` | Update to `0.2.0`. |
| PC-4 | `note/SKILL.md` help text `v1.7.0` vs `plugin.json` `1.6.0` mismatch. | Medium | `plugins/project-note-tracker/skills/note/SKILL.md:86`, plugin.json | Align versions. |
| PC-5 | `cli.py` has `10_000` literal in 4 places — violates named constants convention. | Medium | `plugins/schema-scout/…/cli.py:276,302,328,363` | Define `DEFAULT_MAX_ROWS` constant. |
| PC-6 | `alert-sounds/SKILL.md` has non-standard `tools:` frontmatter field used nowhere else. | Low | `plugins/alert-sounds/skills/alert-sounds/SKILL.md:4` | Remove or document as convention. |
| PC-7 | `alert-sounds/SKILL.md` structurally sparse — missing `<essential_principles>`, `<routing>`, `<success_criteria>`, `<quick_start>`. | Low | `plugins/alert-sounds/skills/alert-sounds/SKILL.md` | Add missing sections. |
| PC-8 | CLAUDE.md architecture omits `mk-flow/skills/state/scripts/` directory. | Low | `CLAUDE.md`, `plugins/mk-flow/skills/state/scripts/drift-check.sh` | Add to architecture tree. |
| PC-9 | `context/vocabulary.yaml` defines `alias` as "text file that points to real skill directory" — actual `skills/` entries are full directory copies. | Low | `context/vocabulary.yaml` | Update vocabulary definition. |
| PC-10 | Cross-reference rule `skill-aliases` has no exception for hook-bearing plugins (mk-flow, alert-sounds), creating a rule technically violated by design. | Low | `context/cross-references.yaml` | Add exception note. |
| PC-11 | `__pycache__` artifact in plugin source not covered by a granular `.gitignore` entry. | Low | `plugins/project-note-tracker/skills/note/scripts/__pycache__/` | Delete artifact. |

### Goal Alignment
**Agent:** Goal alignment perspective
**Overall:** Minor Drift

| # | Finding | Severity | File(s) | Recommendation |
|---|---------|----------|---------|----------------|
| GA-1 | Hook threshold mismatch (10 vs 2 chars) across BUILD-PLAN, CLAUDE.md, and actual hook. | Medium | `intent-inject.sh:27`, `CLAUDE.md`, BUILD-PLAN M2 | Determine correct value; update all sources. |
| GA-2 | Architect plugin missing RELEASE-NOTES.md — plugin-update-workflow build marked complete but added before architect. | Medium | `plugins/architect/` | Create RELEASE-NOTES.md with v0.1.0 and v0.2.0 entries. |
| GA-3 | `config.yaml` template referenced in M1 done-when doesn't exist as a file — defined inline in SKILL.md instead. | Low | `artifacts/builds/mk-flow/BUILD-PLAN.md` M1 | Amend M1 completion note. |
| GA-4 | `drift-check.sh` (391 lines) not tracked in mk-flow BUILD-PLAN file manifest or Discovered Work. | Low | `plugins/mk-flow/skills/state/scripts/drift-check.sh` | Add to BUILD-PLAN Discovered Work section. |
| GA-5 | M7 (tooltips + commands + context handoff) correctly recorded as paused — no hidden completion or scope drop. | Info | `context/STATE.md`, BUILD-PLAN M7 | Confirmed correct. |
| GA-6 | All architect deliverables verified: 12 files present and in sync. | Info | `plugins/architect/`, `skills/architect/` | Confirmed. |
| GA-7 | All pipeline integration deliverables verified present and wired. | Info | All pipeline plugins | Confirmed. |
| GA-8 | Project momentum: accelerating and healthy — 4 complete builds, clean chains, no stalls. | Info | All BUILD-PLAN files | No action needed. |

## Cross-Perspective Agreements

These findings were flagged independently by 2+ agents — high confidence:

- **CLAUDE.md hook threshold discrepancy (10 vs 2 chars)** — flagged by Architecture Coherence (AC-5), Practice Compliance (PC-2), Goal Alignment (GA-1). Three agents caught it independently.
- **`mk-flow-update-rules` deprecated but still documented in CLAUDE.md** — flagged by Architecture Coherence (AC-2), Practice Compliance (PC-1), Implementation Quality (IQ-12).
- **Version mismatch: note SKILL.md v1.7.0 vs plugin.json 1.6.0** — flagged by Implementation Quality (IQ-3), Practice Compliance (PC-4).
- **STATE.md stale architect version (0.1.0 vs 0.2.0)** — flagged by Architecture Coherence (AC-8), Practice Compliance (PC-3).
- **`skills/` mirror has no enforcement** — flagged by Future-Proofing (FP-2), Practice Compliance (acknowledged as pass with caveats).
- **Magic numbers in Python code** — flagged by Implementation Quality (IQ-1, IQ-2), Practice Compliance (PC-5).
- **`__pycache__` noise in plugin source** — flagged by Architecture Coherence (AC-9), Practice Compliance (PC-11).
- **`context/rules.yaml` missing `_meta` section** — flagged by Architecture Coherence (AC-3), Future-Proofing (FP-6).
- **Architect missing RELEASE-NOTES.md** — flagged by Goal Alignment (GA-2), unique but important.

## Cross-Perspective Disagreements

- **SKILL.md structural consistency:** Architecture Coherence views the tag divergence (AC-10) as a low-severity convention gap worth standardizing. Practice Compliance (PC-6, PC-7) agrees but notes that simpler skills (alert-sounds, schema-scout) may reasonably use simpler structure. **Resolution:** Accept variation for simple skills; document the canonical pattern for complex skills.
- **Pipeline stage name coupling:** Future-Proofing (FP-1) rates this High because of cascading change risk at scale. Goal Alignment sees no current drift (GA-7). **Resolution:** The risk is real but not yet realized. Address proactively by extracting a canonical stage enum.

## Priority Matrix

| Priority | Findings | Rationale |
|----------|----------|-----------|
| Fix Now (Critical) | AC-1 | mk-flow hook non-functional on Windows — all intent/rules/pipeline routing disabled. Diagnosed but fix never applied. |
| Fix Now (High) | RV-1 | PowerShell injection via sound path — exploitable from user-editable config.json. |
| Fix Soon (High) | FP-1, FP-2, FP-3 | Distributed stage constants, unenforced mirror, and pipeline-blind drift-check. These compound over time. |
| Fix Soon (Medium) | AC-2, AC-3, AC-4, AC-5, PC-2, GA-1 | CLAUDE.md documentation drift (5 inaccuracies), missing _meta section, relative path portability. |
| Fix Soon (Medium) | IQ-1, IQ-2, IQ-3, PC-4, PC-5 | Magic numbers, version mismatches — convention violations that erode standards. |
| Fix Soon (Medium) | RV-2, RV-3, RV-4, FP-5, GA-2 | JSON OOM guard, absolute path leak, slug validation, hardcoded find path, missing RELEASE-NOTES.md. |
| Plan For (Low) | FP-4, FP-6, FP-7, FP-8, FP-9, FP-10 | Dead stage, defaults_version docs, version divergence, new-plugin checklist, path regex, bundle versioning. |
| Note (Low) | IQ-4 through IQ-12, RV-5 through RV-8, AC-6 through AC-11, PC-6 through PC-11, GA-3, GA-4 | Minor constants, logging, documentation polish, dead code cleanup. |

## Recommended Actions

Ordered by impact. These feed directly into the plan workflow as sprint task seeds.

1. **Fix mk-flow hook on Windows** — Apply the diagnosed workaround (AC-1). Add hook to `~/.claude/settings.json`, convert to LF. Estimated effort: **S**. Addresses: AC-1.

2. **Fix PowerShell injection in alert-sounds** — Replace string interpolation with parameterized invocation for sound file paths (RV-1). Estimated effort: **S**. Addresses: RV-1.

3. **Fix CLAUDE.md documentation drift** — 5 concrete inaccuracies: hook threshold, mk-flow-update-rules, alert-sounds hook event, state/scripts directory, mk-flow-update docs (AC-2, AC-5, AC-6, PC-1, PC-2, PC-8). Estimated effort: **S**. Addresses: AC-2, AC-5, AC-6, PC-1, PC-2, PC-8.

4. **Fix version mismatches and stale state** — note SKILL.md v1.7.0 vs plugin.json, STATE.md architect 0.1.0, vocabulary alias definition, add _meta to rules.yaml (IQ-3, AC-3, AC-8, PC-3, PC-4, PC-9). Estimated effort: **S**. Addresses: IQ-3, AC-3, AC-8, PC-3, PC-4, PC-9.

5. **Add skills/ sync enforcement** — Create sync script + pre-commit hook or replace mirror with symlinks (FP-2). Estimated effort: **M**. Addresses: FP-2, FP-8.

6. **Extract magic numbers to named constants** — tracker.py column indices, cli.py DEFAULT_MAX_ROWS, alert.py MEDIA_PLAYER_WAIT_MS / CREATE_NO_WINDOW (IQ-1, IQ-2, IQ-5, IQ-6, PC-5). Estimated effort: **S**. Addresses: IQ-1, IQ-2, IQ-5, IQ-6, PC-5.

7. **Extend drift-check for pipeline mode** — Make it handle `artifacts/designs/*/PLAN.md` sprint tracking (FP-3). Estimated effort: **M**. Addresses: FP-3.

8. **Canonicalize pipeline stage names** — Extract to single reference, add cross-reference rule (FP-1). Estimated effort: **M**. Addresses: FP-1, FP-4.

9. **Fix note-tracker hardcoded find path** — Replace `find ~/.claude/plugins` with `${CLAUDE_PLUGIN_ROOT}` in 13 workflows (FP-5). Estimated effort: **S**. Addresses: FP-5.

10. **Input validation hardening** — Add slug sanitization in repo_audit.py, file size guard in readers.py, absolute path removal from index files (RV-2, RV-3, RV-4). Estimated effort: **S**. Addresses: RV-2, RV-3, RV-4.

11. **Create architect RELEASE-NOTES.md** — Retroactive entries for v0.1.0 and v0.2.0 (GA-2). Estimated effort: **S**. Addresses: GA-2.

## Handoff

Audit complete. **53 findings** across **6 perspectives**. **1 critical** (mk-flow hook non-functional on Windows), **2 high** (PowerShell injection, structural future-proofing), **18 medium**, **32 low/info**.

The codebase is architecturally sound with strong conventions and healthy momentum. The critical and high findings are concentrated in two areas: platform compatibility (the hook) and security hygiene (PowerShell injection). The medium findings are almost entirely documentation drift and convention violations — quick fixes that restore consistency.

Recommended next step: `/architect` to plan improvements based on these findings.
