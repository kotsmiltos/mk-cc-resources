<process>

## Initialize project-notes

### Step 1: Check if already initialized
Look for `project-notes/tracker.xlsx` in the project root. If it exists, tell the user and offer to add new handlers instead.

### Step 2: Ask the user for handlers
Ask: "What handlers/departments/teams do you want to track? (e.g. Operations, IT, Compliance)"

Wait for the user's response. Parse the handler names.

### Step 3: Ask for project context (optional)
Ask: "Any project-wide context I should know? (e.g. 'Card processing automation for NBG') — or press Enter to skip"

### Step 4: Find tracker.py and run init
```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
uvx --with openpyxl python3 "$TRACKER_PY" init project-notes handler1 handler2 ...
```

**IMPORTANT:** `tracker.py init` already creates the handler directories (lowercased) with `research.md` templates inside them. Do NOT create handler directories or research.md files manually — that would produce duplicates.

### Step 5: Add to .gitignore if in a git repo
Check if the current directory is inside a git repository:
```bash
git rev-parse --show-toplevel 2>/dev/null
```

If it is, check whether `.gitignore` already contains `project-notes/`. If not, append it:
```bash
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$GIT_ROOT" ]; then
  GITIGNORE="$GIT_ROOT/.gitignore"
  if ! grep -qxF 'project-notes/' "$GITIGNORE" 2>/dev/null; then
    echo 'project-notes/' >> "$GITIGNORE"
  fi
fi
```

### Step 6: Create config.md if the user provided project context
Write the context to `project-notes/config.md`:
```markdown
## Project Context

<user's context here>

## Handlers

- handler1
- handler2
- ...
```

### Step 7: Remind the user
Tell the user to edit each handler's `research.md` file with instructions for how to research that handler's questions. Show the paths using the **lowercase** handler names (as created by tracker.py).

</process>

<success_criteria>
Initialization is complete when:
- [ ] `project-notes/tracker.xlsx` exists with headers
- [ ] Each handler has a lowercase directory with `research.md` (created by tracker.py — do not duplicate)
- [ ] `project-notes/` is in `.gitignore` (if in a git repo)
- [ ] User knows to fill in research.md files
</success_criteria>
