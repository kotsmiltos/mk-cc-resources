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

## Where we are (2026-10-08)

- **6 Oct, his words:** "I don't know if it's working. And I, I don't really understand how they
  work." Then: "I've lost track of what's built and how it works. And I, I feel kind of helpless."
  Claude first answered with mechanics and numbers, which was the wrong reading. The second answer
  told the story instead: every plugin sits under one part of his 17 Sep sentence (chat freely /
  vision made / progress captured), with the problem that caused each one. Claude's offer, not yet
  taken: go through turn-end step by step next.
- **8 Oct, his ask:** take the way twin-game was built on 7 Oct ("it seems to have been working
  well for me") and carry it to his other projects and machines, "like the check my setup thing".
  How twin-game used it (Claude's reading of that day's records): each window ended by writing the
  next one's starting note with his words in it, and he opened each new window with one line; his
  corrections were saved word for word; the ride's logic map had the same sections on every part.
  He had to step in five times that day before every rule was written down. A 26 Sep note ("model
  the cause, never the outcome") was already there and did not stop the session from splitting the
  logic by results; the map's layout by parts did.
- **8 Oct, built, pushed (his "sounds good") and installed on this machine: plain 0.3.0.** His
  logic-first words are now in his personal instructions here, right after tests-first (backed up
  first); "check my setup" reads that line as fine. It takes effect in a newly opened window.
  - The how-to "map the logic": wants in his words → the logic by component, written for Claude
    before any test or code → tests first → build. He is never asked to review the map, and each
    window ends with the next one's starting note.
  - "Check my setup" gets a fifteenth line, which puts his five 7 Oct messages, word for word, into
    his personal instructions after tests-first.
  - Checks: all 10 plain suites pass. Across the repo, 113 of 114 suites pass (4,038 checks); the
    one red, essense-flow, timed out on a file lock and passed alone. Registry check and repo-guard
    are clean.
- **Still true:** everything is pushed. Setup changes take effect in a newly opened window or after
  `/reload-plugins`, not after `/clear`.
- **Earlier (30 Sep – 2 Oct, Claude's summary):** the thorough review found that twin-game round 1
  flipped the wheelie/stoppie tests to pass, and that his hooks read helper reports as if he had
  typed them. The 2 Oct release fixed the hook side, and his tests-first words reached his personal
  instructions.

## Next (whose each is)

1. **See logic-first live** (Claude, in his next feature ask in any project, in a newly opened
   window). Check: his wants shown back in plain words, then a logic map by component, before any
   test or code; he is never asked to review the map.
2. **twin-game push** (his, one command, given to him in the chat on 1 Oct). Checked 8 Oct: his
   folder still knows no pushed copy of its branch. Check:
   `git rev-list --count origin/spinoff-toy..spinoff-toy` is 0.
3. **Rotate the three keys pasted on 28 Sep** (his; only he can). Check: the old keys are revoked
   at each provider.
4. **Run "check my setup" on each of his other machines** (his: "i wanna add it to my other
   machines at least"). Check: every line fine, or the ones left are the ones he chose to keep.
5. **twin-game's locked tests** (Claude, with one question to him): not rechecked 8 Oct. The
   7 Oct rebuild redid wheelies and stoppies by component. Check: the locked list quotes only words
   he typed, with dates.
6. **Whobe's payment code still says VAT-exempt** (Claude, in the Whobe project, before any real
   charge). His certificate settled 24% VAT on 29 Sep.

## Open decisions

- Claude's remaining proposed removal: the Serena "too many reads" guard. Needs his yes.
