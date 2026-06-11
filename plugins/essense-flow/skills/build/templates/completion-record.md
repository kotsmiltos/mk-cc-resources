# GENERATED from references/schemas/completion-record.schema.yaml — edit the schema, then: npm run render-schemas
schema_version: 1
task_id: {{task_id}}
sprint: {{sprint}}
agent_claim:
  status: {{agent_status}}
  summary: "{{agent_summary}}"
  files_modified: {{agent_files_modified}}
  criteria: {{agent_criteria}}
  notes: |
    {{agent_notes}}
runner_verification:
  files_validated: {{runner_files_validated}}
  per_criterion_verdicts: {{runner_per_criterion_verdicts}}
  drift:
    files: {{runner_drift_files}}
    criteria: {{runner_drift_criteria}}
verified: {{verified}}
task_started_at: {{task_started_at}}
task_completed_at: {{task_completed_at}}
synthetic: {{synthetic}}
out_of_contract_writes: {{out_of_contract_writes}}
