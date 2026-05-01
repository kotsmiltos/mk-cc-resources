---
schema_version: 1
sprint: {{sprint_number}}
findings_total: {{findings_total}}
confirmed_critical: {{confirmed_critical}}
confirmed_unacknowledged_criticals: {{confirmed_unacknowledged_criticals}}
acknowledged: {{acknowledged_count}}
needs_context: {{needs_context_count}}
false_positives: {{false_positives_count}}
lenses_run: {{lenses_run}}
lenses_missing: {{lenses_missing}}
---

# QA report — sprint {{sprint_number}}

## Deterministic gate

`confirmed_unacknowledged_criticals` = **{{confirmed_unacknowledged_criticals}}**.

{{gate_decision}}

## Findings

{{findings_table}}

## Spec compliance

See `spec-compliance.yaml` for the canonical record. Summary:

{{spec_compliance_summary}}

## False positives

{{false_positives_summary}}

## Needs context (user resolution required)

{{needs_context_items}}

## Lens coverage

{{lens_coverage}}
