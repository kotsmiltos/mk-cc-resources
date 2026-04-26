> **type:** task-spec
> **sprint:** 5
> **status:** planned
> **depends_on:** None
> **estimated_size:** S

# Task 3: Empty Spec Validation in Transform

## Goal
Make `transformToAgentMd()` return `{ ok: false }` when the input spec has no extractable sections, instead of producing a content-empty `.agent.md` with `ok: true`.

## Pseudocode

```
FUNCTION transformToAgentMd(specContent, architectureContext, config):
  1. (existing) Extract sections
  2. NEW: Validate at least one meaningful section exists:
     if (!sections["goal"] && !sections["pseudocode"] && !sections["acceptance criteria"]):
       return { ok: false, error: "Spec contains no extractable sections (missing Goal, Pseudocode, or Acceptance Criteria)" }
  3. (rest of existing logic)
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `lib/transform.js` | MODIFY | Add section validation after extraction |
| `tests/transform.test.js` | MODIFY | Add test for empty spec → `ok: false` |

## Acceptance Criteria

- [ ] Spec with no `##` headers returns `{ ok: false }` with descriptive error
- [ ] Spec with `## Goal` but no other sections returns `{ ok: true }` (goal alone is sufficient)
- [ ] Existing tests pass (specs with valid sections still transform correctly)
