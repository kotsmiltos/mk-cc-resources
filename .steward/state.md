# State — current truth (2026-07-25)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## What exists and works

- **Marketplace 2.33.0** — 13 active plugins + mk-cc-all bundle on `main`; 7 benched
  plugins preserved on `archive/benched-plugins`.
- **Shipped position: origin/main == local main == 94a3b17** (refs-verified 2026-07-25).
  The 2026-07-22 batch shipped earlier as b12e932 (tm 1.10.0, lens 0.4.0, steward 0.2.0
  fleet, statusline 0.1.0); the kb batch (0.1.0→0.3.0, 32 files) shipped 94a3b17 after
  a lens audit (14A/2B/2U, one defect fixed) + @ship checklist; owner waived their own
  next-session wiring gate ("@ship it").
- **kb 0.3.0 SHIPPED — the pull surface** (2026-07-24/25, three versions in two days):
  knowledge base on KIND (CoALA: episodic/semantic/procedural/working) x CASTE
  (session/thread/project/fleet/owner). Pure read-only engine + facade `lib/kb.js`;
  four reach surfaces (always-load MCP kb_query/kb_read/kb_overview · `kb` skill ·
  /kb /kb-seed /kb-capture commands · CLI); create+maintain via skills that write
  markdown the engine indexes (`.claude/kb/extracted/`, `.claude/kb/captures/`,
  frontmatter mixed-kind stores). Tests 166/166 + 32/32 incl. live stdio e2e; live
  capture-path e2e ranks #1. Owner installed kb locally ("✓ Installed kb"); skills
  already visible; **MCP tools pending /reload-plugins or restart** — first real
  MCP dogfood is next session.
- **steward 0.2.0** — agent + SessionStart briefing + /steward:fleet + auto-registration
  (`~/.claude/steward/fleet.json`). Tests 17/17. TWO pilots live: this repo (Phase 0)
  + crowd-game (seeded 2026-07-21 by owner, eval terms pinned in inbox/done/,
  summarized tasks.md).
- **thorough-mode 1.10.0** — machine-text guard (misfire class RESOLVED) + steward-aware
  @prompt (kickoff rendered from the model). Tests 21/21.
- **verifiability-lens 0.4.0** — per-project profile override + focus list + 3 presets +
  read-once rule (Phase C profile side, landed early). Tests 39/39. Dogfooded HERE
  (plugin-repo preset active); crowd-game's game-project half pending.
- **statusline 0.1.0** — segment-based (model | task | dir | steward anchor | context
  counter, GSD normalization); wired in user settings; 12/12 tests. Replaced the GSD
  statusline after the GSD uninstall (140-file backup in `~/.claude/gsd-uninstalled-backup/`).
- **Plugin versions:** essense-flow 0.26.0 · essense-autopilot 0.4.0 · session-lifecycle
  1.3.0 · plugin-toolkit 1.7.1 · schema-scout 1.2.1 · thorough-mode 1.10.0 ·
  project-note-tracker 1.8.0 · alert-sounds 1.1.1 · verifiability-lens 0.4.0 ·
  reuse-gate 0.1.0 · steward 0.2.0 · statusline 0.1.0 · kb 0.3.0 · mk-cc-all bundle
  2.22.0 (root plugin.json; marketplace row drifted — see gaps).
- **Recent arc:** generativity protocol → protocol-shaped injections → lens
  follow-through → reuse-gate → steward 0.1.0/0.2.0 + tm 1.10.0 + lens 0.4.0 +
  statusline (b12e932) → kb 0.1.0→0.3.0 pull surface (94a3b17).
- **Measurement machinery exists:** `runner coupling` (2.4.0), `runner extensibility`
  (2.5.0, C#-only), MAP.md, drift diff.

## Known-broken / known-gaps

- **Version-pair drift SHIPPED in 94a3b17** (found at 2026-07-25 integration, disk-
  verified): marketplace.json's mk-cc-all row says 2.21.1 while root plugin.json says
  2.22.0. The @ship cascade check missed the marketplace row. One-line fix → tasks #1.
- **kb .mcp.json registration + alwaysLoad = B-class until next session start** (plugin
  MCP servers load at session start only). Arrival check next session: /mcp shows kb
  connected → kb_overview → both suites. If absent, .mcp.json is the suspect (one-line
  fix + patch push).
- **kb named gaps** (from 0.1.0, still true): `working` kind unwritten; `session` caste
  thin (handoffs + kickoff prompts, both written at session end); kind x caste being the
  right index UNPROVEN — hand-driven + MCP dogfood eval decides.
- **Coupling/extensibility gates run in ZERO projects.** Phase A closes this.
- **verifiability-lens firing economics still open:** per-turn where enabled (baseline
  24–30 fires/long session, ~25–55k tok/dispatch). Phase C = hand-back + risk-triggered;
  kb-pull now part of the answer.
- **essense-flow context-inject economics INVERTED** (code-verified 2026-07-22):
  never-existed `.pipeline` → loud banner every prompt (`lib/state.js:433-437`,
  `context-inject.js:57-68`); yaml-parse-corrupt → silent (`state.js:439-466` throw
  swallowed at `context-inject.js:34` — Diploma's silent-fail). Fix queued (tasks #3).
- **essense-flow slash-command adoption:** all 14 commands abandoned after week 1;
  owner-as-engine pattern. The steward loop is the fix, not an in-place patch.
- **essense-autopilot slated to retire** (Phase E, Q4); doc repositioning holds until
  Phase D/E (Q5).

## Working tree

Clean except `.steward/log.md` (session outcome appends, reconciled at this
integration — commit with the next batch). `inbox/` gitignored (raw captures local).

## Outside-repo (log-only context)

- Serena read-nag wrapper active (doc/data reads skip nag, code reads keep it).
- BinanceRepo key scare RESOLVED 2026-07-22 (keys never committed/pushed, verified).
- External hygiene debt: Diploma corrupt state.yaml (surfaces once tasks #3 lands);
  psience missing root CLAUDE.md + untouched deploy queue (parked, Q8).
