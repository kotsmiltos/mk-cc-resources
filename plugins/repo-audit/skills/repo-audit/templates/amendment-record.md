# Amendment Record Template

Write this to `_code_audit/amendments/YYYY-MM-DD_<slug>.md`:

```yaml
---
mode: amend
slug: "<short-name>"
date: "<ISO-8601 datetime>"
description: "<what and why>"
snapshot_used: CLAUDE.md
patterns_used: _code_audit/patterns.md
patterns:
  - "<pattern-id>"
primary_files:
  - "<primary-target-file>"
related_files_considered:
  - "<related-file>"
updated_files:
  - "<every-changed-code-file>"
not_updated_files:
  - path: "<file-not-changed>"
    reason: "<why-not-changed>"
integrity_check_done: true
tests_updated:
  - "<test-file>"
docs_updated:
  - "<doc-file>"
---

## Pre-Change Cross-Cutting Analysis

**Primary target:** <primary files>

**Pattern(s) involved:** <pattern IDs from patterns.md>

**Canonical implementation:** <source of truth for this pattern>

**Related implementations found:**
<files found by searching patterns.md touch points>

**Shared helpers/utilities impacted:**
<any shared code affected>

---

## <description>

<describe what changed and why>

---

## Cross-Cutting Integrity Check

- [ ] Patterns reviewed: <which patterns>
- [ ] Files updated: <list>
- [ ] Files NOT updated (with justification): <list or N/A>
- [ ] Tests updated: <list or N/A>
- [ ] Docs updated: <list or N/A>
- [ ] CLAUDE.md needs update: yes / no
- [ ] patterns.md needs update: yes / no
```
