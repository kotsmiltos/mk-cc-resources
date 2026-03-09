---
name: note
description: Track questions per handler/department. Auto-detects which handler should answer, researches from project context in the background, logs to an Excel tracker, generates meeting agendas. Auto-gitignores itself. Use /note to ask a question, /note init to set up, /note agenda to prepare for meetings.
---

<essential_principles>

## Purpose

A project-level question tracker. You log questions for different handlers (departments, teams, stakeholders), Claude researches answers from project files, and everything goes into an Excel tracker. Before meetings, generate an agenda from unanswered questions.

### Core Rules

1. **All questions go to `project-notes/tracker.xlsx`** — one file per project, never split
2. **Each handler has a `research.md`** in `project-notes/<handler>/research.md` — read it BEFORE researching
3. **Research uses project files only** — scan docs, code, scout indexes, configs in the current project
4. **Status is honest** — "Answered Internally" only when evidence is strong; "Pending" when uncertain
5. **Background execution** — research questions using the Agent tool with `run_in_background: true` so the user can keep working
6. **Excel I/O uses tracker.py** — never edit the xlsx directly; always use the script via `uvx --with openpyxl`
7. **Find tracker.py** by running: `find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1`
8. **Internal Review column is detailed** — include source file paths, line numbers, relevant quotes
9. **Handler Answer column stays empty** — the user fills this after meetings
10. **Dates are automatic** — tracker.py adds them

</essential_principles>

<intake>

Parse the user's input after `/note`. The first word determines the subcommand:

| First word | Route to | Example |
|---|---|---|
| `init` | workflows/init.md | `/note init` |
| `add` | workflows/add-handler.md | `/note add Risk` |
| `agenda` | workflows/agenda.md | `/note agenda` or `/note agenda operations` |
| `resolve` | workflows/resolve.md | `/note resolve operations "reversal timeout" The answer is 24h` |
| `dump` | workflows/dump.md | `/note dump` |
| anything else | workflows/research-question.md | `/note What is the reversal timeout?` |

For the default case (research-question), the **entire input is the question**. The handler is auto-detected by matching the question against each handler's `research.md` focus areas. If the first word matches an existing handler directory name (case-insensitive), it MAY be an explicit handler override — but only treat it as such if it matches a known handler AND is followed by more text.

</intake>

<routing>

| Signal | Workflow | File |
|---|---|---|
| Input starts with "init" | Initialize project-notes | workflows/init.md |
| Input starts with "add" | Add a new handler | workflows/add-handler.md |
| Input starts with "agenda" | Generate meeting agenda (optionally filtered by handler) | workflows/agenda.md |
| Input starts with "resolve" | Mark question as resolved | workflows/resolve.md |
| Input starts with "dump" | Remove all project-notes from the project | workflows/dump.md |
| Default (question) | Auto-detect handler, research, and log question | workflows/research-question.md |

</routing>

<scripts_index>

| Script | Purpose | Invocation |
|---|---|---|
| scripts/tracker.py | Excel I/O for tracker.xlsx | `uvx --with openpyxl python3 <path> <command> <args>` |

### Finding the script

```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
```

Then invoke with:
```bash
uvx --with openpyxl python3 "$TRACKER_PY" <command> <args>
```

### Script commands

| Command | Usage |
|---|---|
| `init <dir> [handler ...]` | Create tracker.xlsx and handler directories |
| `add <dir> <handler> <question> <review> <status>` | Append a question row |
| `pending <dir> [--handler <name>]` | List pending questions as JSON |
| `resolve <dir> <row> <answer>` | Mark row as Completed with answer |
| `add-handler <dir> <handler>` | Create new handler directory |
| `list-handlers <dir>` | List all handler directories |

</scripts_index>
