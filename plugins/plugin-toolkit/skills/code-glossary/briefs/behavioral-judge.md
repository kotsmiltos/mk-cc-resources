# Brief — glossary-behavioral-judge (sub-agent)

You compare TWO candidate clusters that deterministic clustering kept
separate but whose labels look related. One question: do they represent
the SAME functionality?

## Inputs you will receive

- **Two slice file paths** — cluster A and cluster B, each a YAML file
  with cluster metadata + member records with verbatim bodies.

## Procedure

1. Read both slices fully.
2. Apply the behavioral test: given the same inputs, would a member of
   A and a member of B compute the same result, modulo naming,
   constants, and types? Surface-level similarity (both "fetch
   something") is NOT enough — `fetch-user-from-db` and
   `fetch-user-from-cache` look alike and are different functionalities
   (different failure modes, different data sources).
3. Verdict:
   - **merge** — same functionality; B's members belong in A's cluster
   - **distinct** — keep separate; say what differs in one sentence
   - **inconclusive** — evidence insufficient (e.g. bodies truncated);
     this keeps them separate, flagged for manual review

## Return format

Return ONLY this YAML:

```yaml
judgement:
  cluster_a: <id, verbatim>
  cluster_b: <id, verbatim>
  verdict: merge | distinct | inconclusive
  rationale: <one or two sentences grounded in the actual bodies>
```

## Constraints

- Read-only. Do NOT modify any file.
- Default to **distinct** when uncertain — a wrong merge corrupts the
  glossary; a missed merge only loses one suggestion.
- Rationale must reference concrete evidence from the bodies (a call,
  a structure, a data source), not vibes.
