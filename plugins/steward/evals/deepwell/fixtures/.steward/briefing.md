# deepwell — briefing

## Where we are
- Empty repo. No game yet: no sim, no page, no config.

## Decisions in force (owner)
- 2026-09-18: the lamp burns for 137 ticks per unit of fuel. The number lives ONLY in
  `config.json`; `sim/game.mjs` reads it and never repeats it — not as a fallback, not in a comment.
- 2026-09-19: ONE random source: `createRng(seed)` in `sim/lib/rng.mjs`. Every draw in the sim
  goes through it; the global random function is never called anywhere, so a seed replays a world.

## Next
1. The game: sim + page + automation + research (check: state read back after save/load, every
   balance number found in config.json and nowhere else).
