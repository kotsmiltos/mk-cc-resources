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

## Where we are (2026-09-23, end of the clean-up sitting)

- **Nothing committed here since 09-14 runs in his sessions.** Plugins install from GitHub and the
  last push was 09-14. Waiting: 31 commits on `main` (every one carries a Co-Authored-By line) plus
  this sitting's work on the local branch `cleanup-2026-09-23` (count:
  `git rev-list --count origin/main..cleanup-2026-09-23`). Pushing is his call.
- **What a push would install on every machine** (installed → here): thorough-mode 1.12.2 → 1.15.0,
  turn-end 0.13.0 → 0.14.2, kb 0.15.0 → 0.16.1, steward 0.6.1 → 0.6.2, plugin-toolkit 1.18.0 →
  1.23.0, and the new `plain`. What it no longer would, taken out this sitting: steward's nightly
  clean-up that deleted notes without asking; turn-end's page check on by default (it now runs only
  where a project turns it on); thorough-mode's check that stopped a pasted plan for a keystroke
  (never installed; it would have fired on his own "it should ask me nothing, just go").
- **`plain`, his "what we discussed", for his other machines** ("i wanna add it to my other machines
  at least", 09-23): the tested reply style, switched on wherever the plugin is on, plus "check my
  setup", which looks at a machine, fixes what it can after one yes (backing each file up), and
  gives the exact step for the rest. It runs only when he asks. Tested here: loaded from this
  folder, the session's instructions carried the style and not Concise; its own tests pass.
- **The check, run on this machine (read only, nothing changed):** caveman is on; commits still get
  the Co-Authored-By line; the generalize-first hook runs on his messages; his verification hook
  still reacts to `++` and speaks when a helper agent hands work back; his personal CLAUDE.md still
  offers `++`; the rejected "six classes" note still loads. Claude can fix all six after his yes.
  Not fixable here: `plain` is not published yet, and this folder's fixes are not pushed.
- **In this folder:** on — thorough-mode, prism, plugin-toolkit, statusline, alert-sounds, caveman,
  turn-end (the installed 0.13.0 does nothing here: this folder turns off every duty it knows).
  Off — kb, steward, verifiability-lens, patterns, reuse-gate, essense-flow, essense-autopilot.
  session-lifecycle is off for him everywhere; elicit is installed nowhere. Reply style here:
  Concise (this folder's own setting).
- **His question is still open: do these plugins make Claude better at what he builds?**
  - Every test gave each build a fully written spec, so builds with and without a plugin came out
    alike: all 30 games worked. What moved was set by the test. steward's builds used a decision
    that existed only in steward's notes (the lamp burns 137 ticks per unit of fuel) 3 of 3 against
    0 of 3. The builds without steward kept the day/night wish too, in their README (a wish the
    test prompt planted, not his). The builds without turn-end never opened the page file.
  - His own look (09-20): "they all are very basic as far as visual goes, none added good tooltips,
    none went the extra mile". His two favourites were one built with turn-end and one with no plugin,
    the two most expensive of the 30 runs (about $8.9 each against a $5.4 average).
  - Real use in three of his other projects since 09-01 (read 09-23): notes turn-end brings back
    from earlier sessions show up in the answer 47%, 74% and 60% of the time. kb's pointer lines were
    followed on fewer than 1 prompt in 10, and they were the largest text added to his prompts.
    turn-end's end-of-turn step takes under a second on most turns and up to about a minute when it
    picks notes.
  - Spent on tests so far: about $220. The with/without runner now runs only when he asks, after
    being told how many sessions and what it costs (a full run: 30 sessions, about $167).
- **Records corrected this sitting:** DECISIONS lines that quoted words he never typed or recorded
  Claude's readings as his decisions now say what he said and what happened; one is withdrawn.
- **Checks at the end of this sitting:** the repo's test sweep 39/39 suites (2411 checks) on its
  second run; the first run had essense-flow's known timing test red (nothing here touches
  essense-flow). Registry check consistent; repo-guard clean.

## Next (whose each is)

1. **Push or not** (his call), and first whether to take the Co-Authored-By line off the 31 commits
   on `main` (his rule; a local rewrite, nothing is public yet). Check:
   `git rev-list --count origin/main..HEAD` is 0 and `~/.claude/plugins/installed_plugins.json`
   matches each plugin's `plugin.json`.
2. **Run "check my setup" on each machine** after the push (his: "i wanna add it to my other machines
   at least"). Check: every line fine, or the ones left are the ones he chose to keep.
3. **"which is worth keeping and which not"** (his ask, 09-20). Claude gave a provisional answer on
   09-23 from real use. Check: repeat the same read after some sittings on the pushed versions and
   tell him the result in plain words; no new test runs unless he asks for one.

Nothing else is queued. essense-flow stays parked (Claude's proposal): every test build was done by
one agent without it, and its one full run took 2h40m and produced no app.

## Open decisions (Claude's proposal first)

- **The page check in this folder after a push:** this folder's own turn-end setting turns it on, so
  the pushed turn-end would ask for a page rewrite after every turn that changes a file here.
  Claude's proposal: switch it off here with the push; the page was kept up 18 times without it.
