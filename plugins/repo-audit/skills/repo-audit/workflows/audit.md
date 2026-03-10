<required_reading>
Read these reference files before proceeding:
1. references/enforcement-spec.md
2. references/amendment-fields.md
</required_reading>

<process>

<step_0_setup_enforcement>
Check if `scripts/enforce_amendment_protocol.py` exists in the target repo.

If it already exists, skip to step 1.

If it does NOT exist, read and copy the bundled enforcement files from the `scripts/` directory (located next to this skill's SKILL.md, relative path: `scripts/`) into the target repo:

Python scripts — copy directly:

| Source (relative to SKILL.md) | Destination in target repo |
|-------------------------------|---------------------------|
| `scripts/_audit_config.py` | `scripts/_audit_config.py` |
| `scripts/repo_audit.py` | `scripts/repo_audit.py` |
| `scripts/enforce_amendment_protocol.py` | `scripts/enforce_amendment_protocol.py` |

Pre-commit config — merge, do not overwrite:

Read `scripts/pre-commit-config.yaml` to get the hook definition. Then:
- If the target repo has NO `.pre-commit-config.yaml`: copy the template as-is.
- If the target repo ALREADY has `.pre-commit-config.yaml`: add the `enforce-amendment-protocol` hook to the existing file's `repos` list under a `- repo: local` entry. Do not remove or modify existing hooks.

Before writing, detect which Python command is available (`python3` or `python`) and use it in the hook's `entry` field. The template defaults to `python3`. On Windows or systems where only `python` is available, change it to `python`.

CI workflow — adapt the default branch:

Read `scripts/enforce-amendment.yml`. Before writing to `.github/workflows/enforce-amendment.yml`:
1. Detect the target repo's default branch (`git symbolic-ref refs/remotes/origin/HEAD`, or probe `origin/main` / `origin/master`, or ask the user)
2. Replace `DEFAULT_BRANCH` in the template with the actual branch name

After all files are in place:
1. Create `scripts/` and `.github/workflows/` directories if they don't exist
2. Run `pre-commit install` if pre-commit is available (non-fatal if it fails)
</step_0_setup_enforcement>

<step_1_inventory>
Respect `.gitignore`. Skip vendor dirs, build artifacts, `node_modules/`, `.venv/`, `__pycache__/`.

Identify all code-like files (by extension): `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.sh`, `.bash`, `.zsh`, `.ps1`, `.toml`, `.yaml`, `.yml`, `.json`.
</step_1_inventory>

<step_2_scaffold>
```bash
python3 scripts/repo_audit.py audit
```

Use whichever Python command is available (`python3` or `python`). This creates the directory structure and placeholder files if they don't exist.
</step_2_scaffold>

<step_3_per_file_reports>
For each code file, create `_code_audit/files/<name>.md` following this template:

1. Purpose — What this file does, one paragraph
2. Key Components — Functions, classes, exports with purpose
3. Dependencies — What it imports, what imports it
4. Patterns / Conventions — Coding patterns used, naming conventions
5. Data and Side Effects — I/O, state mutation, external calls
6. Risks / Issues — Bugs, fragility, security concerns
7. Health Assessment — One of: Healthy / Needs Attention / Concerning with short bullets
8. Test Coverage Hints — What to test, fixture strategy
9. Suggested Improvements — Concrete, actionable items

Use parallel Task agents to generate multiple reports simultaneously.
</step_3_per_file_reports>

<step_4_patterns>
Identify recurring structural patterns. For each pattern:
- ID (P1, P2, ...)
- Description of the pattern
- Canonical entry points — where the pattern is defined/originates
- All implementations — every file that follows this pattern
- Touch points — what to check when modifying this pattern
- Variations — deviations or anomalies

Include a Semantic Map of domain nouns and where they live.
</step_4_patterns>

<step_5_supporting_files>
- `_code_audit/index.md` — Consolidated report (metrics, health, per-file links)
- `_code_audit/plan.md` — Improvement plan or "no major issues"
- `_code_audit/tooling.md` — Tooling audit (linters, formatters, CI — based on configs only)
- `_code_audit/test_hints.md` — Test strategy summary
- `_code_audit/README.md` — How to use the system, how enforcement works
</step_5_supporting_files>

<step_6_generate_claude_md>
The root-level codebase snapshot. Must include:
- Repo overview and architecture map
- Key workflows and entry points
- Dependency highlights
- Link to `_code_audit/patterns.md` and audit outputs
- Cross-cutting change policy section explaining the amendment protocol
</step_6_generate_claude_md>

</process>

<success_criteria>
Audit is complete when:
- [ ] Enforcement scripts are installed (or were already present)
- [ ] All code-like files have been inventoried
- [ ] `_code_audit/` is scaffolded with all placeholder files
- [ ] Per-file reports generated for every code file
- [ ] `patterns.md` contains all structural patterns with touch points
- [ ] Supporting files (index, plan, tooling, test_hints, README) are populated
- [ ] `CLAUDE.md` is generated with architecture map and cross-cutting policy
- [ ] Pre-commit hook is installed (if pre-commit is available)
</success_criteria>
