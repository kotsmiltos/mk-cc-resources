---
schema_version: 1
sprint: {{sprint_number}}
findings_total: {{findings_total}}
confirmed_critical: {{confirmed_critical}}
confirmed_unacknowledged_criticals: {{confirmed_unacknowledged_criticals}}
class_acknowledged: {{class_acknowledged_count}}
acknowledged: {{acknowledged_count}}
needs_context: {{needs_context_count}}
false_positives: {{false_positives_count}}
lenses_run: {{lenses_run}}
lenses_missing: {{lenses_missing}}
---

# QA report — sprint {{sprint_number}}

## Deterministic gate

`effective_confirmed_unacknowledged_criticals` = `max(0, confirmed_unacknowledged_criticals - class_acknowledged)` = `max(0, {{confirmed_unacknowledged_criticals}} - {{class_acknowledged_count}})` = **{{effective_confirmed_unacknowledged_criticals}}**.

The CLI predicate evaluator (`bin/essense-flow-tools.cjs:2227-2245`) computes effective; master writes both raw fields.

{{gate_decision}}

## Class acknowledgments applied

{{class_acknowledged_summary}}

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
