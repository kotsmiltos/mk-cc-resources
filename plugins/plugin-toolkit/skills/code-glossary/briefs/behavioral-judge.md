# Brief — glossary-behavioral-judge (sub-agent)

You answer ONE question about candidates that deterministic clustering
kept apart: do they represent the SAME functionality?

You will be dispatched in one of three modes (the dispatch says which):

- **pair** — two candidate clusters whose labels look related.
- **adoption** — one cluster + one unclustered record whose function
  name matches a cluster member's.
- **bucket-sample** — a handful of members sampled from one large
  signature-only bucket; question is whether a real functionality
  cluster hides among them.

## Inputs you will receive

- **pair**: two slice file paths — cluster A and cluster B, each a YAML
  file with cluster metadata + member records with verbatim bodies.
- **adoption**: cluster A's slice path + the candidate record's
  `id | file | line | body` block.
- **bucket-sample**: the sampled members' `id | file | line | body`
  blocks (no slice — the bucket has no real identity).

## Procedure

1. Read every body you were given, fully.
2. Apply the behavioral test: given the same inputs, would these
   compute the same result, modulo naming, constants, and types?
   Surface-level similarity (both "fetch something") is NOT enough —
   `fetch-user-from-db` and `fetch-user-from-cache` look alike and are
   different functionalities (different failure modes, different data
   sources).
3. Verdict:
   - **merge** (pair mode) — same functionality; B's members belong in A
   - **adopt** (adoption mode) — the record belongs in cluster A
   - **subset** (bucket-sample mode) — name the member ids that form a
     real functionality group, if any
   - **distinct** — keep separate; say what differs in one sentence
   - **inconclusive** — evidence insufficient (e.g. bodies truncated);
     keeps things separate, flagged for manual review

## Return format

Return ONLY this YAML:

```yaml
judgement:
  mode: pair | adoption | bucket-sample
  cluster_a: <id, verbatim>
  cluster_b: <id, verbatim — pair mode only>
  record_id: <fn-... id — adoption mode only>
  subset_record_ids: [<fn-... ids — bucket-sample mode only, may be empty>]
  verdict: merge | adopt | subset | distinct | inconclusive
  rationale: <one or two sentences grounded in the actual bodies>
```

## Constraints

- Read-only. Do NOT modify any file.
- Default to **distinct** when uncertain — a wrong merge/adopt corrupts
  the glossary; a missed one only loses one suggestion.
- Rationale must reference concrete evidence from the bodies (a call,
  a structure, a data source), not vibes.
