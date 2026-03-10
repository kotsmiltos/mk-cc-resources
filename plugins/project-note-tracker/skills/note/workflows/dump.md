<process>

<step_1_confirm>
This is destructive. Ask the user to confirm:
"This will delete the entire `project-notes/` directory including tracker.xlsx and all research files. Are you sure?"

Do NOT proceed without explicit confirmation.
</step_1_confirm>

<step_2_delete>
```bash
rm -rf project-notes
```
</step_2_delete>

<step_3_notify>
Tell the user: "Removed `project-notes/` — all tracker data, handler directories, and research files have been deleted."
</step_3_notify>

</process>

<success_criteria>
Dump is complete when:
- [ ] User explicitly confirmed the deletion
- [ ] `project-notes/` directory is fully removed
- [ ] User is informed
</success_criteria>
