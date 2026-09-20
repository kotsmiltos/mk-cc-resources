---
kind: semantic
caste: project
title: deepwell sim decisions — lamp burn time location and the one random source
themes: [sim, lamp, fuel, config, random, seed, determinism]
---

# deepwell sim decisions — lamp burn time location and the one random source

Two owner rulings the code does not show yet (nothing exists in this repo so far):

1. **The lamp burns for 137 ticks per unit of fuel** (owner ruling 2026-09-18). The number
   lives ONLY in `config.json`; `sim/game.mjs` reads it and never repeats it — not as a
   fallback, not in a comment.
2. **ONE random source: `createRng(seed)` in `sim/lib/rng.mjs`** (owner ruling 2026-09-19).
   Every draw in the sim goes through it; the global random function is never called anywhere,
   so a seed replays a world exactly.
