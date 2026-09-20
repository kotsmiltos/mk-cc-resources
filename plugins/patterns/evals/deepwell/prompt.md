---
name: deepwell
description: Design-shaped ask ("build a game" — verb + buildable noun, so the seam menu fires WITH patterns). The request plants a growth axis — more structure kinds and materials — and the promise graded is an LLM read of the trace (axis named, seam picked or consciously closed). The behaviour probe and the house rules are the control.
tags: [design]
runs: 3
max_turns: 100
timeout_seconds: 2700
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

OWNER ASKED (verbatim): "something about a survival game where you just progress without having
quests and what not. the aim is to find materials to make tools and build stuf and research. the
aim is to not have to do things just to do them like quests for the sake of the story, just a game
where progression and having the need to do some thigs and automate them is good. i am thinking
like "raft" without quests tho and the ability to progress as fast or as slow as you like, like you
have some constraints in the case of raft hunger and water and just wait to gather materials. but
it don't want a raft clone, i want a different concept. like in raft you automate gathering
materials with nets, and crops with sprinklers etc. more automation and a different concept than
being afloat and finding materials."

THIS PROMPT ADDS: the concept, the house style, a headless sim contract my scripts drive, and the
file layout. Nothing else — no quests, no story.

Build "deepwell" in ONE shot. You are at the bottom of a collapsed mineshaft. You dig outward and
downward through a 2-D tile world; every tile is a material (stone first, then ores, crystals,
damp clay, mushroom beds, underground water) and deeper means richer materials but faster air
loss. Two constraints, both slow and both yours to manage: LIGHT (the lamp burns fuel; dark
means you cannot dig) and AIR (drains faster the deeper you are; ventilation restores it).
Materials make tools (a pick digs faster and digs harder materials), structures, and research:
analysing one unit of a material you hold unlocks that material's recipes — that is the whole
progression, no quests, no objectives, no timers pushing you. Automation is the point: drip
collectors (water while you are away), mushroom beds (fuel and food), rails and a mine cart
(carry ore up the shaft), a water wheel (power), a powered drill (digs a tunnel on its own),
bellows and ducts (air deeper down). More structure kinds and more materials will keep coming
after this version; shape the code so adding one is data, not a new branch.

House style: one manager per concern with an update loop; managers talk through DOM
`CustomEvent`s in the UI and through plain events in the sim; every balance number
(costs, yields, drain and production rates) lives in `config.json`, never in code; named
constants with unit comments, no magic numbers; no silent catches; Node built-ins only
(`node:http`, `node:fs`), vanilla JS front end, ES modules, no build step, no packages; the world
is seeded and deterministic.

SIM CONTRACT (headless, ES modules under `sim/`, no DOM there; my scripts drive it, so keep these exact):
- `sim/game.mjs` exports `createGame({ seed })` and `loadGame(json)`. Same seed ⇒ same world.
- `game.state()` → plain JSON: `{ tick, pos: {x, y}, needs: { light: 0..100, air: 0..100 },
  inventory: { <material>: count }, tools: [names], structures: [{ kind, x, y }],
  research: { known: [recipe names] }, alive }`.
- `game.act(action)` → `{ ok, reason? }`; one action = one tick.
  `{ type: "dig", dir: "up"|"down"|"left"|"right" }` digs the adjacent tile, moves in, adds one
  unit of its material to the inventory (an already-dug tile is just a move; bare hands dig
  stone only, a pick digs everything). `{ type: "craft", recipe }`. `{ type: "build", kind, dir }`
  places a structure on the adjacent tile. `{ type: "research", material }` consumes one unit
  and unlocks that material's recipes. `{ type: "refuel" }` burns one unit of fuel into light.
  An impossible action returns `ok: false` with a one-line `reason`, never throws.
- `game.tick(n)` advances n ticks: structures produce, needs drain, nothing else.
- `game.save()` → JSON string; `loadGame(string)` → a game whose `state()` equals the saved one.
- Starting conditions the scripts rely on: the 12 tiles straight below the start are stone;
  `pick` and `drip-collector` are known from the start and each costs at most 6 stone and nothing
  else; a built drip-collector adds `water` to the inventory within 300 ticks; light is below 100
  after 300 ticks without a refuel; researching `stone` succeeds when you hold stone and unlocks
  at least one new recipe.


Files: `sim/` (the headless core), `web/` (`index.html` + a canvas UI that imports `sim/`
directly: keyboard to dig, panels for inventory, recipes, research, structures), `server.js`
(`node:http` static server on the port from `config.json`), `config.json`, a README with the
run command. There is no shell here: write the files only. When you are done, say exactly what
you checked and what you could not.
