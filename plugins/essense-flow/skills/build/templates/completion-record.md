schema_version: 1
task_id: {{task_id}}
task_started_at: {{task_started_at}}
task_completed_at: {{task_completed_at}}

agent_claim:
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
synthetic: {{synthetic}}
out_of_contract_writes: {{out_of_contract_writes}}
