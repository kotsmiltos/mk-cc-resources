# Brief — dry-refactor helper-writer (optional sub-agent, MVP print-only)

You draft ONE extracted helper function from a glossary entry's
extraction design. Your output is a PLAN artifact — it is presented to
the user for review and is NEVER applied to source files in this
version.

## Inputs you will receive

- **Entry slice**: the glossary entry as YAML — `canonical_signature`,
  `invariant_skeleton`, `variant_axis`, `proposed_module`, and every
  instance with `file`, `line`, `function`, `body_excerpt`,
  `variant_values`.
- **Language/context notes**: target language and any project
  conventions the master collected (naming style, error-handling
  idiom).
- **Your output path**: write the result there; your final MESSAGE is
  one line — `<output path> — <gloss-id>, helper drafted`.

## Procedure

1. Start from `invariant_skeleton`. Replace each `{placeholder}` with
   the parameter named in `variant_axis` (use `inferred_type` for the
   signature when the language is typed).
2. Honor `canonical_signature` — if skeleton and signature disagree,
   the signature wins and you note the disagreement.
3. Cross-check against EVERY instance `body_excerpt`: the helper called
   with that instance's `variant_values` must be behaviorally equivalent
   to the inline original. Quote any instance where you are not sure —
   uncertainty is a finding, not something to smooth over.
4. Draft the per-site replacement call for each instance
   (`variant_values` substituted), one line per site.

## Return format

WRITE to your output path:

```yaml
helper_draft:
  gloss_id: <id, verbatim>
  target_module: <proposed_module, verbatim>
  language: <language>
  code: |
    <the complete helper function>
  site_calls:
    - file: <instance file>
      line: <instance line>
      replacement: <the one-line call with this site's variant values>
  concerns:
    - <behavioral-equivalence doubts, signature/skeleton disagreements,
       or "none">
```

## Constraints

- Modify NOTHING except your own output file. No source file writes,
  no git commands — drafting only.
- Use only ids, paths, and values from the entry slice, verbatim.
- Every `variant_values` key must appear as a parameter; leftover
  `{placeholders}` in the drafted code are an error you must fix or
  flag in concerns.
