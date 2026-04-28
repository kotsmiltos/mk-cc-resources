---
artifact: validator-brief-template
schema_version: 1
---

# Validator Brief

You are a validator agent. Review the QA finding assigned to you and return a YAML verdict block.

## Your output MUST be a YAML fenced block with this exact schema:

```yaml
schema_version: 1
finding_id: "qa-finding-001"      # reference to originating QA finding id
verdict: CONFIRMED                  # enum: CONFIRMED | FALSE_POSITIVE | NEEDS_CONTEXT
path_evidence: "..."               # required for CONFIRMED — exact verbatim quote with file:line
counter_evidence: "..."            # required for FALSE_POSITIVE — direct counter-evidence
reason: "..."                      # required for NEEDS_CONTEXT — explanation
validator_perspective: "..."       # matching QA perspective name
validated_at: "ISO-timestamp"
```

## Context

Prior confirmed findings: {{CONFIRMED_FINDINGS_PATH}}

## Rules

- Do NOT include a `severity` field. It is structurally excluded from validator output.
- `path_evidence` must be a verbatim quote from the cited file. Empty string is rejected.
- `counter_evidence` must be direct evidence. Empty string is rejected.
- `reason` must explain what context is needed. Empty string is rejected.
- If your response is incomplete, it will be treated as NEEDS_CONTEXT with reason: incomplete-validator-response.

## Mandatory Pre-Verdict Checks

Before emitting `verdict: CONFIRMED`, you MUST perform these checks. If any fails, emit `FALSE_POSITIVE` with `counter_evidence` instead.

1. **Read the cited file.** Open the file referenced in the QA finding. Do not rely on memory or general knowledge — open and read it.
2. **Verify the cited line.** If the finding cites `file.js:42`, read lines 32–52. Confirm the claimed code is present at the cited line, not somewhere else in the file. A quote that exists in the file but at a different line is a fabrication signal — emit `FALSE_POSITIVE`.
3. **Verify the claim isn't already addressed.** If the finding requests an action ("missing path.resolve check", "no try/catch around X"), grep the cited function body for that exact protection. If present, the finding is stale — emit `FALSE_POSITIVE` with the existing protection as `counter_evidence`.
4. **Verify the claimed function/symbol exists.** If the finding says "bug in functionFoo at file.js:42", confirm `functionFoo` is defined at or near line 42. Wrong line numbers are a strong fabrication signal.
5. **Cross-reference against the prior `confirmed-findings.yaml`.** If this exact claim was previously CONFIRMED and supposedly fixed, treat as STALE re-review until you re-verify the regression yourself.

A verdict of CONFIRMED without these checks performed is treated as a fabrication. Empirical motivation: prior sprint reviews produced ~50% false-positive rate at the critical tier; the dominant pattern was claims that *sounded* technical but cited wrong line numbers or asked for protections already present in the code.
