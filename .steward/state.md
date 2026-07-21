# State — current truth (2026-07-22)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## What exists and works

- **Marketplace 2.30.0** — 11 active plugins on `main`; 7 benched plugins preserved on
  `archive/benched-plugins`.
- **steward 0.1.0 SHIPPED** (2026-07-21, commit 3791b7f) — Phase 0 of the continuous-
  transformation plan (§5). Agent (integrate/brief/seed) + SessionStart briefing hook
  (deterministic, silent without `.steward/`, fail-open, 2000-char guard, deliberately
  no Stop hook) + 4 optional alias commands + 9-check test suite.
- **TWO pilots run in parallel.** Phase 0 pilot = THIS repo (owner call, 2026-07-21;
  model committed 655f644, `inbox/` gitignored). AND the owner seeded crowd-game the
  same evening ("ok, i'm running it for crowd game") — Phase D's first-external-seed
  pulled forward. Crowd-game eval agreed: ~5 sessions or ~1 week, 5-signal
  before/after vs the 2026-07-21 baseline, owner annoyance = veto (recipe pinned in
  inbox/done/, summarized in tasks.md #5).
- **thorough-mode 1.10.0** — machine-text guard: all 8 modifiers + hints matched at
  prompt start only, silent on notification/hook text (the observed misfire class,
  RESOLVED). PLUS steward-aware @prompt: renders kickoff from the `.steward/` model
  (RENDER→SPOT-CHECK→SAVE→SHOW) when a model exists. Tests 21/21.
- **verifiability-lens 0.4.0** — per-project profile override
  (`.claude/verifiability-lens/profile.yaml`) + `focus:` list + 3 copyable presets
  (game / plugin-repo / research-data) + read-once profile rule (kills the 90x re-read
  waste). Hook contract tests 39/39. This is the Phase C PROFILE side, landed early.
  **Dogfooded HERE:** this repo's profile.yaml = plugin-repo preset (crowd-game's
  game-project half pending — tasks.md #1).
- **steward 0.2.0** (Q8: "also build fleet briefing now") — `/steward:fleet`
  (`bin/steward-fleet.js`, deterministic) + auto-registration in
  `~/.claude/steward/fleet.json` via SessionStart hook. Tests 17/17 (isolated home
  after a real-fleet leak was caught + cleaned). Fleet currently: this repo;
  crowd-game self-registers at its next open.
- **GSD uninstalled** (Q8) — 140-file footprint moved to
  `~/.claude/gsd-uninstalled-backup/` (recoverable), settings wiring removed, zero gsd
  refs, serena hooks intact. Effective next restart; statusline reverts to Claude
  default (micro-candidate someday: a replacement statusline — not a task).
- **Plugin versions:** essense-flow 0.26.0 · essense-autopilot 0.4.0 · session-lifecycle
  1.3.0 · plugin-toolkit 1.7.1 · schema-scout 1.2.1 · thorough-mode 1.10.0 ·
  project-note-tracker 1.8.0 · alert-sounds 1.1.1 · verifiability-lens 0.4.0 ·
  reuse-gate 0.1.0 · steward 0.2.0 · mk-cc-all bundle 2.21.1.
- **Recent arc** (git log): generativity protocol (essense-flow 0.25.0) → thorough-mode
  protocol-shaped injections (1.8.x→1.9.1) → verifiability-lens follow-through + handoff
  quality gate → reuse-first ship (reuse-gate 0.1.0) → steward 0.1.0.
- **Measurement machinery exists:** `runner coupling` (engine 2.4.0), `runner
  extensibility` (engine 2.5.0, C#-only), MAP.md functionality map, drift diff.

## Known-broken / known-gaps

- **Coupling/extensibility gates run in ZERO projects.** The v3 design's own audit
  finding — gates exist, nothing wires them into executor steps. Phase A closes this.
- **verifiability-lens firing economics still open:** fires per turn where enabled —
  rough 2026-07-21 baseline: 24–30 fires/long session, ~25–55k tokens/dispatch. Owner
  call: keep enablement AS-IS until Phase C firing re-economics (hand-back +
  risk-triggered); rough measurements ARE the baseline. (Profile side already shipped
  in 0.4.0.)
- **essense-flow context-inject economics INVERTED** (code-verified 2026-07-22):
  never-existed `.pipeline` → loud banner every prompt (`lib/state.js:433-437`,
  `context-inject.js:57-68`; ~40x in one session), yaml-parse-corrupt → silent
  (`state.js:439-466` throw swallowed at `context-inject.js:34` — Diploma's
  silent-fail, state.yaml:123 duplicate key). generalize-first over-triggers on
  feature-ish phrasing. Fix queued (tasks.md #2).
- **essense-flow slash-command adoption:** per the v3 audit, all 14 commands abandoned
  in practice after week 1; owner-as-engine pattern (20–93 steering turns/session).
  This is the problem the steward loop exists to fix, not a bug to patch in place.
- **essense-autopilot is slated to retire** (v3 §2 — closest thing to refuted
  TIME-autonomy). Still shipped and documented as active. Owner call: retires with
  Phase E; essense-flow doc repositioning also holds until Phase D/E.

## Working tree

Scratch files (`apolymansi_notice.pdf`, `make_notice.py`, `oh/`, `tree.json`,
`plugins/essense-flow/.claude/`) — confirmed scratch by owner; .gitignore entries
appended by the session; files stay on disk, ignored. RESOLVED. `.steward/` model
COMMITTED — 655f644, HEAD of main at commit time; inbox rule in corrected dir-pattern
form (`.steward/inbox/*` + `!.steward/inbox/.gitkeep`), `git check-ignore`-proven.
**Uncommitted now:** the whole 2026-07-22 batch — thorough-mode 1.10.0, lens 0.4.0,
steward 0.2.0 (fleet), marketplace 2.30.0, lens profile.yaml, doc cascade, model
updates. Push to remote NOT done — awaits owner word (tasks.md #3).

## Outside-repo (log-only context)

- Serena read-nag wrapper wired in user settings (doc/data reads skip the nag, code
  reads keep it) — active next restart.
- BinanceRepo key scare RESOLVED 2026-07-22: keys never committed/pushed (git ls-files
  + log --all zero hits, fitness test exists); no action unless machine compromise.
- External hygiene debt (2026-07-21 audits): Diploma corrupt state.yaml (surfaces once
  tasks.md #2 lands); psience missing root CLAUDE.md + untouched deploy queue.
