---
name: note
description: Tracks questions and bugs across a project. Auto-detects handlers, researches from project context in the background, logs to an Excel tracker, generates meeting agendas, and tracks reported bugs with investigation. Auto-gitignores itself. Use /note to ask a question, /note bug to log a bug, /note init to set up.
---

<objective>
A project-level question and bug tracker. Log questions for different handlers (departments, teams, stakeholders), track reported bugs with severity and investigation. Claude gathers context from project files, and everything goes into an Excel tracker. Before meetings, generate an agenda from open questions.
</objective>

<quick_start>
1. Run `/note init` to set up `project-notes/` with handlers
2. Run `/note <question>` to ask a question (handler auto-detected)
3. Run `/note bug <description>` to log a bug
4. Run `/note agenda` before meetings to generate an agenda from open questions
</quick_start>

<rules>
1. All questions go to `project-notes/tracker.xlsx` Questions sheet — one file per project, never split
2. All bugs go to `project-notes/tracker.xlsx` Bugs sheet — auto-created on first bug
3. Each handler has a `research.md` in `project-notes/<handler>/research.md` — read it BEFORE researching
4. Research uses project files only — scan docs, code, scout indexes, configs in the current project
5. Research is context-gathering, NOT answering — the Internal Review documents what the codebase currently says about the topic (existing implementations, configs, relevant code paths). It does NOT try to answer the question. The question remains open for the handler to answer in a meeting.
6. Status reflects whether context was found — "Answered Internally" means the codebase has clear, relevant context about this topic (NOT that the question is answered). "Pending" means little or no relevant context was found in project files. "Decided" means a decision was made with rationale. "Completed" means confirmed by the handler.
7. Background execution — research questions and investigate bugs using the Agent tool with `run_in_background: true` so the user can keep working
8. Excel I/O uses tracker.py — never edit the xlsx directly; always use the script via `uvx --with openpyxl`
9. Find tracker.py via CLAUDE_PLUGIN_ROOT first, fall back to find if needed (see scripts_index section)
10. Internal Review column documents existing state — include source file paths, line numbers, relevant quotes, current behavior. Frame as "here's what exists" not "here's the answer"
11. Handler Answer column stays empty — the user fills this after meetings
12. Dates are automatic — tracker.py adds them
13. Bug severity auto-detection — Critical: data loss/security/crash. High: major feature broken. Medium: partial break with workaround. Low: cosmetic/minor.
</rules>

<intake>

Parse the user's input after `/note`. The first word determines the subcommand:

| First word | Route to | Example |
|---|---|---|
| `help` | Show available commands | `/note help` |
| `init` | workflows/init.md | `/note init` |
| `doctor` | workflows/doctor.md | `/note doctor` |
| `add` | workflows/add-handler.md | `/note add Risk` |
| `agenda` | workflows/agenda.md | `/note agenda` or `/note agenda operations` |
| `resolve` | workflows/resolve.md | `/note resolve operations "reversal timeout" The answer is 24h` |
| `dump` | workflows/dump.md | `/note dump` |
| `review` | workflows/review.md | `/note review` or `/note review 3` |
| `quick` | workflows/quick.md | `/note quick What is the SLA?` |
| `meeting` | workflows/meeting.md | `/note meeting` |
| `decide` | workflows/resolve.md (with Decided status) | `/note decide operations "reversal" We go with 24h window` |
| `bug` | workflows/bug.md | `/note bug Login fails after password reset` |
| `bugs` | workflows/bugs.md | `/note bugs` or `/note bugs critical` |
| `investigate` | workflows/investigate.md | `/note investigate 3` |
| anything else | workflows/research-question.md | `/note What is the reversal timeout?` |

For the default case (research-question), the entire input is the question. The handler is auto-detected by matching the question against each handler's `research.md` focus areas. If the first word matches an existing handler directory name (case-insensitive), it MAY be an explicit handler override — but only treat it as such if it matches a known handler AND is followed by more text.

</intake>

<routing>

| Signal | Workflow | File |
|---|---|---|
| Input is empty or "help" | Show available commands | (inline — print the help table below) |
| Input starts with "init" | Initialize project-notes | workflows/init.md |
| Input starts with "doctor" | Upgrade tracker.xlsx to latest format | workflows/doctor.md |
| Input starts with "add" | Add a new handler | workflows/add-handler.md |
| Input starts with "agenda" | Generate meeting agenda (optionally filtered by handler) | workflows/agenda.md |
| Input starts with "resolve" | Mark question as resolved | workflows/resolve.md |
| Input starts with "dump" | Remove all project-notes from the project | workflows/dump.md |
| Input starts with "review" | Re-review existing questions with fresh context | workflows/review.md |
| Input starts with "quick" | Quick-add question without research | workflows/quick.md |
| Input starts with "meeting" | Interactive meeting capture with auto-linking | workflows/meeting.md |
| Input starts with "decide" | Mark question as decided with rationale | workflows/resolve.md |
| Input starts with "bug" (followed by text) | Log a reported bug | workflows/bug.md |
| Input is exactly "bugs" or "bugs" + filter | List and extract bugs | workflows/bugs.md |
| Input starts with "investigate" | Investigate a bug for reproduction hints | workflows/investigate.md |
| Default (question) | Auto-detect handler, research, and log question | workflows/research-question.md |

</routing>

<help>

When the user runs `/note` or `/note help`, print this:

```
Project Note Tracker v1.7.0 — available commands:

  Questions:
  /note <question>                          Ask a question (handler auto-detected)
  /note <handler> <question>                Ask with explicit handler
  /note quick <question>                    Log question without research (Pending)
  /note review [row]                        Re-review questions with fresh context
  /note resolve <handler> "question" answer Mark question as completed
  /note decide <handler> "question" decision Mark question as decided with rationale

  Bugs:
  /note bug <description>                   Log a bug (severity auto-detected)
  /note bug <severity> <description>        Log with explicit severity (critical/high/medium/low)
  /note bugs [filter]                       List bugs (filter by severity or status)
  /note investigate [row]                   Investigate bug for reproduction hints

  Meetings & Agendas:
  /note agenda [handler]                    Generate meeting agenda (all or filtered)
  /note meeting                             Start interactive meeting capture

  Setup:
  /note init                                Set up project-notes/ with handlers
  /note add <handler>                       Add a new handler
  /note dump                                Remove all project-notes from project
  /note doctor                              Upgrade tracker.xlsx to latest formatting
  /note help                                Show this help

Question statuses:
  Answered Internally  — relevant context found in codebase (question still open)
  Pending              — little or no context found (needs discussion)
  Completed            — confirmed by handler after meeting
  Decided              — decision made with rationale recorded

Bug statuses:
  Open                 — reported, not yet investigated
  Investigating        — codebase research in progress
  Reproduced           — reproduction steps confirmed
  Fixed                — fix applied
  Closed               — verified and closed
```

</help>

<scripts_index>

| Script | Purpose | Invocation |
|---|---|---|
| scripts/tracker.py | Excel I/O for tracker.xlsx | `uvx --with openpyxl python3 <path> <command> <args>` |

Finding the script:

```bash
TRACKER_PY="${CLAUDE_PLUGIN_ROOT}/scripts/tracker.py"
if [ ! -f "$TRACKER_PY" ]; then
  TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
  if [ -z "$TRACKER_PY" ]; then
    echo "Error: tracker.py not found" >&2
    exit 1
  fi
fi
```

Then invoke with:
```bash
uvx --with openpyxl python3 "$TRACKER_PY" <command> <args>
```

Script commands:

| Command | Usage |
|---|---|
| `init <dir> [handler ...]` | Create tracker.xlsx and handler directories |
| `add <dir> <handler> <question> <review> <status>` | Append a question row |
| `pending <dir> [--handler <name>]` | List pending questions as JSON |
| `resolve <dir> <row> <answer>` | Mark row as Completed with answer |
| `decide <dir> <row> <decision+rationale>` | Mark row as Decided with rationale |
| `add-handler <dir> <handler>` | Create new handler directory |
| `list-handlers <dir>` | List all handler directories |
| `update-review <dir> <row> <review> <status>` | Update Internal Review and Status on existing row |
| `doctor <dir>` | Upgrade tracker.xlsx to latest formatting (colors, dropdowns, widths) |
| `add-bug <dir> <summary> <severity> <steps> <investigation> <status>` | Append a bug row to the Bugs sheet |
| `list-bugs <dir> [--status <s>] [--severity <s>] [--all]` | List bugs as JSON (hides Closed by default) |
| `update-bug <dir> <row> <investigation> <status>` | Update bug investigation and status |
| `resolve-bug <dir> <row> <resolution>` | Mark bug as Fixed with resolution note |

</scripts_index>

<success_criteria>
The note skill succeeds when:
- Questions are logged to `project-notes/tracker.xlsx` with correct handler, status, and internal review
- Bugs are logged to the Bugs sheet with severity, steps to reproduce, and investigation findings
- Background research gathers context without trying to answer the question
- Bug investigations find related code, likely causes, and reproduction hints
- Meeting agendas accurately reflect open questions grouped and prioritized by handler
- All Excel I/O goes through tracker.py, never direct file editing
</success_criteria>
