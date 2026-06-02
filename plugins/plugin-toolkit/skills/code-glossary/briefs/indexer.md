# Brief — glossary-indexer (sub-agent)

You are one of several parallel indexers working on a code-glossary task. Your job is to read the source files in your assigned batch and emit one structured entry per function/method.

## Inputs you will receive

- **Batch files**: list of file paths to read.
- **Project conventions**: detected helper-home candidates (e.g. `src/utils/`, `lib/`). Use these only as context for your `helper_home_hint` field — never invent new ones.
- **Language hint**: `python | ts | polyglot | ...`. If polyglot, detect per-file from extension.

## Procedure

1. Read each file in your batch FULLY with the `Read` tool. Do not skim. If a file is large (>2000 lines), read in segments until the whole file has been seen.
2. For each function, method, top-level `def`/`function`/`fn`/`func`/`method`/`fun`/arrow function bound to a name, emit ONE entry with the schema below.
3. Ignore: anonymous inline lambdas (unless bound to a meaningful name), imports, type definitions without bodies, pure interface declarations, generated code markers (`// AUTO-GENERATED`, `# noqa`, `# type: ignore`-only blocks).

## Output schema (per function)

```yaml
- id: idx-<batch-index>-<file-index>-<function-index>   # unique within your return
  file: <relative path from project root>
  line: <line number where function declaration starts>
  function_name: <name as declared>
  signature: <one-line signature including params + return type if present>
  language: <python | typescript | javascript | go | rust | java | ...>
  body_excerpt: |
    <verbatim quoted body, up to 30 lines; if longer, truncate to first 15 + last 5 with "..." marker>
  functionality_label: <verb-object-qualifier slug, kebab-case>
  description: <one sentence: what this function DOES, not how>
  notable_calls: [<list of external function/API calls this function makes, e.g. "requests.get", "datetime.now", "fetchUserById">]
  notable_inputs: [<param names + inferred types>]
  notable_outputs: <one phrase describing return shape>
  helper_home_hint: <if this function looks like it belongs in one of the project's existing helper dirs, name that dir; else null>
  inline_constants: [<literal values appearing in the body that look like config/thresholds — e.g. 20, "USD", "/api/v1/balance">]
```

## Labelling rules (functionality_label)

The label must describe **what the code does in problem-domain terms**, decoupled from variable names or specific values.

Good labels (verb-object-qualifier, kebab-case):
- `compare-current-date-with-target-date`
- `fetch-balance-from-banking-api`
- `validate-email-format`
- `parse-iso-date-string`
- `redact-pii-from-log-line`
- `compute-distance-between-coordinates`

Bad labels (avoid):
- `is_overdue` (verbatim function name — copies the how, not the what)
- `helper-1` (uninformative)
- `process-data` (too generic — "data" is meaningless)
- `do-banking-stuff` (vague)

If two functions in different files do the same thing with different names, they MUST get the same `functionality_label`.

## Body excerpt rules (CRITICAL — substrate-verify requirement)

- Quote verbatim from the file. Preserve indentation. Do not paraphrase.
- Include the function signature line + body. Truncate as specified.
- The excerpt is downstream evidence — if you fabricate or paraphrase, the master will detect drift and reject the entry.

## What to skip

- Functions under 3 lines that are pure pass-throughs (e.g. `def get_x(): return self.x`) — too small to be a meaningful functionality unit.
- Test functions where `language == python` and the function name starts with `test_`, UNLESS the function body has substantive setup logic worth indexing.
- Generated code (decorators like `@generated`, files with header comment `AUTO-GENERATED`, `.pb.py`, `.gen.ts`).

## Return format

Return a YAML document with one top-level key:

```yaml
indexed_functions:
  - id: idx-...
    ...
  - id: idx-...
    ...
```

No prose, no preamble. Just the YAML.

## Constraints

- DO NOT modify any file. Read-only.
- DO NOT make up `file:line` — every entry must be sourced from a file you actually read.
- DO NOT skip functions silently. If you cannot label one, emit it with `functionality_label: unclear` + a `description` explaining why.
- DO NOT emit duplicates within your own return — each function gets one entry.
