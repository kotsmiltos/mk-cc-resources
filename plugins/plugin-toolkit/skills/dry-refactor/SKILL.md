---
name: dry-refactor
description: Execute extractions a code-glossary run proposed — MVP preflight + dry-run only. Reads GLOSSARY.yaml (frozen schema v1), runs the 7 Appendix-A pre-flight gates (baseline tests, git-clean, target module, verification status, confidence floor, substrate-verify, gitignore), then prints the planned helper + per-site edit plan WITHOUT writing any source file. Use after /code-glossary marks clusters extractable and you want to see exactly what an extraction would change before committing to it. Live execution (writes, rollback, test-after-each) is a later version behind its own gate.
argument-hint: "<glossary.yaml> <gloss-id> [--dry-run] [--all-high-confidence]"
---

<objective>
Turn one extractable glossary cluster into a concrete, reviewable refactor plan: gate checks first, then the synthesized helper and a per-site edit plan. **MVP contract: zero writes to source files — ever.** The output is a plan, not a change.
</objective>

<context>
**Design source of truth:** `DESIGN-V2.md` Appendix A in the code-glossary skill folder (sibling skill). This MVP implements Appendix-A phases 0–2 (preflight + dry-run); the execution loop (helper write, call-site rewrites, test-after-each, rollback) is deferred to a later version with its own user gate.

**Engine.** Deterministic checks live in the code-glossary skill's Python package, sub-package `code_glossary.dry_refactor`. Resolve the engine folder: `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary` (in development: `plugins/plugin-toolkit/skills/code-glossary`). Then:

```
uv run --project <engine_folder> python -m code_glossary.dry_refactor.runner <stage> ...
```

Stages: `preflight`, `substrate`, `detect-test`. Each prints `key: value` lines. Exit 0 = ok / user gates only; exit 1 = blocked (a hard-fail gate); exit 2 = hard failure (bad inputs). The engine never executes test suites and never writes to the target project.

**Input contract:** GLOSSARY.yaml frozen schema v1 — `canonical_signature`, `proposed_module`, `invariant_skeleton`, `variant_axis`, per-instance `variant_values` are all guaranteed present on extractable entries (Appendix A "Schema requirements").
</context>

<instructions>

## 1. Parse arguments

`$ARGUMENTS`: `<glossary.yaml> <gloss-id>` for one cluster, or `<glossary.yaml> --all-high-confidence` for every high-confidence extractable entry. `--dry-run` is accepted for forward compatibility — in the MVP **every invocation is a dry-run**; say so in one line when the flag is absent. Optional pass-through flags: `--override-unverified`, `--override-low-confidence`.

Resolve the target project root = the directory the glossary describes (ask the user if ambiguous — instance paths must resolve against it). Abort with a clear message if the glossary file doesn't exist.

## 2. Engine preflight

For each selected cluster:

```
uv run --project <engine_folder> python -m code_glossary.dry_refactor.runner preflight \
  --glossary <glossary.yaml> --gloss-id <id> --root <project_root> \
  [--config <project>/glossary/config.yaml] [--override-unverified] [--override-low-confidence]
```

Relay the gates to the user per the Appendix-A severity table:

| Gate result | Your behavior |
|---|---|
| `verdict: blocked` (any `fail`) | HARD STOP for this cluster. Quote the failing gate detail verbatim. Substrate fail → "glossary is stale, re-run /code-glossary first". |
| gate 1 `ask` (baseline tests) | Run the named test command yourself (Bash), report pass/fail. Suite red → HARD STOP: "fix tests first; can't plan an extraction against a broken baseline". |
| gate 3 `ask` (target module missing) | Ask the user: OK to create `<proposed_module>` in the live phase? Record the answer in the plan; never treat silence as yes. |
| `warn` gates (git dirty, gitignored files) | Surface in the report; not blocking for a dry-run. |

## 3. Estimate and confirm (lock row 16)

Before producing plans: report clusters selected, total call sites, files touched, and that the run dispatches **zero sub-agents** by default. Wait for user OK when more than one cluster is selected.

## 4. Dry-run plan (you, inline — no writes)

For each cluster that passed:

1. **Synthesize the helper** from the entry: `canonical_signature` as the signature, `invariant_skeleton` as the body with `variant_axis` parameters in place of `{placeholders}`. Present it as a fenced code block, target path = `proposed_module`.
2. **Per-site edit plan**: for every instance, show `file:line — function` and the replacement call — helper name parameterized with this instance's `variant_values`. Show, do not apply.
3. **Test plan line**: the detected/configured test command that the live phase would run after each site.

Optionally (complex helpers only, with user OK per the estimate gate): dispatch one sub-agent with `briefs/helper-writer.md` to draft the helper body; its return is still print-only.

## 5. Report

```
dry-refactor (MVP dry-run): <glossary.yaml>

Cluster:   <gloss-id> <name> — <n> sites across <m> files
Gates:     <pass/warn/ask/fail per gate, one line each>
Helper ->  <proposed_module> (NOT written)
Sites:     <file:line per instance> (NOT modified)
Tests:     <command> (live phase would run after each site)

No files were created or modified. Live execution ships in a later
version behind its own gate.
```

</instructions>

<failure_handling>
Never silent:

| Failure | Behavior |
|---|---|
| Glossary missing / schema-invalid | Hard stop; quote the loader error. |
| gloss-id absent or not extractable | Hard stop; list known extractable ids. |
| Preflight `verdict: blocked` | Hard stop for that cluster; verbatim gate detail. |
| Baseline test run red | Hard stop; quote failing output. |
| Substrate stale | Hard stop; "re-run /code-glossary first". |
| `--all-high-confidence` selects zero clusters | Report it plainly — nothing to plan is a valid outcome. |
</failure_handling>
