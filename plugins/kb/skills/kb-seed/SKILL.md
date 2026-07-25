---
name: kb-seed
description: >
  Build a knowledge base for an EXISTING project by extraction — sweep its docs, README,
  ADRs, git history, and code structure; distill decisions, conventions, findings, and dead
  ends into .claude/kb/extracted/ (one dated, sourced markdown file per finding, each
  declaring its own kind via frontmatter). Use when a project has no .steward/ model or thin
  KB coverage and the owner wants "kb on this project", "seed the knowledge base", "extract
  what this project knows". Run once per project; re-runs top up, never overwrite.
---

# kb-seed — extract what an existing project already knows

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

<objective>
Turn a project's implicit knowledge — scattered across docs, commit messages, and code — into
explicit KB entries under `.claude/kb/extracted/`, so `kb_query` answers "why is X like this"
in a project that never kept a steward model.
</objective>

<context>
The kb engine is read-only and stays that way. **This skill writes a new store the engine
then indexes** (`kb-extracted` is a shipped source, already in the default config). It never
touches existing stores — not `.steward/`, not handoffs, nothing. Wrong extractions are cheap:
the store is regenerable, and every file cites where it came from.

Each extracted file declares itself via frontmatter (kind / caste / themes / when); the
`markdown-dir` source reads it, so one directory holds mixed kinds.
</context>

<instructions>

**1. Inventory the substrate — ALL of it, not just the top layer.**

Sweep EVERY row; each names what knowledge it tends to hold. A seed that stops at the
README extracts the project's advertisement, not its experience — the deep rows (full git
messages, ledgers, addenda) are where the reversals and dead ends live, and those die
first:

| substrate | look for | typical kind |
|---|---|---|
| README, CLAUDE.md, docs/, ADRs, design/ | stated decisions, architecture, constraints | semantic / procedural |
| `git log --oneline` (ALL of it) + FULL messages of feat/fix/refactor/merge commits | what changed and WHY, reversals, rejected paths | episodic |
| pipeline artifacts (`.pipeline/`, specs, reports, VISION addenda) | requirements, review findings, superseded designs | semantic / episodic |
| ledgers and logs (steward log, QA reports, sprint records) | outcomes, failures, gates | episodic |
| code structure (top-level dirs, configs, build files) | de-facto conventions no doc states | procedural |
| TODO/FIXME/HACK comments (grep) | known debt, open questions | episodic |

Read efficiently (indexes/headers first, bodies where a decision clearly lives) but read
DEEP: on a re-run, target the rows the previous pass thinned out — check `kb stat` per
source and existing entry dates to see where coverage stops. When the volume exceeds what
one context can sweep, dispatch read-only sub-agents per substrate row and synthesize.

**2. Distill candidate entries.** One finding = one entry. Target the knowledge that dies
first: decisions **with their why**, rejected approaches, constraints, conventions. Skip
what the code states plainly (existence is not knowledge) and anything an existing KB source
already covers — run `node "${CLAUDE_PLUGIN_ROOT}/bin/kb.js" query <topic>` to check before
writing a duplicate.

**3. Judge, write, then report — do not gate on pre-confirmation.** (Owner directive
2026-07-25: "it should be able to see on its own.") The seeder judges worth autonomously:
extract what meets the bar (decision-with-why, rejected approach, constraint, convention —
cited), skip what doesn't. After writing, SHOW the owner the list of what landed — title +
kind + one line + citation each — so they can prune after the fact. Wrong entries are cheap:
the store is regenerable and every file cites its source. Never seed invisibly (the report
is mandatory); just don't make the owner approve every row up front.

**4. Write.** One file per entry, into `.claude/kb/extracted/`:

- name: `<YYYYMMDD>-<slug>.md` (date = when the knowledge ORIGINATED if known, else today)
- shape:

```markdown
---
kind: semantic
caste: project
themes: [decision, auth]
when: 2025-11-03
---
# Chose OAuth over sessions

Extracted-from: docs/adr/0007-auth.md; commit a1b2c3d

<the finding, with its why — 3-15 lines. Verbatim quotes where the source is quotable.>
```

- `Extracted-from:` is mandatory. An extraction the owner cannot trace to a source is a
  rumour with a filename.

**5. Verify.** `node "${CLAUDE_PLUGIN_ROOT}/bin/kb.js" stat` — entry count rose by the number
written, `kb-extracted` source shows them. Then one probe query on a seeded topic; the new
entry should rank. Report both results to the owner.

**Re-runs top up:** never overwrite an existing extracted file; check `stat` + query for
coverage first, extract only what is missing.

</instructions>
