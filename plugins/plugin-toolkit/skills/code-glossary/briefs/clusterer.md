# Brief — glossary-clusterer (sub-agent)

You are the clusterer for a code-glossary task. Phase 1 (indexer) labelled every function; phase 2 (block-scanner) found duplicated sub-function blocks. Your job is to merge these into a clean canonical glossary that conforms to the frozen schema.

## Inputs

- `indexed_functions` master list (functions with `functionality_label` per phase 1)
- `block_instances` list (duplicated sub-function blocks per phase 2)
- The frozen schema at `templates/glossary.schema.yaml` (read with the `Read` tool before clustering — the master expects strict conformance)

## Procedure

### 1. Read the frozen schema

Read `${CLAUDE_PLUGIN_ROOT}/skills/code-glossary/templates/glossary.schema.yaml` FULLY (in development: `plugins/plugin-toolkit/skills/code-glossary/templates/glossary.schema.yaml`; when installed: `find ~/.claude/plugins -path "*/code-glossary/templates/glossary.schema.yaml" -type f`). The output must conform — extra fields are fine, missing required fields cause master rejection.

### 2. Merge near-duplicate labels

Functions with identical `functionality_label` go in the same cluster. Functions with very similar labels (e.g. `compare-date-with-today` vs `check-date-against-now`) should be merged IF reading the descriptions confirms they do the same thing.

Merging rules:
- Same verb-object — merge candidate. Read descriptions to confirm.
- Same description but different labels — merge, pick the cleaner label as canonical.
- Same label but materially different descriptions — DO NOT merge. Mark as `extractable: false` + `notes: "label collision; semantics differ between instances"`.

### 3. Identify variant axis vs invariant skeleton

For each cluster with ≥2 instances:
- Read every instance's `body_excerpt`.
- Find what is SAME across all instances (control flow, function calls, arithmetic shape) — this is the **invariant skeleton**.
- Find what DIFFERS (constants, identifiers, operators, field names) — these are the **variant axis** entries.

Each variant axis entry is one parameter the extracted function would accept. Example:

```yaml
variant_axis:
  - parameter: threshold_days
    instance_values: [20, 30]
    inferred_type: int
  - parameter: comparison
    instance_values: [">=", "<"]
    inferred_type: str  # or enum
```

If the only difference between instances is a single literal value, that's still a valid variant axis with one parameter.

### 4. Propose canonical signature and module

For extractable clusters (N≥2, clear variant axis):
- `canonical_signature` — Python-style or pseudocode, e.g. `is_date_distance_exceeded(target_date: date, threshold_days: int, comparison: str) -> bool`. Use param names that describe the role, not the original variable names from any single instance.
- `proposed_module` — pick from the `helper_home_hint` values seen in instances, or pick the most common existing helper dir from the project conventions. Append a sensible filename (`date_utils.py`, `api_helpers.py`, `validation.py`). If no helper dir exists in the project, propose `src/utils/<topic>.py` and note in `notes` that this dir would need to be created.

### 5. Extractability confidence

- `high` — clear variant axis, ≥3 instances, instances are in different files (not just sibling functions in one file).
- `medium` — clear variant axis, 2 instances, OR ≥3 instances but instances are in same file/module (might be intentional local-only helpers).
- `low` — variant axis is fuzzy (e.g. structural similarity but instances do slightly different things), or instances differ in ways that suggest the abstraction would leak.

### 6. Handle single-instance functions

Functions that don't cluster with anything else: emit them as `extractable: false` with N=1. They are still in the glossary so future scans can detect when a 2nd instance appears.

Pick `notes` based on why they're single-instance:
- `notes: "single-instance; no duplication detected"` — generic case
- `notes: "language-idiomatic main entrypoint"` — for `main()`, `__init__`, `setup()`
- `notes: "framework hook"` — for `componentDidMount`, `setUp`, route handlers

### 7. Block-instance integration

For each `block_instance` from phase 2: if the block's `functionality_label` matches an existing function-level cluster, attach the block instances as secondary instances of that cluster (with `instance_type: block` and `parent_function_id` set).

If a block's label doesn't match any function cluster, create a new cluster with `primary_unit: block` (instead of `function`).

## Output

Return a YAML document conforming to the frozen schema:

```yaml
glossary:
  - id: gloss-001
    name: <canonical kebab-case>
    description: <one sentence, what it does>
    extractable: true | false
    extractability_confidence: high | medium | low
    canonical_signature: <pseudocode signature, required if extractable>
    proposed_module: <existing-dir path + filename, required if extractable>
    invariant_skeleton: |
      <multi-line pseudocode of the shared structure>
    variant_axis:
      - parameter: <name>
        instance_values: [...]
        inferred_type: <type>
    instances:
      - instance_type: function | block
        file: <path>
        function: <name>
        line: <line number>
        body_excerpt: |
          <verbatim>
        variant_values: { ... }
        parent_function_id: <only if instance_type: block>
    related_functionalities: [<other gloss-ids that this depends on or is related to>]
    notes: <free-text, especially required when extractable: false>
  - id: gloss-002
    ...
```

## Constraints

- Conform strictly to the frozen schema. Master validates and rejects entries missing required fields.
- DO NOT invent instances. Every instance must trace back to an entry in `indexed_functions` or `block_instances`.
- DO NOT mark a cluster `extractable: true` with fewer than 2 instances.
- DO NOT propose a `proposed_module` path that doesn't sit under an existing or sibling-of-existing helper directory in the project.
- DO NOT skip single-instance functions silently — emit them with `extractable: false`.
- DO NOT emit prose, only the YAML.
