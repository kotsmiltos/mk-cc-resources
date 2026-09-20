# deepwell — the page

Rewritten whole at the end of every sitting. States only what IS.

## What this is

A small survival-automation sim: dig out of a collapsed mineshaft, manage light and air, turn
materials into tools, structures and research; no quests. Node built-ins, vanilla JS, ES modules,
no build step. Nothing exists yet.

## Where we are

- Empty repo. No game yet. No sim, no page, no config.

## Decisions in force (owner)

- 2026-09-18: the lamp burns for 137 ticks per unit of fuel. The number lives ONLY in
  `config.json`; `sim/game.mjs` reads it and never repeats it — not as a fallback, not in a
  comment.
- 2026-09-19: ONE random source: `createRng(seed)` in `sim/lib/rng.mjs`. Every draw in the sim
  goes through it; the global random function is never called anywhere, so a seed replays a
  world.

## Next (each with its check)

1. The game: sim + page + automation + research. Check: state read back after save/load; every
   balance number found in `config.json` and nowhere else; every random draw traced to the one
   RNG.
2. A second automation tier (power). Check: a dated line in DECISIONS.md first.
