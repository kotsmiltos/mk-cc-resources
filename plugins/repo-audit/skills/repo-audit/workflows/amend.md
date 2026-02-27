<required_reading>

Read these files before proceeding:

1. references/enforcement-spec.md
2. references/amendment-fields.md
3. templates/amendment-record.md

</required_reading>

<process>

## Step 1: Read the snapshot and patterns

Before ANY code changes, read:
1. `CLAUDE.md` — the codebase snapshot
2. `_code_audit/patterns.md` — the pattern index and touch points

## Step 2: Pre-change cross-cutting analysis

Identify:
- **Primary target** — the file(s) you intend to change
- **Pattern(s) involved** — which patterns from `patterns.md` are relevant (include IDs)
- **Canonical implementation** — the "source of truth" for this pattern
- **Related implementations** — all files that follow the same pattern (from touch points)
- **Shared helpers/utilities** — any shared code that might be affected

## Step 3: Create amendment record

Check if `scripts/repo_audit.py` exists in the target repo.

**If the CLI script exists**, use it (use whichever Python command is available — `python3` or `python`):

```bash
python3 scripts/repo_audit.py amend \
    --slug <short-name> \
    --description "<what and why>" \
    --primary <main_files> \
    --related <related_files> \
    --files <all_changed_files> \
    --patterns <pattern_ids>
```

This creates `_code_audit/amendments/YYYY-MM-DD_<slug>.md` with all required YAML fields.

**If the CLI script does NOT exist**, create the amendment record directly. Read `templates/amendment-record.md` for the exact structure and write it to `_code_audit/amendments/YYYY-MM-DD_<slug>.md`.

See `references/amendment-fields.md` for the full specification of required and recommended fields.

## Step 4: Fill in the amendment

Complete the Pre-Change Cross-Cutting Analysis section and description.

## Step 5: Make code changes

Now — and only now — make the actual code changes.

## Step 6: Post-change integrity check

Fill in the Cross-Cutting Integrity Check section:
- Patterns reviewed
- Files updated
- Files NOT updated (with justification for each)
- Tests updated
- Docs updated
- Whether `CLAUDE.md` or `patterns.md` need updates

## Step 7: Update amendment's updated_files

Ensure every changed code file is listed in the amendment's `updated_files` YAML field.

## Step 8: Stage and commit

Stage both the amendment record and all changed files together:

```bash
git add _code_audit/amendments/<your-amendment>.md <changed-files>
git commit
```

The pre-commit hook will validate the amendment before allowing the commit (if enforcement is installed).

</process>

<success_criteria>

Amendment is complete when:

- [ ] `CLAUDE.md` and `_code_audit/patterns.md` were read before any changes
- [ ] Cross-cutting analysis identified all related implementations
- [ ] Amendment record created with all required YAML fields
- [ ] All code changes are made
- [ ] Integrity check section is filled in
- [ ] Every changed code file is listed in `updated_files`
- [ ] Amendment and code files are staged and committed together
- [ ] Pre-commit hook passed (if installed)

</success_criteria>
