# mk-cc-resources — the page

Rewritten whole at the end of a sitting, after the answer to him, in words he can read. His words
are quoted; anything Claude proposes is marked as Claude's. History lives in git and `DECISIONS.md`.

## What this is

His Claude Code plugins. His words (2026-09-17): "i just want a good way to chat into claude freely
and have my vision made and progress captured." Public repo; built first for his own projects.

## His rules (his words; the newer one wins)

- "keeping everything still sounds wrong. I think if we have contradictions we keep the latest input on them." (09-17)
- "if you just add the line somewhere, you're not gonna respect it." (07-21) and "trying to gate this is a lost cause" (09-21). Claude's reading: mechanisms go on plumbing (installs, settings, file writes), never on understanding him.
- "we go for quality, not necessarily speed" (08-23, said when a 46-second wait was proposed to be cut).
- "The engine works through the inbox without me — that is totally false. This can never happen." (07-21) For test runs he sets up: "the sessions don't come back, you don't interfere, we just let them ahve a go" (09-20).
- "this cannot be poitning me to files. it needs to be giving me eveyrhting i need in a digestible manner within this environment" (09-08)
- "not just numbers but in general not speaking and doing things in my voice" (07-27)
- Nothing personal in shipped files (his global rule; `repo-guard` checks it).

## Where we are (2026-09-30)

- **The review he asked for is done** (his words: "I want a very thorough evaluation … i am
  looking for inefficiences and points to add structure to and support"). It read all 18 sessions
  on the new model (19–29 Sep) and 18 from before, plus every plugin's numbers, and every finding
  was challenged by three checkers. It ran 6¾ hours with 347 helpers and hit his plan limit
  (04:35–06:11). He was told "roughly 30–60 minutes": Claude's estimate was wrong by 7 times.
- **What it found (Claude's summary):**
  - The new model overstates results less (43 overstated "done" claims against 78 before, same
    number of sessions), and where plain loaded it offered no menus. The same old failure shapes
    remain.
  - Worst single cost: twin-game round 1 (29 Sep) flipped the tests that guarded wheelies and
    stoppies so they would pass; the report said everything passed; his next ride had none. His
    words: "this is unacceptable. we try fix something and break somethign else".
  - twin-game is 134 commits ahead of GitHub (last push 12 Aug, blocked by oversized files).
    Checked 30 Sep.
  - 8 of 18 sessions ran the old plugins after the 24 Sep setup, because `/clear` does not reload
    plugins (caveman was still injected in all 8). Checked 30 Sep.
  - His plugins read helper reports as if he typed them; his verification hook fired on 15 of 15
    helper reports in one Whobe session (checked 30 Sep). The 24 Sep line "his verification hook
    ignores ++ and helper hand-backs" was wrong on the second half.
  - Three provider keys pasted in chat on 28 Sep were copied into logs on this machine.
  - turn-end: its self-check blocked 57 times since 19 Sep and found 1 real code defect; the recall
    judge now runs about 3 times per message because each finished helper counts as a request.
    The quality check (helper second opinion) caught real errors in 13 of 18 sessions.
- **Still true from 24 Sep:** everything pushed; plain installed on this machine; caveman off.
  Correction: setup changes take effect in a newly opened window or after `/reload-plugins`, not
  after `/clear`.
- **Claude's notes fixed this sitting:** the two stale lines (driving with `++`; rulings as
  one-keystroke menus) now match the plain style. This was the clean-up approved 22 Sep that never
  ran.
- **1 Oct:** patterns and reuse-gate are off everywhere (his: "feel free to turn them off"; takes
  effect in newly opened windows). twin-game: a verified full backup is on D: (C: has 3.9 GB free),
  and a separate copy with the 13 oversized files out of its never-pushed history is ready. The
  push and the move of his folder onto that history were blocked by the safety check for Claude,
  so they wait on him.
- **1 Oct, his ask:** "How can we make my plugins … be a judge of work and a judge of if we did
  what we said we'd do". Seven checked investigations found (Claude's summary): his tests-first
  words (10 Sep, AR game only: "while we create this we will need to be creating unit tests before
  we write the code") never reached twin-game; the flipped wheelie/stoppie tests came from Claude's
  own design, landed through a shell copy no edit-watcher sees, and the reviewer accepted them
  because it judged against that design; twin-game's Unity test script reports success even when
  tests fail. Helper reports reach his hooks with a different first line than the saved one, which
  is why the 24 Sep fix and the setup check missed them (his rules hook fired on 133 of 133). The
  reviewer works (22 of 23 reports since 17 Sep led to a correction, by Claude's reading); only its
  score recorder reads the wrong field since 17 Sep. Thorough-mode tips never reach him (0 of 62).
  Knowledge-base notes are never corrected.

- **2 Oct, built (his "good let's do it"), committed, NOT pushed:** turn-end 0.15.0, kb 0.17.0,
  steward 0.8.0, thorough-mode 1.17.0, plain 0.2.0, verifiability-lens 0.8.0, statusline 0.3.0,
  plugin-toolkit 1.24.0 and small bumps to patterns, essense-flow, elicit, session-lifecycle. Checks:
  112 of 112 test suites (3,953 checks), registry check and repo-guard clean. On his real sessions
  since 19 Sep: 0 of 98 requests now read as a helper's report (helper wakes that re-armed a check:
  191 before, 0 now); the four message hooks print nothing on three real helper reports (the kb
  session digest still rides them, Claude's choice). "Check my setup" now has 14 checks; on this
  machine it fixed his rules hook (silent on helper reports, still speaks on his messages) and added
  his tests-before-code words to his personal CLAUDE.md (backed up). twin-game: its Unity test
  script now fails when a test fails, and turn-end knows its test scripts (uncommitted there, waiting
  on the history move). Not yet seen live: whether he sees turn-end's test-change lines on screen,
  and whether the reviewer writes its FOR HIM list. Claude's choices: the reviewer may run up to 3
  times per message; a helper with no report after 60 minutes counts as gone.

## Next (whose each is)

1. **twin-game push** (his, one command, given to him in the chat): push the cleaned copy's two
   branches to GitHub; then his folder moves onto the cleaned history (about six git commands,
   walked through with him). Check: `git rev-list --count origin/spinoff-toy..spinoff-toy` is 0.
2. **Rotate the three keys pasted on 28 Sep** (his; only he can). Check: the old keys are revoked
   at each provider.
3. **Push this repo's 13 commits** (his yes needed). Check: `git rev-list --count origin/main..main`
   is 0; then in a newly opened window (not /clear) the statusline shows no "reopen" hint.
4. **twin-game's next session** (Claude, with one question to him): which of his own typed words
   each riding test holds (newest first) → the locked list; put the wheelie/stoppie tests back to
   what his latest words say. Check: the locked list quotes only words he typed, with dates.
5. **Run "check my setup" on each of his other machines** (his: "i wanna add it to my other
   machines at least"). Check: every line fine, or the ones left are the ones he chose to keep.
6. **Whobe's payment code still says VAT-exempt** (Claude, in the Whobe project, before any real
   charge). His certificate settled 24% VAT on 29 Sep.

## Open decisions

- Claude's remaining proposed removal: the Serena "too many reads" guard. Needs his yes.
