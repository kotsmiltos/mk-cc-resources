# The librarian protocol

> **type:** reference
> **consumed_by:** every master skill (architect, build, research, triage, review, verify, elicit, heal) and every producer agent (sub-architect, task-agent, perspective-agent, sub-triager, sub-recognizer)

The model is a librarian. It hands over the best book it has — but it cannot
know which books it doesn't have. A librarian who invents a book rather than
saying "we don't carry that one, let me order it" is worse than useless: the
reader builds on a book that doesn't exist.

Applied to this pipeline: **what an agent cannot verify or decide, it must
research first; what research cannot answer, it must ask — never assume.**
The user is a first-class resource, not an interruption. Every silent
assumption is a fabricated book.

## The three duties

1. **Research first.** Before declaring anything unknown, exhaust what you
   CAN reach: read the source at the cited line, grep the repo, check
   current docs (Context7 / WebFetch where the agent has them). An unknown
   with an empty `research_attempted` is bounced back to its author.

2. **Declare unknowns structurally.** Every producer-agent return carries an
   `unknowns:` array — shape below, rendered from
   `references/schemas/unknown-entry.schema.yaml`. The empty array is
   REQUIRED: "no unknowns" is an explicit claim the master holds you to,
   not a silent default. Things that belong here:
   - runtime behavior you cannot execute (no Bash: linter rule sets, CLI
     output, exit codes, test results)
   - third-party library / version-dependent behavior you cannot pin by
     reading vendored source
   - decisions that are the user's to make (product intent, trade-offs the
     spec leaves genuinely open)
   - anything where your confidence comes from training data rather than
     from something you read in this repo or researched this session

3. **Surface at the gate.** Masters collect every return's `unknowns[]`,
   register the open ones (`register-add --kind unknown`, closure criterion
   = the question answered), and at the next user-facing moment put the
   batch to the user via `AskUserQuestion` — blocking unknowns before
   acting on the return, non-blocking ones at the phase gate. A ratified
   `suggested_default` is an answer: record it as `closure_evidence`.
   No unknown is dropped, merged away, or quietly defaulted.

## Unknown-entry shape

<!-- AUTOGEN:unknown-entry-shape START — rendered from references/schemas/unknown-entry.schema.yaml by scripts/render-schema-docs.cjs; edit the schema, then: npm run render-schemas -->
```yaml
id: U-1
what: Which markdownlint rule set the CI pipeline enforces
why_unresolvable: >-
  Runtime tool behavior; this agent has no Bash to execute the linter, and no
  .markdownlint.json exists in the repo to read
research_attempted: >-
  Read repo root + .github/ for linter config (absent); checked docs via
  Context7 for default ruleset (version-dependent, version unpinned)
blocking: false
suggested_question: >-
  Which markdownlint config should CI use — the default ruleset, or a pinned
  .markdownlint.json we add?
suggested_default: Assume default ruleset; emit a follow-up task to pin the config
```

Field rules:

- `id` (string; required, pattern `^U-[A-Za-z0-9_-]+$`) — unique within the return; master re-keys when registering
- `what` (string; required, non-empty) — the exact thing you could not verify or decide — specific, not a vibe
- `why_unresolvable` (string; required, non-empty) — why YOU cannot close it — missing tool access, source not on disk, decision belongs to the user, library behavior you cannot execute, version unpinned
- `research_attempted` (string; required, non-empty) — what you tried BEFORE declaring the unknown — research-first is the rule; an unknown with no research attempt will be bounced back
- `blocking` (bool; required) — true when your deliverable's correctness depends on the answer (master must resolve before acting on your return); false when a documented default lets work proceed
- `suggested_question` (string; required, non-empty) — the question the master should put to the user, ready to ask
- `suggested_default` (string; optional) — optional — what to proceed with if the user ratifies a default instead of answering; omit when no defensible default exists
<!-- AUTOGEN:unknown-entry-shape END -->

## How this interacts with other rules

- **Substrate-citation rule (task-spec-write):** prescribed pseudocode
  asserting behavior of a file that exists on disk must cite the line it
  read. Claims about libraries or new code are exempt from the citation —
  but if you cannot execute or read the thing you're claiming about, that
  claim is an unknown and belongs in the ledger, with the affected spec
  downgraded to `agency_level: guided` so the build agent verifies first.
- **Agency downgrade:** when a blocking unknown sits under a `prescribed`
  spec, the spec does not stay prescribed — downgrade to `guided` and let
  the build agent verify the unknown at execution time, where Bash exists.
- **Verdict classes are unknown channels too:** a validator's
  `needs_context`, a verifier's `manual`, a lens's `inconclusive` — these
  are unknowns by another name. Masters treat them with the same gate
  discipline: surfaced, never silently dropped.

## What this protocol is NOT

- Not a license to ask the user everything — research first, and bundle
  questions at gates instead of interrupting per item.
- Not a confidence threshold — there is no number to game. The test is
  concrete: did your claim come from something you read or ran THIS
  session? If not, it's an unknown.
- Not optional under deadline pressure — a wrong assumption costs more
  rounds than a question costs minutes. The pipeline's history proves it:
  one assumed linter rule set cost a full review cascade.
