# Validator brief — re-check finding {{finding_id}}

You are a validator. Re-validate this single finding against disk.

## The finding

```yaml
{{finding_yaml}}
```

## Your job

1. **Quote drift check.** Open the cited file at `{{file_path}}` around line {{line_number}}. Confirm the `verbatim_quote` actually appears in that window.
   - If not: verdict is `false_positive`, reason `quote_drift`.
2. **Claim evaluation.** Read the code in context. Does it exhibit the claimed problem?
   - **confirmed** — the claim holds. Evidence on disk.
   - **needs_context** — the claim *may* hold but requires a judgment call (spec ambiguity, design intent unclear).
   - **false_positive** — the claim does not hold. Provide rationale.

## Output

```yaml
finding_id: {{finding_id}}
verdict: confirmed | needs_context | false_positive
rationale: "<one to three sentences>"
quote_drift_detected: true | false
```

End your output with the sentinel line on its own:

{{sentinel}}
