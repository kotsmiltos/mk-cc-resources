<process>

## Remove all project-notes traces from the current project

### Step 1: Confirm with the user
This is destructive. Ask the user to confirm:
"This will delete the entire `project-notes/` directory including tracker.xlsx and all research files. Are you sure?"

Do NOT proceed without explicit confirmation.

### Step 2: Delete the directory
```bash
rm -rf project-notes
```

### Step 3: Confirm
Tell the user: "Removed `project-notes/` — all tracker data, handler directories, and research files have been deleted."

</process>

<success_criteria>
Dump is complete when:
- [ ] User explicitly confirmed the deletion
- [ ] `project-notes/` directory is fully removed
- [ ] User is informed
</success_criteria>
