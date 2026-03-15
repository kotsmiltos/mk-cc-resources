<amendment_fields>

<required_fields>

| Field | Requirement |
|-------|-------------|
| `mode` | Must be `amend` |
| `slug` | Non-empty string |
| `date` | Non-empty ISO-8601 datetime |
| `description` | Non-empty string |
| `snapshot_used` | Must be `CLAUDE.md` |
| `patterns_used` | Must be `_code_audit/patterns.md` |
| `integrity_check_done` | Must be `true` |
| `primary_files` | Non-empty list |
| `related_files_considered` | List (may be empty `[]`) |
| `updated_files` | List — must include every changed code file |

</required_fields>

<recommended_fields>

| Field | Purpose |
|-------|---------|
| `not_updated_files` | Files found in cross-cutting search but not changed, with reason for each |
| `patterns` | Pattern IDs involved (e.g., P1, P3) |
| `tests_updated` | Test files changed |
| `docs_updated` | Documentation files changed |

</recommended_fields>

</amendment_fields>
