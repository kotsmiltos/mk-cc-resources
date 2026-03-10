---
name: note
description: Tracks questions per handler/department across a project. Auto-detects which handler should answer, researches from project context in the background, logs to an Excel tracker, and generates meeting agendas. Auto-gitignores itself. Use /note to ask a question, /note init to set up, /note agenda to prepare for meetings.
---

<objective>
A project-level question tracker. Log questions for different handlers (departments, teams, stakeholders), Claude gathers context from project files, and everything goes into an Excel tracker. Before meetings, generate an agenda from open questions.
</objective>

<quick_start>
1. Run `/note init` to set up `project-notes/` with handlers
2. Run `/note <question>` to ask a question (handler auto-detected)
3. Run `/note agenda` before meetings to generate an agenda from open questions
</quick_start>

<rules>
1. All questions go to `project-notes/tracker.xlsx` — one file per project, never split
2. Each handler has a `research.md` in `project-notes/<handler>/research.md` — read it BEFORE researching
3. Research uses project files only — scan docs, code, scout indexes, configs in the current project
4. Research is context-gathering, NOT answering — the Internal Review documents what the codebase currently says about the topic (existing implementations, configs, relevant code paths). It does NOT try to answer the question. The question remains open for the handler to answer in a meeting.
5. Status reflects whether context was found — "Answered Internally" means the codebase has clear, relevant context about this topic (NOT that the question is answered). "Pending" means little or no relevant context was found in project files. "Decided" means a decision was made with rationale. "Completed" means confirmed by the handler.
6. Background execution — research questions using the Agent tool with `run_in_background: true` so the user can keep working
7. Excel I/O uses tracker.py — never edit the xlsx directly; always use the script via `uvx --with openpyxl`
8. Find tracker.py by running: `find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1`
9. Internal Review column documents existing state — include source file paths, line numbers, relevant quotes, current behavior. Frame as "here's what exists" not "here's the answer"
10. Handler Answer column stays empty — the user fills this after meetings
11. Dates are automatic — tracker.py adds them
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
| Default (question) | Auto-detect handler, research, and log question | workflows/research-question.md |

</routing>

<help>

When the user runs `/note` or `/note help`, print this:

```
Project Note Tracker v1.6.0 — available commands:

  /note <question>                          Ask a question (handler auto-detected)
  /note <handler> <question>                Ask with explicit handler
  /note init                                Set up project-notes/ with handlers
  /note add <handler>                       Add a new handler
  /note agenda [handler]                    Generate meeting agenda (all or filtered)
  /note quick <question>                     Log question without research (Pending)
  /note meeting                              Start interactive meeting capture
  /note resolve <handler> "question" answer Mark question as completed
  /note decide <handler> "question" decision Mark question as decided with rationale
  /note dump                                Remove all project-notes from project
  /note review [row]                         Re-review questions with fresh context
  /note doctor                              Upgrade tracker.xlsx to latest formatting
  /note help                                Show this help

Status values in tracker.xlsx:
  Answered Internally  — relevant context found in codebase (question still open)
  Pending              — little or no context found (needs discussion)
  Completed            — confirmed by handler after meeting
  Decided              — decision made with rationale recorded
```

</help>

<scripts_index>

| Script | Purpose | Invocation |
|---|---|---|
| scripts/tracker.py | Excel I/O for tracker.xlsx | `uvx --with openpyxl python3 <path> <command> <args>` |

Finding the script:

```bash
TRACKER_PY=$(find ~/.claude/plugins -path "*/project-note-tracker/scripts/tracker.py" -type f 2>/dev/null | head -1)
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

</scripts_index>

<success_criteria>
The note skill succeeds when:
- Questions are logged to `project-notes/tracker.xlsx` with correct handler, status, and internal review
- Background research gathers context without trying to answer the question
- Meeting agendas accurately reflect open questions grouped and prioritized by handler
- All Excel I/O goes through tracker.py, never direct file editing
</success_criteria>
