# Project Note Tracker

Track questions per handler/department across projects. Claude auto-detects which handler should answer, researches from your project files, logs everything to an Excel tracker, and generates meeting agendas from unanswered questions.

## Install

```bash
claude plugin marketplace add https://github.com/kotsmiltos/mk-cc-resources  # if not already added
claude plugin install project-note-tracker
```

**Requires:** `uv` on PATH (used to run the Excel helper via `uvx --with openpyxl`)

## Quick Start

### 1. Initialize in your project

```
/note init
```

You'll be asked for handler names (departments, teams, stakeholders) and optional project context. If you're in a git repo, `project-notes/` is automatically added to `.gitignore`. This creates:

```
project-notes/
├── config.md              # project context
├── tracker.xlsx           # the Excel tracker
├── operations/
│   └── research.md        # research instructions for this handler
├── it/
│   └── research.md
└── compliance/
    └── research.md
```

### 2. Write research instructions

Edit each handler's `research.md` to tell Claude what to look for:

```markdown
## Research instructions for Operations questions

- Look in Technical-docs/ for process flows and comparisons
- Check .scout-index.json files for data schema context
- Search src/agents/ for automation logic
- Operations cares about: SLAs, timelines, manual vs automated steps, cutoff times
- Terminology: they say "reversal" not "refund", "cutoff" not "deadline"
- If you find Excel files, use scout to explore their schema
```

### 3. Ask a question

```
/note What is the expected timeline for card reversal processing?
```

Claude **auto-detects the handler** based on the question and each handler's research.md focus areas, then researches **in the background** — you can keep working. When done, it appends a row to `tracker.xlsx`:

| Handler | Question | Internal Review | Handler Answer | Status |
|---|---|---|---|---|
| Operations | What is the expected timeline for card reversal processing? | Based on Card_Reversal_Process_Comparison.xlsx, domestic reversals have a 24h window. Code at src/config/timeouts.ts:23 shows REVERSAL_TIMEOUT_MS=30000. These conflict — docs say 24h but code has 30s timeout for the API call, not the full process. | | Pending |

You can also specify the handler explicitly if you prefer:

```
/note operations What is the expected timeline for card reversal processing?
```

### 4. Generate a meeting agenda

```
/note agenda
```

Produces a prioritized agenda grouped by handler, with "Pending" items (no answer) before "Answered Internally" items (need confirmation).

Filter to a specific handler:

```
/note agenda operations
```

### 5. After the meeting — resolve questions

```
/note resolve operations "reversal timeline" Domestic: 24h, International: 48h. The 30s is the API timeout, not the process window.
```

Updates the row's Handler Answer and sets status to **Completed**.

### 6. Add new handlers anytime

```
/note add Risk
```

### 7. Remove all traces from a project

```
/note dump
```

Deletes the entire `project-notes/` directory (asks for confirmation first).

## Commands

| Command | What it does |
|---|---|
| `/note init` | Create project-notes directory, tracker.xlsx, handler folders |
| `/note <question>` | Auto-detect handler, research in background, append to Excel |
| `/note <handler> <question>` | Explicitly assign handler, research in background, append to Excel |
| `/note quick <question>` | Log question immediately without research (auto-detects handler, status: Pending) |
| `/note add <handler>` | Add a new handler with research.md template |
| `/note agenda [handler]` | Generate meeting agenda (all or filtered by handler) |
| `/note resolve <handler> "<question>" <answer>` | Mark question as completed with the confirmed answer |
| `/note dump` | Remove all project-notes from the current project |
| `/note review [row]` | Re-review questions with fresh context from current codebase |
| `/note doctor` | Upgrade tracker.xlsx to latest formatting (colors, dropdowns) |
| `/note help` | Show available commands |

## Excel Columns

| Column | Who fills it | When |
|---|---|---|
| **Handler** | Auto (detected or explicit) | When question is logged |
| **Question** | You (via `/note`) | When question is logged |
| **Internal Review** | Claude | During background research |
| **Handler Answer** | You (via `/note resolve` or manually) | After meeting/call |
| **Status** | Auto / You | Auto-set on log, updated on resolve |
| **Date Added** | Auto | When question is logged |

## Status Values

| Status | Meaning |
|---|---|
| **Answered Internally** | Relevant context found in codebase (question still open) |
| **Pending** | Little or no context found — needs discussion |
| **Completed** | Confirmed by the handler |

Status cells are **color-coded** (green/orange/blue) and have a **dropdown** for easy editing in Excel.

## Tips

- **Be specific in research.md** — the more you tell Claude about where to look and what terminology to use, the better the auto-detection and Internal Review will be
- **Use scout indexes** — if you've indexed Excel/CSV files with Schema Scout, mention the `.scout-index.json` files in research.md so Claude can reference them
- **Batch questions** — run multiple `/note` commands back to back; they each research in the background
- **Review before meetings** — run `/note agenda` to get a clean list of what to ask
- **Handler auto-detection** — works best when each handler's research.md clearly describes their focus areas and terminology
