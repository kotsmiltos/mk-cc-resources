---
schema_version: 1
items_total: {{items_total}}
implemented: {{implemented}}
partial: {{partial}}
missing: {{missing}}
drift: {{drift}}
completion_status: {{completion_status}}
confirmed_gaps: {{confirmed_gaps}}
---

# Verification report

## Deterministic gate

`confirmed_gaps` = **{{confirmed_gaps}}** (missing + drift).

{{gate_decision}}

## Per-item verdicts

{{per_item_table}}

## Drift detail

{{drift_detail}}

## Missing detail

{{missing_detail}}

## Recommended routing

{{recommended_routing}}
