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

## Where we are (2026-09-24)

- **Pushed.** Everything is on GitHub; every machine picks it up at its next session start (the
  marketplace updates itself). Before the push the Co-Authored-By lines came out of the 31 older
  commits and a machine path out of four old page versions. Check:
  `git rev-list --count origin/main..main` is 0.
- **What that changed for him:** gone — steward's nightly clean-up that deleted notes without
  asking; turn-end's page check on in every project (now only where a project turns it on);
  thorough-mode's keystroke stop on pasted plans (never installed). New — `plain`: his tested reply
  style (before big or costly work, the first line says how his words were read and what it costs;
  one plain question, never a menu), on wherever the plugin is on, plus "check my setup".
- **This machine is set up** (the setup check, all eight fine, 09-24): `plain` installed and on;
  thorough-mode, steward, kb, turn-end and plugin-toolkit updated; caveman off; no Co-Authored-By
  line on commits; the generalize-first hook no longer runs on his messages (its file is kept);
  his verification hook ignores `++` and helper hand-backs; his personal CLAUDE.md no longer offers
  `++` and says "build it generically" is for code; the rejected "six classes" note is deleted.
  Every changed file is backed up under `~/.claude/backups/plain-check-setup/`. It takes effect in
  the next session.
- **In this folder:** on — thorough-mode, prism, plugin-toolkit, statusline, alert-sounds, plain,
  turn-end (which does nothing here: every duty is off, the page check too since 09-24). Off —
  kb, steward, verifiability-lens, patterns, reuse-gate, essense-flow, essense-autopilot; caveman
  and session-lifecycle are off everywhere; elicit is installed nowhere. The plain style replaces
  this folder's Concise setting (tested when loaded from this folder; the installed copy shows
  in the next session).
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
  - Spent on tests so far: about $220. The with/without runner runs only when he asks, after
    being told how many sessions and what it costs (a full run: 30 sessions, about $167).
- **Checks at the end of this sitting:** the repo's test sweep 39/39 suites (2411 checks);
  registry check consistent; repo-guard clean on the rewritten history; the setup check 8 of 8
  on this machine.

## Next (whose each is)

1. **See the new way of talking in his next session here** (his). Check: before any big or costly
   work, the reply's first line says how his words were read and what it costs; "check my setup"
   ends with the line saying the plain style is loaded.
2. **Run "check my setup" on each of his other machines** (his: "i wanna add it to my other
   machines at least"). Check: every line fine, or the ones left are the ones he chose to keep.
3. **"which is worth keeping and which not"** (his ask, 09-20). Claude gave a provisional answer on
   09-23 from real use. Check: repeat the same read after some sittings on the pushed versions and
   tell him the result in plain words; no new test runs unless he asks for one.

Nothing else is queued. essense-flow stays parked (Claude's proposal): every test build was done by
one agent without it, and its one full run took 2h40m and produced no app.

## Open decisions

None.
