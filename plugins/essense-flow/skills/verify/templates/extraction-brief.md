---
artifact: extraction-brief
schema_version: 1
produced_by: verify
consumed_by: verify-synthesis
---

Spec Item Extractor. Job: read spec, produce structured list of every claim, decision, feature, constraint.

## Hard Constraints

- Quote spec text VERBATIM — do not paraphrase, summarize, or rephrase any item
- Tag every item as `verifiable: true` or `verifiable: false` and provide `verifiable_reason` explaining why
- Tag every verifiable item with `files`: list of likely implementation files from file tree (may be empty if no match apparent)
- Do NOT assign item IDs — runner assigns stable IDs after extraction
- Do NOT filter or skip items — extract every meaningful statement, including constraints, design decisions, rationale statements, and philosophy; non-verifiable items still required
- Every item's `section` must match one of `section_headings` values exactly
- Every item's `text` must be verbatim substring of spec — runner rejects any text not found in spec

## Context

<data-block source="spec">
{{SPEC_CONTENT}}
</data-block>

<data-block source="file-tree">
{{FILE_TREE}}
</data-block>

## Task

Read spec in full. Extract every meaningful statement: claims, decisions, features, constraints, goals, rationale.

For each item:

- `text`: verbatim quote from spec (copy exact characters — do not alter whitespace or punctuation)
- `section`: `##`-level heading this item belongs under (must match `section_headings` exactly)
- `verifiable`: `true` if item makes concrete, testable claim about implementation; `false` for philosophy, rationale, goals, or context
- `verifiable_reason`: brief explanation of why item is or is not verifiable
- `files`: list of relative file paths from file tree likely relevant to this item (empty list `[]` if unclear)

Deciding `verifiable`:
- **True** — item describes behavior, output, structure, or constraint that can be confirmed or refuted by reading code or running system. Examples: "The runner writes extracted-items.yaml", "Lock file prevents concurrent access".
- **False** — item states goal, motivation, principle, or background context that cannot be directly tested in code. Examples: "The design prioritises simplicity", "This phase exists to catch drift early".

## Output Format

Single YAML code block. Must be last fenced code block in response. No other YAML or JSON blocks after it.

```yaml
schema_version: 1
spec_hash: "{{SPEC_HASH}}"
total_items: <integer — count of all items in list below>
verifiable_items: <integer — count of items where verifiable: true>
section_headings:
  - "<exact text of each ## heading in spec, in order>"
items:
  - text: "<verbatim text from spec>"
    section: "<## heading this item belongs under>"
    verifiable: true
    verifiable_reason: "<why this is verifiable>"
    files:
      - "relative/path/to/file.js"
  - text: "<verbatim text from spec>"
    section: "<## heading this item belongs under>"
    verifiable: false
    verifiable_reason: "<why this is not verifiable>"
    files: []
```

## Acceptance Criteria

1. Every `##`-level section in spec has at least one extracted item
2. Every item's `text` is verbatim substring of spec (no paraphrasing)
3. `total_items` equals length of `items` array
4. `verifiable_items` equals count of items where `verifiable: true`
5. Every item's `section` appears in `section_headings`
6. No item has `id` field — runner assigns IDs
7. Output ends with SENTINEL line

<!-- SENTINEL:COMPLETE:{{BRIEF_ID}}:{{AGENT_ID}} -->
