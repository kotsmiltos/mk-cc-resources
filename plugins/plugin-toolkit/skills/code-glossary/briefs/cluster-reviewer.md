# Brief — glossary-cluster-reviewer (Pass B sub-agent)

You review ONE candidate cluster produced by deterministic clustering.
The engine grouped these functions because their signals (structure,
signature, label) agree. You judge whether they truly compute the same
thing, and if so, design the extraction.

## Inputs you will receive

- **Slice file path**: a YAML file containing the cluster metadata and
  every member record WITH its verbatim body. Read it first; it is your
  primary evidence. Re-read the actual source files only when the slice
  body looks truncated or you need surrounding context.
- **Helper-home candidates**: existing shared-code dirs (e.g.
  `src/utils/`, `Assets/Scripts/Shared/`). `proposed_module` MUST live
  in one of these or be an obvious sibling file. NEVER invent a new
  top-level directory.

## Procedure

1. Read the slice. For each member, determine behaviorally: given the
   same inputs, would these compute the same result modulo the parts
   that vary (names, constants, types)?
2. Decide ONE of:
   - **confirm** — all members are the same functionality
   - **split** — the label/shape match is superficial; the members form
     2+ distinct functionalities (name the groups)
   - **reject-to-singles** — no two members belong together (split into
     all-singleton groups)
3. For each confirmed group with 2+ members, design the extraction:
   - `canonical_signature` — pseudocode signature of the shared helper
   - `proposed_module` — target file under a helper-home candidate
   - `invariant_skeleton` — the shared structure as pseudocode, with
     `{placeholders}` where instances differ
   - `variant_axis` — one entry per placeholder: parameter name, the
     concrete value each instance uses, inferred type
   - `variant_values` — per member-record-id mapping of placeholder values
4. Set `extractable: true` ONLY when you produced all four fields and
   are confident the extraction is mechanical. The renderer enforces
   this gate — a bare claim without the fields is demoted and flagged.

## Return format

Return ONLY this YAML — one enrichment entry for the cluster:

```yaml
enrichments:
  - cluster_id: <id from the slice, verbatim>
    name: <kebab-case canonical functionality name>
    description: <one sentence>
    kind: leaf | composite
    behavioral_statement: <one sentence: what these compute>
    extractable: true | false
    canonical_signature: <pseudocode, required if extractable>
    proposed_module: <path, required if extractable>
    invariant_skeleton: |
      <pseudocode with {placeholders}, required if extractable>
    variant_axis:
      - parameter: <name>
        instance_values: [<one per member>]
        inferred_type: <type>
    variant_values:
      <member-record-id>: { <parameter>: <value> }
    notes: <required if extractable false — say WHY: semantics differ,
           language-idiomatic, framework hook, too trivial, etc.>
```

For a **split**, return the `split` key instead of top-level enrichment
fields — one group object per distinct functionality (singleton groups
allowed; orphaned members fall to the watchlist automatically):

```yaml
enrichments:
  - cluster_id: <id>
    split:
      - member_ids: [<record ids>]
        name: <kebab-case>
        description: <one sentence>
        extractable: true | false
        # ...same extraction fields as above, per group
```

## Constraints

- Read-only. Do NOT modify any file.
- Member record IDs come from the slice, verbatim. Never invent IDs.
- Do NOT mark extractable on fewer than 2 members.
- `instance_values` must come from the actual bodies in the slice —
  quote real values, never plausible-sounding ones.
- One `enrichments` entry per cluster — yours. Do not return entries
  for clusters you were not assigned.
