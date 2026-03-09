# Project Note Tracker

Track questions per handler/department across projects. Claude researches answers from your project files, logs everything to an Excel tracker, and generates meeting agendas from unanswered questions.

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

You'll be asked for handler names (departments, teams, stakeholders) and optional project context. This creates:

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
/note operations What is the expected timeline for card reversal processing?
```

Claude researches **in the background** — you can keep working. When done, it appends a row to `tracker.xlsx`:

| Handler | Question | Internal Review | Handler Answer | Status |
|---|---|---|---|---|
| Operations | What is the expected timeline for card reversal processing? | Based on Card_Reversal_Process_Comparison.xlsx, domestic reversals have a 24h window. Code at src/config/timeouts.ts:23 shows REVERSAL_TIMEOUT_MS=30000. These conflict — docs say 24h but code has 30s timeout for the API call, not the full process. | | Pending |

### 4. Generate a meeting agenda

```
/note agenda
```

Produces a prioritized agenda grouped by handler, with "Pending" items (no answer) before "Answered Internally" items (need confirmation).

### 5. After the meeting — resolve questions

```
/note resolve operations "reversal timeline" Domestic: 24h, International: 48h. The 30s is the API timeout, not the process window.
```

Updates the row's Handler Answer and sets status to **Completed**.

### 6. Add new handlers anytime

```
/note add Risk
```

## Commands

| Command | What it does |
|---|---|
| `/note init` | Create project-notes directory, tracker.xlsx, handler folders |
| `/note <handler> <question>` | Research question in background, append to Excel |
| `/note add <handler>` | Add a new handler with research.md template |
| `/note agenda` | Generate meeting agenda from pending questions |
| `/note resolve <handler> "<question>" <answer>` | Mark question as completed with the confirmed answer |

## Excel Columns

| Column | Who fills it | When |
|---|---|---|
| **Handler** | Auto | When question is logged |
| **Question** | You (via `/note`) | When question is logged |
| **Internal Review** | Claude | During background research |
| **Handler Answer** | You (via `/note resolve` or manually) | After meeting/call |
| **Status** | Auto / You | Auto-set on log, updated on resolve |
| **Date Added** | Auto | When question is logged |

## Status Values

| Status | Meaning |
|---|---|
| **Answered Internally** | Claude found strong evidence in project files |
| **Pending** | Partial or no evidence — needs to be asked |
| **Completed** | Confirmed by the handler |

## Tips

- **Be specific in research.md** — the more you tell Claude about where to look and what terminology to use, the better the Internal Review will be
- **Use scout indexes** — if you've indexed Excel/CSV files with Schema Scout, mention the `.scout-index.json` files in research.md so Claude can reference them
- **Batch questions** — run multiple `/note` commands back to back; they each research in the background
- **Review before meetings** — run `/note agenda` to get a clean list of what to ask
