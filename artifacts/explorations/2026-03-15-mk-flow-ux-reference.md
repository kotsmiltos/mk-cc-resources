# mk-flow — UX Reference (What The User Sees)

> This document is the build target. Every interaction below is what mk-flow should produce when complete. Use as acceptance criteria during development.

---

## Project Setup

```
/mk-flow init

"Setting up mk-flow for this project.

Architecture engagement — how involved do you want to be
in architecture decisions?

  ○ High — walk me through decisions with tradeoffs before building
  ○ Medium — flag decisions briefly, quick confirm
  ○ Low — decide silently, document in reports

Which intents for this project?

  [x] action          — build/fix/implement requests
  [x] question        — explanations without state change
  [x] context_addition — requirements, forward notes, amendments
  [x] thought_capture  — mid-conversation ideas
  [x] frustration      — repeated complaint escalation
  [x] status           — 'where am I?' queries
  [ ] bug_report       — route bugs to note-tracker (used in: Auto-chessed, BinanceRepo)
  [ ] trade_setup      — trading scenarios (used in: BinanceRepo)

  Select which to enable, or describe a new one."
```

---

## Session Start — Instant Context

```
You: "hey"
Claude: "Auto-chessed — last worked 2 days ago.
  You finished Inventory UI milestones 1-3.
  Next up: Battle Status Indicators (3 milestones).
  2 open amendments: stat breakdown needs armor %,
  highlight cleanup (flagged 4x).
  Ready to continue or something else?"
```

No re-reading files. No "where was I." Five seconds to productive work.

---

## Dense Multi-Issue Input — Assumption Table

```
You: "ok so the highlights are STILL broken, also the pieces
  keep rotating during battle which is annoying, i want the
  roster tab to let me drag pieces onto the board, the mini
  board needs grid lines, and when i place pieces in the
  roster they should stay that way for the next fight unless
  i'm in a battle then just save it for later"
```

```
Claude: "Got it. Here's what I understood:

  | # | Type    | Item                         | Where          | Assumption                         |
  |---|---------|------------------------------|----------------|-------------------------------------|
  | 1 | Bug     | Highlights still broken      | Board view     | 5th mention — P0                   |
  | 2 | Bug     | Pieces rotate during battle  | Battle phase   | Should only rotate on placement    |
  | 3 | Feature | Drag pieces from roster tab  | Roster/Inv tab | Drag-and-drop onto mini board      |
  | 4 | UI gap  | Mini board missing grid lines| Roster tab     | Should match main board style      |
  | 5 | Feature | Persist roster placement     | Cross-encounter| Save layout for future encounters  |
  | 6 | Rule    | Battle vs non-battle context | State logic    | In battle: save only. Not in battle: apply now |

  Correct anything that's wrong, or 'looks good' to proceed."

You: "2 is wrong — rotation should happen on placement but
  not keep going after. rest is good"

Claude: "Updated. Routing:
  - #1, #2 → note-tracker as bugs (1 is P0)
  - #3, #5 → new milestones for current plan
  - #4 → amendment to completed Inventory UI work
  - #6 → locked constraint for implementation

  Bugs tracked. Starting on #3 or addressing P0 highlight
  bug first?"
```

---

## Questions Mid-Build — No State Change

```
You: "wait what's a MaterialPropertyBlock"
Claude: *explains MaterialPropertyBlock in Unity — efficient
  per-instance material properties without instantiation.
  Doesn't change what it's building. Doesn't lose context.
  Continues where it left off after.*
You: "cool, keep going"
Claude: *resumes exact same milestone, same file, same line*
```

---

## Mid-Conversation Thought Capture

```
You: "oh the health bars should probably pulse red when HP
  is under 20%"
Claude: "Noted — captured as forward-note for Battle Status
  Indicators plan. I'll load it when we start that work."
*continues current task without interruption*
```

---

## Frustration Detection — Ask First, Then Scope

```
You: "the highlights thing AGAIN, this is the 5th time"
Claude: "You've flagged highlights 5 times now. Let me
  understand exactly what's wrong so we can scope this
  properly and actually fix it.

  What specifically is broken — is it that highlights
  don't appear, appear in the wrong place, wrong color,
  or don't clear when they should?"
You: "they don't clear after battle ends and they show
  on the wrong cells during piece selection"
Claude: "Two distinct bugs:
  1. Highlight cleanup not triggered on battle end state
  2. Selection highlight targeting wrong cell coordinates

  Both scoped as P0. Adding to note-tracker with these
  specifics. Want me to fix these before continuing
  current work?"
```

---

## Resume After Days Away

```
You: "what's going on here"
Claude: "Auto-chessed — last session was March 12.

  Done since last time:
  - ✅ Inventory mini board with grid lines
  - ✅ Roster drag-to-place (2-click model)

  Still open:
  - 🔴 Highlight bugs (P0, scoped: wrong cells + no cleanup)
  - 🟡 Stat breakdown needs armor % (amendment)

  Next planned:
  - Battle Status Indicators (3 milestones)

  Pick up where you left off, address the P0 first,
  or something else?"
```

---

## New Project With miltiaze Handoff

```
You: "i wanna build a chess puzzle generator"
Claude: *miltiaze activates — explores the idea across
  dimensions, researches, produces an exploration report
  with structured Build Plans*

You: "let's build it"
Claude: "/mk-flow init —

  Architecture engagement?
  ○ High  ○ Medium  ○ Low

  Which intents for this project?
  [x] action, question, context_addition, thought_capture,
      frustration, status
  [ ] bug_report (used in: Auto-chessed, BinanceRepo)
  [ ] trade_setup (used in: BinanceRepo)

  Add any or go with defaults?"

You: "high engagement, defaults plus bug_report"

Claude: "Done. STATE.md created. Loading miltiaze's build
  plans into ladder-build...

  Plan 1: Puzzle Engine (4 milestones)
  Plan 2: UI Layer (3 milestones)
  Plan 3: Difficulty Scaling (2 milestones)

  Starting Plan 1, Milestone 1. Architecture engagement
  is high — let me walk you through the engine design.

  Two approaches for puzzle generation:
  1. Backward generation — start from checkmate, work
     backward to valid position. Guarantees solvable.
  2. Forward filtering — generate random positions,
     validate with engine. Simpler but slower.

  I'd lean toward 1 for quality. What do you think?"
```

---

## Adding/Modifying Intents

```
You: "add an intent for when I'm describing how a chess
  puzzle should work — like the rules and logic"

Claude: "New intent:
  Name: puzzle_logic
  Description: User describing puzzle rules, win conditions,
    piece behavior, or game logic
  Signals: 'the puzzle should', 'pieces can', 'win when',
    'valid move', 'rule is'
  Route: capture to context/puzzle-rules.md

  Look right?"

You: "yeah, and add 'checkmate' and 'stalemate' to the signals"
Claude: "Done. Saved to project + global library."
```

---

## Classifier Correction

```
You: "I can't move pieces from the inventory roster"
Claude: *classified as feature* "New feature request..."
You: "no, that's a bug — it's supposed to work already"
Claude:
  1. Reclassifies → bug, routes to note-tracker
  2. Records correction in intents.yaml
  3. Similar phrases classified correctly next time
```

---

## Context Handoff — Fresh Start With Zero Loss

```
*Milestone 3 just completed, context is getting heavy*

Claude: "Milestone 3 complete — intent classifier hook is
  working. Context is getting heavy. I recommend starting
  fresh to keep quality up.

  Copy and paste this to continue:

  /ladder-build continue mk-flow — just finished Milestone 3
  (intent classifier hook with Haiku, extensible intents.yaml,
  project init script). Next: Milestone 4 (State skill —
  STATE.md management, status/pause/resume workflows).
  Read BUILD-PLAN.md at artifacts/builds/mk-flow/ and
  milestone reports 1-3 for full context.

  STATE.md and BUILD-PLAN.md are up to date."
```

Also works when you say "pause":
```
You: "pause"
Claude: "Session paused. .continue-here.md written.

  To resume later, paste:

  /ladder-build continue mk-flow — paused mid-Milestone 4
  (State skill). STATUS workflow done, PAUSE workflow in
  progress. Read .continue-here.md at context/ for exact
  resumption point."
```

---

## Decision Override — Surfacing Original Reasoning

```
You: "forget the 2-click model, let's do drag-and-drop
  for the inventory"
Claude: "That was a locked decision from the Inventory UI plan:

  Decision: 2-click swap model
  Reasoning: OnGUI drag across different scroll views
    is unreliable — drops fail silently
  Date: 2026-03-12

  The original concern was OnGUI limitations. If you've
  moved to a different UI system or found a workaround,
  drag-and-drop makes sense. Otherwise the same issue
  will come back.

  Override the decision, or keep 2-click?"
You: "override, we're switching to UI Elements anyway"
Claude: "Decision overridden. Amendment A2 created:
  '2-click → drag-and-drop (UI Elements migration)'.
  Marked NEEDS_AMENDMENT on Inventory UI plan."
```

---

## Mid-Process Switching — Seamless

```
*You're in a miltiaze exploration about battle animations*

You: "oh btw the highlight bug is back, cells stay lit
  after deselecting"
Claude: "Captured:
  Bug: Highlight cells don't clear on deselect
  Target: Board view (completed work)
  Status: NEEDS_AMENDMENT (6th mention — P0)

  Added to note-tracker. Continuing exploration."

*miltiaze resumes exactly where it was — no context lost*
```

```
*You're mid-build on milestone 3 of Battle Indicators*

You: "actually I just realized — can we make the buff
  icons show the source? like which relic gave the buff?"
Claude: "That's a new requirement for this plan.

  | # | Type    | Item                    | Assumption                  |
  |---|---------|-------------------------|-----------------------------|
  | 1 | Feature | Buff icon shows source  | Tooltip on hover shows relic |

  Add to current milestone or capture as new milestone?"
You: "new milestone, finish this one first"
Claude: "Added as Milestone 4: Buff Source Attribution.
  Continuing Milestone 3."
```

---

## "Remember This" — Explicit Memory

```
You: "remember that Auto-chessed uses IMGUI not Canvas,
  so any UI work needs OnGUI patterns"
Claude: "Saved to project memory:
  Auto-chessed UI: IMGUI (OnGUI-based), not Canvas.
  All UI work must use OnGUI patterns."
```

```
You: "remember I prefer property-based test assertions,
  not exact values"
Claude: "Saved to user memory:
  Testing preference: property-based assertions
  (ranges, invariants) over exact value checks."
```

---

## "What Can I Do?" — Full Options

```
You: "what can I do?"
Claude: "mk-flow commands for Auto-chessed:

  Status & State:
  - 'where am I?' — current progress + open items
  - 'show amendments' — pending changes to completed work
  - 'show notes' — captured thoughts and forward-notes
  - 'pause' — save full context for later

  Configuration:
  - 'set architecture engagement to high/medium/low'
  - 'add intent for X' — new intent type
  - 'add X to Y intent' — modify signals
  - 'show tips again' — reset tooltip hints

  Active intents: action, question, context_addition,
    thought_capture, frustration, status, bug_report

  Just talk naturally — I'll route automatically."
```

---

## Tooltips — Contextual Help Throughout

Tooltips appear as single-line `💡` hints at relevant moments. They fade out after 3 appearances (tracked in config). Say "show tips again" to reset.

**First session after init:**
```
Claude: "Auto-chessed — mk-flow active.

  💡 You can talk naturally — I'll detect if you're asking
  a question, reporting a bug, or adding context. Say
  'what can I do?' anytime for options."
```

**After assumption table (first few times):**
```
  | # | Type | Item | ... |

  💡 Correct by number ("2 is wrong — it should be..."),
  say "looks good" to proceed, or "add" to include
  something I missed.
```

**After routing (first few times):**
```
  Routing: #1, #2 → note-tracker as bugs

  💡 Wrong classification? Say "no, 2 is a feature" and
  I'll reclassify and learn for next time.
```

**During build, after a quiet stretch:**
```
  💡 You can ask questions mid-build without losing your
  place. You can also drop thoughts ("oh and X should...")
  and I'll capture them.
```

**When amendments pile up (3+):**
```
  💡 You have 3 pending amendments to completed work.
  Say "show amendments" to review, or I'll surface them
  when current work is done.
```

**First time a thought is captured:**
```
  Noted — captured as forward-note for Battle Indicators.

  💡 I capture mid-conversation thoughts automatically.
  They'll load when that work starts. Say "show notes"
  to see what's been captured.
```

**First time frustration is detected:**
```
  💡 I track repeated issues. If something keeps coming
  up, I'll ask you to scope it so we can fix it properly.
```

**Architecture engagement reminder:**
```
  💡 Architecture engagement is 'high'. Change anytime:
  "set architecture engagement to low/medium".
```

**Tooltip rules:**
- One line with 💡, never a paragraph
- Fade after 3 shows (tracked in `.claude/mk-flow/config.yaml`)
- Only at the moment it's relevant, never dumped in a list
- "show tips again" resets all counters
- Never blocks the flow

---

## What You DON'T See

- No `/intake` or `/state status` commands to remember
- No mode switching ("I'm now in question mode")
- No 34 GSD commands
- No "which skill should I use for this?"
- No re-explaining context after closing the terminal
- No lost thoughts
- No bugs mentioned 5x without escalation
- No amendments to finished work silently ignored
- No questions derailing current task direction
