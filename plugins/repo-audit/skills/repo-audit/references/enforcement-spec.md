# Enforcement Specification

## Pre-commit hook

`.pre-commit-config.yaml` wires `scripts/enforce_amendment_protocol.py` to run on every commit. It:

1. Identifies staged code-like files (by extension)
2. Identifies staged amendment records (in `_code_audit/amendments/`)
3. Validates each amendment has ALL required YAML fields:
   - `mode: amend`
   - `snapshot_used: CLAUDE.md`
   - `patterns_used: _code_audit/patterns.md`
   - `integrity_check_done: true`
   - `primary_files` (non-empty list)
   - `related_files_considered` (list)
   - `updated_files` (list covering all changed code files)
4. Checks that every changed code file appears in at least one amendment's `updated_files`
5. Exits non-zero if any check fails — blocking the commit

## CI check

`.github/workflows/enforce-amendment.yml` runs the same validator on PRs to the default branch, using `git diff` against the auto-detected default branch to find all changed files.

## Excluded from enforcement

- Files under `_code_audit/` (audit outputs)
- Files under `.github/` (CI workflows)
- `CLAUDE.md`, `.gitignore`, `LICENSE`
- Markdown files outside `_code_audit/`
- Pure file deletions

## Code-like file extensions

**Source:** `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.sh`, `.bash`, `.zsh`, `.ps1`

**Config:** `.toml`, `.yaml`, `.yml`, `.json`

Any file with these extensions that is NOT excluded triggers amendment enforcement.
