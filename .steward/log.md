# Log — outcome ledger (append-only)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

## 2026-08-23 · Three items integrated at e6760ad — audit, "transformation not patches", §6 rulings; 4 tasks closed on observation
Items 1330 (four-project usage audit) + 1430 (owner re-derivation directive) + 1520 (four
§6 rulings). The middle item arrived EXECUTED (logbook-spine → building-blocks catalog →
stack-a-blueprint; strike 1 shipped, pushed AND installed same day — the 0.4.0 freshness ⚠
fired live on this repo's own briefing at open).
- **Owner law → vision invariant 11:** quality over speed (verbatim "46 seconds is not
  really a problem… we go for quality, not necessarily speed"). **Q11 RESOLVED by that
  ruling** — judge stays default; fail-open ranker fallback + recall-QUALITY measurement
  replace the re-take (three live judge ETIMEDOUTs this sitting are the substrate).
  §6 rulings to the ledger: status.json = lifecycle + groups, kb joins as themes; fleet
  session-only; status.json committed. Blueprint §6b = plan of record, into vision.
- **Audit folded:** steward SUCCESS ×4 (recompute mechanically proven); briefing
  staleness = THE systemic class, partly closed by 0.4.0 (⚠ detection), root fix Phase 1
  instruments; verify-scope hole + can't-delete litter + CONSUMED-unspecified + fleet
  channel + format drift → Phase 1/2/4 items; T4 follow-rates answered the ambient
  question YES (gap = self-initiated querying → Phase 3 stats).
- **Tasks recomputed 20 → 19:** CLOSED on observation — old #1 (all four live-watch legs,
  incl. steward-sync FIRST fire + request-closure; trace/ledger per digest), old #4
  (same fire), old #13 (T4 data), old #14 (the audit IS Phase 0 validation). NEW: Phase 1
  pilot at #1 [owner go], Phase 2 rollout #12, Phase 3 stats-gate #13; #11 rewritten
  (rung-2 evidence gate MET — aithseis kb-probe, owner call); v3 phases resume after.
- Checks this pass: refs both `e6760ad` · installed cache globbed (steward 0.4.0 /
  kb 0.10.3 / turn-end 0.5.0 — the install claim READ, not authored) · blueprint §6/§6b
  read · session digest read for the watch-leg evidence · inbox = exactly 3 items.
- Housekeeping: the session's two strike-1 entries relocated from the file bottom to
  their chronological slots below, text verbatim.

## 2026-08-23 · Strike 1 PUSHED — origin 28cc0c7 -> 2891859 (owner "@ship it")
Two commits: 4ef7a37 (steward 0.4.0 + kb 0.10.3, plugin trees) + 2891859 (registry/README/
gate-table/design corpus/model). Pre-ship: registry-check exit 0 (consistent, 6 claim
sources) · repo-guard exit 0 (no leaks; July revert-chain warnings informational) ·
test-all --root 31/31 suites 1723 checks · design docs machine-path grep clean.
Remaining gap: installs — owner runs plugin update (steward, kb) + restart; first live
fire after restart is the staleness line on this repo's own briefing (3+ inbox items).

## 2026-08-23 · Strike 1 SHIPPED — briefing freshness + root anchoring (steward 0.4.0, kb 0.10.3)
Owner "go" on design/stack-a-blueprint.md (Plan 2 + strike 1). Both mechanisms were
prototype-proven against the four real ships before building.
- **steward 0.4.0:** steward-brief.js computes freshness at injection (⚠ line naming events
  newer than briefing.md — pending inbox, log.md, git HEAD ref; fs-only) and anchors briefing
  read + inbox count + fleet registration to the nearest .git ancestor; protocol line now
  names <git root>/.steward/inbox/ as the only capture path. Checks: 34/34 hook tests (7 new);
  LIVE smoke on this repo — the hook flagged the real briefing stale by exactly today's 3
  inbox items, from repo root AND from plugins/kb as cwd (identical output).
- **kb 0.10.3:** new lib/project-root.js; kb-pull + kb-session-start anchor to it (payload
  cwd preferred). Checks: 47/47 + 33/33 + 78/78 on touched suites (subdir hint test, orphan
  silence, footprint entry).
- **Gates:** test-all --root repo = 31/31 suites, 1723 checks (one transient essense-flow
  red on first parallel run; re-ran twice green, direct run green — not reproduced);
  registry-check exit 0 after README rows 19/21 updated. Marketplace + RELEASE-NOTES +
  plugin CLAUDE.mds + README updated.
- **FOUND during gating:** the documented test-all invocation (from toolkit dir, no --root)
  silently sweeps ONLY plugin-toolkit — 764 checks vs 1723 real; historical "test-all 764"
  gate records were toolkit-scoped. Root CLAUDE.md gate table now mandates --root for both
  gates. Filed for integration.
- Not pushed; installs unchanged (0.4.0/0.10.3 reach sessions after owner push + update +
  restart). Next: Plan 2 pilot (status.json + instruments + statusline + kb status-join).

## 2026-08-23 · Item 20260810-1914 integrated at 28cc0c7 — arrived EXECUTED, and the build superseded part of its design
One item (owner symptom, verbatim: *"at the end i should get a neat message answering my
first thing, not what the last agent did"*). The same sitting shipped it as turn-end 0.5.0
`request-closure` and PUSHED on owner "@ship it" — the item integrates as DONE; the model
catches up, zero fresh tasks beyond the live watch #1 already carried.
- **Disk superseded the capture's "settled" span constraint:** the item held a THIRD
  ledger bucket (request-span key) as required; the build chose PROMPT span on purpose —
  every agent wake resets the asked bucket, so every wake-yield gets its own nudge (each
  a user-visible resting state), safe because the ask spawns nothing. Constraint
  DISSOLVED, not violated; recorded in parts so the reasoning survives.
- **Claim 3 (model-answers-the-agent) still never observed in a transcript** — folded
  into #1's live watch: one real wake-turn with the duty ON, confirm the tail answers the
  original request.
- **Ship position moved:** push blocker CLEARED (origin `f796962` → `28cc0c7`, both refs
  read); tasks #1 loses its push leg, keeps update + restart + four-leg live watch.
- Parts: turn-end 0.4.1 → 0.5.0 · sixth duty · `turn.wakeCount`/`WAKE_MARKERS` · tests
  131 → 143 (incl. the Windows case-guard +2).
- Checks this pass: refs both `28cc0c7` · turn-end plugin.json read (0.5.0) · duties dir
  globbed (`request-closure.js` present) · `wakeCount` grepped in context.js · inbox =
  exactly 1 item.
- Housekeeping: the session's 08-10 log entry relocated from the file bottom to its
  chronological slot below, text verbatim.

## 2026-08-10 — request-closure shipped (turn-end 0.5.0)
- Owner symptom → duty, same sitting: spans woken by background agents must end answering the
  owner's verbatim request + who-did-what, not the last agent's return.
- lib/duties/request-closure.js (advise, prompt span — deliberate: every wake-yield renudges;
  ask spawns nothing so it cannot re-arm itself) + context.js turn.wakeCount (WAKE_MARKERS
  open surface) + registry require.
- Checks this pass: turn-end suite 133→143/143 · test-all 4/4 suites, 764 checks ·
  registry-check consistent (README + marketplace bumped 0.4.1→0.5.0).
- Inbox item 20260810-1914 stays staged for the sitting's integration pass (design context
  now partly superseded by the shipped implementation — steward should reconcile both).
- SHIPPED same sitting on owner "@ship it": 28cc0c7 pushed, origin f796962->28cc0c7 — carries
  the five backlog commits (self-check 0.4.0/0.4.1, steward 0.3.0/0.3.1) + request-closure
  0.5.0. Standing push blocker CLEARED; next = plugin update + restart + live ladder watch.

## 2026-08-03 · Four items integrated at 83cea6e — all arrived EXECUTED; one new question (Q13)
Items 0011 + 0040 (08-02), 0105 (08-02 defect), 2142 (08-03). The whole batch was executed
before integration; the model catches up, and the only fresh task is the live proof.
- **Economics ×2 → steward 0.3.0 + 0.3.1** ("fires too often and for too long" →
  "unbearable, make it lighter"): one background pass/sitting + agent Economy; standing
  injection halved (protocol 4 lines; briefing spec ≤6/900 — constants read this pass:
  8/900 with slack; one-line inbox note; diff ≤10). Parked owner lever → **NEW Q13**:
  sonnet override for integrates (default: try it — the diff is the safety net).
- **Self-check pass 2 → vision invariant 10 sharpened** (observed + compared-vs-ask +
  probed-to-break); shipped in turn-end 0.4.0 (first default-ON block duty; lens verify
  pass fixed 2 build defects pre-release). **0.4.1** anchors ALL runtime state to the
  project root (measured cwd-follow defect: stray subdir ledgers, split-bucket re-asks) —
  and that defect is the new best CANDIDATE for steward-sync's never-observed fire (#4).
- **Ship position:** local `83cea6e` AHEAD of origin `f796962` (refs read); 0.4.1 + 0.3.1
  on disk with a clean tracked tree, so the local commit carries them. Push = owner word;
  installs (08-03 reload: steward 0.3.0 + turn-end 0.4.0) stay blind until then.
- **Tasks recomputed 20 → 20:** #1 REPLACED (ship self-check → LANDED) by the live-proof
  task (push → update → restart → full-ladder fire + litter + diet checks); #4 gains the
  root-cause candidate; #18 records the first executed injection cut. NEW counts-class
  instance → #7: steward CLAUDE.md "25 checks" vs measured 27.
- Checks this pass: both refs read · steward/turn-end plugin.json read (0.3.1/0.4.1) ·
  duties dir globbed (`self-check.js` present) · briefing constants read (8/900).

## 2026-08-02 · steward 0.3.0 budgets the loop + self-check hardened by owner pass 2 and the lens
Two owner directives, same sitting, both executed:
- **steward 0.3.0** (owner: "fires too often and for too long"; measured 12.5 min / 137k
  tokens / 54 tool uses for two items + two 07-27 moving-tree re-runs): ONE background
  integration pass per sitting (captures/landings accumulate; explicit "sync" outranks),
  agent Economy section (verify only what it writes, snapshot-don't-chase, diff ≤15 lines,
  minutes not quarter-hours). Recompute discipline untouched.
  **Check:** `node tests/steward-brief.test.js` → 27/27; registry-check → exit 0.
- **self-check pass 2** (owner: run must be OBSERVED with enough logs, compared vs the ASK,
  and probed to BREAK, not happy-path only): `ran-and-looked` (exec + Read after; git/cat/…
  never count as runs), named-check result-tense-only, ask teaches run→LOOK→compare→break.
- **Lens verify pass over the build (3 escalations, 2 fixed now):** post-block boundary
  reset — a decision:block reason arrives as a USER-role "Stop hook feedback:" entry and
  ERASED the judged turn, silently dissolving the hard rung (machine-prefixed entries no
  longer boundaries; real-shaped replay test); planning-prose regex hole closed. Escalation 3
  OPEN: 0.4.0 unproven-live — needs one full-ladder live fire after plugin update + restart.
  **Check:** `node tests/turn-end.test.js` → 130/130.
- Inbox: 2 new captures accumulating (steward economics; look/log/break) — next pass batches.

## 2026-08-02 · Task #1 LANDED — turn-end 0.4.0 ships `self-check`, the no-arbitrary-DONE duty
Owner directive executed same sitting. New default-ON `severity:block` duty: a turn that
changed real files may not yield until one EVIDENCE detector passes (check-shaped command
AFTER the last change / ran-what-it-wrote / lens dispatched / check NAMED with observed
result — the escape hatch that makes block safe). Zero tokens; quality-lens economics NOT
re-taken. `extractTurn` gained ordered `toolCalls` (the "after" fact). Bookkeeping trees
(.claude/.steward/.pipeline + tmp) excluded per the re-arm rule; snapshot absent → silent.
- **Checks:** `node tests/turn-end.test.js` → 126/126 (was 110; ladder nudge→comply→allow,
  ignore→block, before-the-edit check rejected, adapter E2E both halves);
  `registry-check` → exit 0 (caught + fixed the stale README 0.3.1 row).
- Cascade carried: plugin.json 0.4.0, RELEASE-NOTES (owner-set vs Claude-chosen split),
  README row, marketplace row+description, plugin CLAUDE.md, root CLAUDE.md tree line.
- INTEGRATED stubs deleted; inbox empty — steward-sync first-fire probe re-armed.
- Not yet: commit; installs get the duty only after `claude plugin update turn-end` + restart.

## 2026-08-01 · Two inbox items integrated at 1c978fd — disk had already closed item 1; item 2 is owner law + today's work
Items 20260731-2030 (digest-rotation double defect) + 20260801-2349 (owner: self-check
before done), each verified against disk before integration.
- **Item 1 arrived FIXED — integrated as DONE, zero new tasks.** Both defects shipped the
  same evening the note was written (kb 0.10.2, `1c978fd`): defect 1 (stale sitting
  marker) — records on every fire, gate = `.claude/kb/` presence, self-repair tested;
  defect 2 (judge child's new session_id — the "future hazard") — 45-min freshness
  heartbeat + the `MK_TURN_END_DEPTH` stand-down. The cross-plugin env contract the
  capture parked as an owner call was taken by Claude in the /doctor sitting; recorded as
  such in parts. kb-session 62 → 78. Verified in `kb-session-start.js` source +
  RELEASE-NOTES, not from the commit message alone. The item's Q11 rider (every judge
  fire is a digest hazard) died with the stand-down.
- **Item 2 → vision invariant 10 (owner verbatim: never an unverified "DONE") + tasks #1
  IN FLIGHT** (executor: main session, today): default-ON `self-check` DEMAND duty in
  turn-end — deterministic evidence detectors (check RUN, or check + result NAMED, in the
  work's own medium), NO judge; quality-lens stays the opt-in deep tier. Weighed against
  Q11's frame: does NOT reopen it (no judge, negligible cost) — joins the Phase C
  economics ledger (#18). Not on disk yet (duties dir globbed: four duties, no
  self-check).
- **Q11 shrank to the policy re-take alone:** turn-end 0.3.1 executed the previous
  recommended default — timeout 30 → 90 (read), invariant "the hook budget must exceed
  the judge budget", measured pass 40.6s exit 0. The ~31s-stall-with-lost-recall cost is
  GONE; only every-turn-vs-cheaper/rarer/overlapped/gated remains, and it is the owner's.
- **Drift ledger moved:** README turn-end row CLOSED (four duties @ 0.3.1, read this
  pass) · plugin-toolkit 1.10.0 RELEASE-NOTES entry still missing (re-verified) ·
  checks.yml claim standing (re-read, Q12) · NEW light: marketplace metadata 2.47.0
  unmoved while two rows moved · NEW tension: the session-reported test-all 31/31 (1681)
  vs the believed-red ledger-compaction — both cannot be true; adjudication is now
  tasks #10.
- **Install lag inverted:** turn-end 0.3.1 + kb 0.10.2 @ HEAD (07-31T18:27Z, registry
  read); plugin-toolkit now 3 commits BEHIND (@ `8d5cab6`, its cache lacks its own
  CLAUDE.md). The /doctor restructure is COMMITTED (`5fb74b7`) — last pass's
  tree-not-clean concern closed; tree now clean except this recompute.
- Tasks recomputed 19 → 20: `self-check` inserted at #1, all former numbers +1;
  README-row sub-item DELETED from #4 (fixed at source); #5 notes the fixes arrive by
  user-scope install; #10 rewritten as the adjudication; #17 gains the
  already-fixed-item adversarial shape; #18 carries the grown stack. Housekeeping: the
  session's appended /doctor-fix log entry relocated from the file bottom to its
  chronological slot below, text verbatim.
- Checks this pass: refs both `1c978fd`; kb/turn-end plugin.json + marketplace rows read;
  `kb-session-start.js` guards read in source; hooks.json timeout read (90); turn-end
  duties dir globbed (no self-check); README turn-end + kb rows read; RELEASE-NOTES
  0.3.1 / 0.10.2 / 1.9.0 read; installed registry read (three entries); inbox = exactly
  2 items.

## 2026-07-31 — /doctor session: two measured defects fixed and shipped
- turn-end 0.3.1: hook timeout 30->90 (budget must exceed the judge's 60s; 39/52 in-window fires died at 30s, crowd-game 0 completions). Measured pass: real fire, judge ran, 40.6s, exit 0. Tests 110/110.
- kb 0.10.2: spawned sessions can't steal the live digest (marker self-repairs, freshness guard, MK_TURN_END_DEPTH stand-down; 3 mid-sitting rotations measured before fix). kb-session 78/78, all kb suites green.
- Both pushed (1946341, 1c978fd) after the docs restructure (5fb74b7); installs updated to 0.3.1/0.10.2 — restart pending to load them. Gates: repo-guard 0, registry-check 0, test-all 31/31 (1681).

## 2026-07-31 · /doctor item integrated at 8d5cab6 — distribution moved, Q11 got its second number, the drift list shrank
One inbox item (owner-approved /doctor outcomes, per-group AskUserQuestion), every claim
re-verified on disk before integration.
- **Distribution state CHANGED under task #1 (not closed):** mk-cc-all DISABLED +
  plugin-toolkit 1.10.0 installed STANDALONE at user scope @ `8d5cab6` — read this pass
  from the installed-plugins registry + user settings. The picker-duplication objection is
  voided ONLY while the bundle stays off; the stale `ab1ba82` bundle cache is dormant, not
  fixed. All three gates now travel; none yet RUN from another project. #1 rewritten from
  blocked-structural-fork to ratify + prove-the-reach.
- **Q11 second measured number:** `turn-end/hooks/hooks.json:12` sets `timeout: 30` (read
  this pass) vs the 46s judge — 50-session scan: 162 Stop fires, 36 killed at ~31–32s,
  p50 182ms; recall material LOST exactly where the judge runs. Config self-contradiction,
  not lag. Q11's default UPDATED (Claude's): fix the contradiction (raise/remove the
  timeout + one measured pass) without re-taking the policy — the old "change nothing"
  default preserved a config that defeats the chosen policy. Capture 20260731-1950 holds
  the substrate fact.
- **Root CLAUDE.md restructured 50,247 → 11,491 chars** — deep notes moved VERBATIM to
  `plugins/<name>/CLAUDE.md` (5 new files verified on disk; kb + lens patches
  grep-verified). ALL UNCOMMITTED — HEAD unchanged at `8d5cab6` while the files exist;
  the next commit carries the restructure + this model recompute together.
- **Drift ledger recomputed, both directions:** CLOSED — kb + lens CLAUDE.md retired-hook
  drift (patched at source), root-vs-kb per-file counts (root no longer states any).
  STANDING — README turn-end row re-read this pass, still three duties. NEW class —
  references aimed at the old monolithic root may point at moved content (→ #6 sweep).
  New cross-reference law in parts.md: a plugin change edits its OWN CLAUDE.md.
- Environment facts to the log (owner-approved): blender MCP off for this project ·
  `defaultMode=auto` · 12 stale user-scope essense-flow agent copies removed (shadow-risk
  gone) · CC 2.1.220 current.
- Tasks recomputed 19 → 19: #1 rewritten, #6 instances swapped (2 closed, 1 class added),
  #17 carries both Q11 numbers; numbering stable, nothing appended without reconciling.
  Checks this pass: refs both `8d5cab6`; enabledPlugins + installed registry read;
  hooks.json:12 read; kb/lens CLAUDE.md + README row grepped; inbox = exactly 1 item.

## 2026-07-31 · Four inbox items integrated at 8d5cab6 — Q10 resolved, and disk overruled two captures
Items 2029 / 2030 / 2035 (07-27) + 0130 (07-28), reconciled against each other AND against
disk; disk won twice.
- **Q10 RESOLVED → ledger:** the recompute is enforced as turn-end's `steward-sync` duty on
  the owner's terms (advise · session span · silent on empty). Recorded as a DISSOLUTION,
  not a pick: the question priced enforcement as "a fourth blocking hook"; turn-end removed
  that price, so steward keeps its no-hook design AND enforcement exists. `advise` is
  deliberately weaker than the kb precedent — owner's explicit call, visible in the ledger.
  Open remainder flagged: the duty only sees STAGED notes (the second staleness signal is
  unbuilt, unrequested → Phase B question).
- **The 2030 item corrected the 2029 world, and disk corrected both** — third measured
  instance of "an integration is a snapshot of a moving tree." turn-end 0.3.0 (not 0.2.4),
  110 checks (measured), steward-sync documented in plugin README/RELEASE-NOTES/marketplace
  row/root CLAUDE.md. NEW from disk, in neither capture: **the installed turn-end is 0.3.0
  since 07-27T17:31Z** — so "never fired" can no longer be explained by the install alone:
  three trace fires (07-28) with four items staged show ZERO `steward-sync` mentions.
  Tasks #3 rewritten from wait-for-update to verify-or-debug.
- **Disk refuted the 0130 capture's CI claim:** checks.yml did NOT survive — `3633ff7`
  reverted it 289s after 1.9.0, and the tree now holds ZERO workflows while the revert's
  subject claims a restore that is not on disk. Q12 opened (deliberate? default: yes, fix
  the stale RELEASE-NOTES 1.9.0 claim). The "CI will be red" pressure on ledger-compaction
  died with it.
- **plugin-toolkit gates integrated:** 1.9.0 test-all + registry-check (house pattern named
  in vision: pure runner over a drop-in registry, ×3), 1.10.0 skipped-test fix — shipped
  with NO RELEASE-NOTES entry (new counts-class instance). Five first-contact measurements
  recorded, incl. 613 undocumented Python checks, cross-plugin duplication ruled CORRECT
  (do-not-extract), and the coupling scope limit → vision invariant 7.
- **Q11 opened (owner verbatim):** re-take the context-recall firing policy — 46s measured
  vs the 11s it was chosen on; correcting the RECORD of a laundered choice did not re-open
  the CHOICE. Deliberately inert default; any alternative must bring its own measured
  number.
- **Distribution #1 sharpened:** standalone plugin-toolkit install DISPROVEN (six skills
  already bundled → picker duplicates); real fix is a layout change, parked for the owner;
  `capability-reach` now measures the gap. New corroborating datum for #5: a real `kb_read`
  call at 07-26T23:01Z (4 min after the trace write shipped) produced no server line.
- Tasks recomputed: 19 → 19, #3 rewritten, #1/#5/#6/#15/#16/#17 updated; nothing appended
  without reconciling. Checks this pass: refs both `8d5cab6`; versions read from
  plugin.json + marketplace rows; installed set from `installed_plugins.json`; traces
  grepped, not remembered.

## 2026-07-27 · Three inbox items integrated at eee1b35 — the model had a DEAD front page
Items 0035 / 0300 / 0700, written hours apart, each superseding the one before. Reconciled
against each other AND against disk; where disk disagreed with a capture, disk won.
- **The front page was dead, not merely stale.** briefing/state asserted HEAD `817b472`,
  kb 0.7.0, marketplace 2.38.0 and "NOTHING IS LIVE / installed kb is 0.3.0". Disk: HEAD
  **eee1b35** (local ref == origin ref), 14 commits later; marketplace **2.44.5**; installed
  kb **0.10.1**, turn-end **0.2.4 @ eee1b35**, and every other install matching its repo
  version. The whole "unproven until it runs" framing is DELETED.
- **NEW plugin `turn-end` 0.2.4** — the single blocking Stop hook, with two duty KINDS
  (demand + supply), a source registry and a judge adapter. kb 0.9.0 and
  verifiability-lens 0.5.0 retired their own Stop hooks into duties (both `hooks.json`
  read this pass: kb registers two hooks, the lens registers `{}`). New vision invariant 9,
  "one blocking tail", with its exception named.
- **LIVE, proven from disk not transcript:** `.claude/turn-end/trace.jsonl` 13 fires
  01:37Z→17:02Z, the ladder proven on ONE prompt_id (advise 15:43:48 → `decision:block`,
  `stop_hook_active:true`, `fires:1` 15:44:45), `context-recall` supplying
  `.steward/parts.md` + `.steward/questions.md` at 17:02Z; `.claude/kb/trace.jsonl` 101
  lines (was the 21-line pre-live baseline) with `kb-session-start` + `"digest":true`, and
  zero `kb-scribe-hook` lines after 07-27T01:33Z — exactly what the retirement predicts.
- **THREE capture claims REFUTED by disk, and the model records the disk answer:**
  (1) "the re-point dropped `autoUpdate: true`" — it is SET in the marketplace registry
  (lastUpdated 07-27T16:21Z), so no task; (2) "the `@ship` line points every project at a
  dead path" — thorough-mode 1.11.1 already made it PROBE first
  (`hooks/thorough-mode.js:72`); (3) "the leaks are exactly 7 test files" — wrong in both
  directions: the two sites the capture named are fixed, `artifacts/` holds
  placeholder-shaped strings a naive regex flags wrongly, and the honest ledger is
  repo-guard's allowlist entry, which its own note calls known debt.
- **CONFIRMED and promoted to THE gap:** the installed `mk-cc-all` bundle is cached at
  `ab1ba82` and its `plugin-scaffold`/`skill-heal`/`docs-audit` SKILL.md still open with
  `ls -d plugins/*/ 2>/dev/null` — the portability fix, written three times, has reached
  none of the invoked skills. `plugin-toolkit` is not installed at all and the bundle ships
  `skills` paths only, so repo-guard cannot leave this checkout. Now tasks #1.
- **Found by this integration, in neither capture:** a fourth turn-end duty,
  **`steward-sync`**, is registered and enabled `advise` — built, never fired, and absent
  from its own plugin's README/RELEASE-NOTES and root CLAUDE.md. Q10 stays OPEN (the
  owner's answer is being staged separately) but its context now names the mechanism, the
  owner-specified vs Claude-chosen parameters, the prompt-span measurement, and the
  platform's 8-block cap — which also corrects "the 8-pass runaway ended by context
  exhaustion" before that characterisation ever entered the model.
- Tasks recomputed 17 → 19 and reordered around distribution; old #1 (make it live) DELETED
  as done except one restart-gated leg, old #3 (briefing cap) DELETED except the write-time
  gate, old #17's done-check REPLACED by "the allowlist entry is gone and repo-guard still
  exits 0". Nothing was appended without reconciling.

## 2026-07-27 · Fact-correction at 817b472 — the previous pass had read a MOVING tree
- Three facts were stale by TIMING, not carelessness (the recompute ran while `817b472` was
  being made): HEAD `ab1ba82` → **817b472**; plugin-toolkit "1.7.1, bump in flight" → **1.7.2
  landed** (plugin.json · marketplace row · metadata **2.38.0** · RELEASE-NOTES head, all read
  on disk); skill blocks bare-relative → **`"${CLAUDE_PROJECT_DIR:-.}/plugins/"*/`**, the only
  form surviving both undocumented cases, executed in 4 scenarios (subdirectory/env-unset FAILS
  — what bare-relative would have shipped). Plus `.planning/rebuild` scrubbed; the 7
  essense-flow test leaks filed as tasks #17. **Q10 evidence from inside the loop:** an
  integration is a snapshot, and a snapshot of a moving tree goes stale with nobody at fault —
  whatever forces the recompute must fire after the work SETTLES, not just before a session ends.

## 2026-07-27 · Post-ship fixes pushed (616a42f, ab1ba82) + model CORRECTED (the last reconcile's own finding was fixed, not filed)
Same sitting as the 07-26 ship, minutes past midnight. What the ship left behind got fixed
rather than documented, which INVERTED two facts in this model.
- **616a42f** — portability in 4 SKILL.md files · kb README false claims removed · **kb-scribe
  now writes a trace line** (`hooks/scripts/kb-scribe-stop.js:249-259`: `writeTrace(cwd,
  {tool:'kb-scribe-hook', blocked:true, tools:[…]})` on every block, presence-gated,
  try/catch so telemetry never breaks the block) · prior steward reconcile.
  It was added BECAUSE the last reconcile showed done-check item 4 was unsatisfiable — the
  model's correction became a code change the same day.
- **ab1ba82** — the portability fix corrected: skill shell blocks use RELATIVE paths after the
  first attempt reached for an env var that had not been verified. A portability fix needing a
  fix is the substrate-verify rule failing on path syntax.
- **Model corrections (all disk-verified at this pass):** tasks #1 done-check 4 now EXPECTS a
  `kb-scribe-hook` line with `"blocked":true` — all three hooks are traced; kb tests 460 → **462**
  (kb-scribe 40 → 42, `tests/kb-scribe.test.js:162-163`); ship position 71a0b0a → **ab1ba82**
  (`.git/refs/heads/main` == `.git/refs/remotes/origin/main`); an absolute drive path to the
  crowd-game checkout REMOVED from tasks.md — `.steward/` is committed to a public repo, so the
  no-personal-paths rule now sits in vision.md + the steward contract in parts.md, where a
  recompute must read it.
- **Baseline re-verified, not remembered:** `.claude/kb/trace.jsonl` still 21 lines, every one
  `kb-pull-hook` / `"digest":false`, zero `kb-session-start`, zero MCP, **zero `kb-scribe-hook`** —
  so all four live checks in tasks #1 remain unfakeable. Inbox re-globbed: empty (stubs deleted).
- **Not on disk, deliberately not recorded as done:** plugin-toolkit 1.7.2. plugin.json,
  marketplace row and RELEASE-NOTES all still read 1.7.1 at this pass; the bump is in flight.
  Same for kb — the scribe trace shipped under 0.7.0 with no bump.

## 2026-07-26 · SHIPPED: 19 commits pushed (71a0b0a) + kb 0.7.0 self-running · model reconciled
Third wave of the same session, then the push, then this integration (5 inbox items).
- **kb 0.7.0 — self-running** (owner: "run seed… regardless of if I've run it again… then it
  uses and maintains itself"): `kb coverage` reads the mandatory `Extracted-from:` citations
  into a top-up map, so a re-seed is incremental BY MECHANISM, not by the seeder's memory;
  `lib/presence.js` self-activation — a project that keeps no curated memory is never touched
  (not even by telemetry; `writeTrace` holds the gate for every caller), so seeding IS the
  on-switch and there is no per-project wiring to remember; SessionStart digest rotation to
  `.claude/kb/digests/` (archive verified on disk BEFORE the live file is deleted; only
  startup/clear rotate, resume/compact/fork keep it) so "now" never carries yesterday;
  one-time seed cue in `~/.claude/kb/cued.json` (HOME, never the project); ranker `scan` mode
  + ubiquity rule; a footprint invariant suite (fs-import + write-site audit,
  negative-controlled) — the suite exists because three review rounds each missed a write path.
- **PUSHED**: local main == origin/main == 71a0b0a (refs read from
  `.git/refs/{heads,remotes/origin}/main` at reconcile). 19 commits. Versions node-verified
  equal across plugin.json / marketplace row / README: kb 0.7.0 · essense-flow 0.26.1 ·
  bundle 2.26.0 · marketplace 2.37.0.
- Checks: kb 460 across SIX suites (256 · 37 · 40 · 56 · 38 · 33), documented command now a
  GLOB — naming files is how the footprint suite silently dropped out of it; essense-flow
  hooks 11/11 + `test/run-all` 54/0; regression green: steward 17 · statusline 16 ·
  thorough-mode 21 · reuse-gate 21 · lens 39.
- **Six lens rounds** over this work; defect severity fell monotonically to meta-level only.
  Two recurring CLASSES named in the model rather than fixed one instance at a time:
  hand-written counts in prose (4/4 doc defects were stale numbers; a 5th found at this
  reconcile — root CLAUDE.md says statusline 12, the suite runs 16) and tests that lie (4
  occasions, **always** in the flattering direction).
- **The honest position: NOTHING IS LIVE.** Installed kb = 0.3.0; hooks + the traced MCP
  server register at INSTALL time. Pre-live baseline captured for an unfakeable check —
  `.claude/kb/trace.jsonl` 21 lines, all `kb-pull-hook` from piped runs, all `"digest":false`,
  zero `kb-session-start`, zero MCP lines. Update + restart + prove = tasks #1.
- **Integration corrections (both disk-verified, both against a claim in our own capture or
  brief):** (1) the steward briefing does NOT truncate silently — a marker exists at
  `steward-brief.js:70-72` and is asserted at `steward-brief.test.js:68`; the real defect is
  no WRITE-time budget, no dropped-char count, and an owner who never sees injected text.
  (2) kb-scribe writes NO trace line, so "all three hooks visible in trace.jsonl" is not an
  achievable done-check — its evidence is the block + a digest gaining content.
- Q10 OPENED: who forces the recompute? (crowd-game's model went a full session stale;
  captures land, integration doesn't). Recommended default: narrow enforced sync reusing
  kb-scribe's contract, fired only on a staleness signal.

## 2026-07-25 · kb 0.6.0 BUILT — the ENFORCED write side (owner: "a nudge… not gonna be enough")
Owner rejected the nudge-only write path and asked whether a lens-like agent should pick up
the important parts. Decision taken (technical side on the session, per owner): same
ENFORCEMENT as the lens, no second agent — the session already holds the whole turn; only a
JUDGE needs independence, a SCRIBE does not (agent escalation stays available if traces show
under-firing).
- **kb-scribe Stop hook**: on a PRODUCING turn (Write/Edit/Bash/Agent; investigation-only
  excluded so it isn't per-turn noise) returns {decision:"block"} → session must distill the
  turn into the digest AND graduate durable items (captures/ = project-length,
  .steward/inbox/ = model changes). One pass feeds BOTH memory lengths — the answer to
  owner's "session length and the project length".
- **Loop safety = lens contract verbatim**: fire-exactly-once (block → forced release),
  content-hash skip, own-marker guard, digest-already-written satisfies, fail-open, off via
  {"scribe":{"enabled":false}}.
- **IMPORTANT is stated, not assumed** (owner: "you should have enough context… be
  diligent"): dies-first classes + explicit NOT-important list in the instruction, plus
  per-project `scribe.focus` lists DERIVED from each project's own model — this repo (forks
  resolved open, rejected approaches, the verifiable check, cross-file contracts, measured
  numbers) and crowd-game (vision-gap movement, open-model forks, retired hypotheses,
  invariants, gate numbers, drop-in seams). Both configs written + load-verified (defaults
  preserved beside the override — proves the new merge).
- **Generic config merge** (`mergeLayer`): object knobs patch per key BY RULE; a future knob
  is config, not a new branch. Caught by the scribe's own first test run (project scribe key
  was being dropped) — fixed at the root instead of adding a third hardcoded branch.
- Checks: kb 219/219 (+10 merge) · kb-pull 23/23 · kb-scribe 37/37 (new) · kb-mcp 35/35 =
  314; versions kb 0.6.0 / bundle 2.25.0 / marketplace 2.36.0 node-verified equal; README +
  RELEASE-NOTES + both CLAUDE.mds + plugin/marketplace descriptions synced.
- NOTE: hooks live only after a kb plugin update + session restart; kb now carries TWO hooks.

## 2026-07-25 · kb 0.5.0 BUILT — the awareness surface (owner directive "you have to build it")
Same session, second build wave. Owner answered the ambient-use analysis with a build-all
directive (inbox 20260725-1445). Shipped, each disk-checked:
- **kb-pull hook** (kb now hooks-carrying): deterministic ranker over each prompt →
  score-floored hint lines (title + kb_read id); machine-text guard; fail-open; config
  off-switch. Live check HERE: prompt about "second agent for narrowing" → 3 correct hints.
- **Session digest**: rolling .claude/kb/session-digest.md injected every prompt (capped
  1500 chars, LOUD truncation); shipped source working/session — first use of working kind.
  Model-maintained; the short-term half owner asked for ("lives much closer to now").
- **Call traces**: .claude/kb/trace.jsonl — every MCP call + hook fire, JSONL. Dogfood
  measurement now objective (tasks #4).
- **Pattern split mode**: split:{type:'pattern',pattern} for non-heading ledgers. Field
  result: crowd-game log 1 → 45 entries (its .claude/kb.json override written), total there
  96 → 140; probe "T13 founding phase" ranks the T13 task entry #1.
- **Seed depth + autonomy**: ALL substrate rows mandated (full git messages, ledgers,
  addenda); judge-then-report replaces pre-confirm (executes queued task #2). Owner's
  "run or update?" answered: updated — next crowd-game session runs the deep seed.
- Checks: kb 209/209 + mcp 35/35 + kb-pull 20/20 (new suite); versions kb 0.5.0 /
  bundle 2.24.0 / marketplace 2.35.0 consistent (node check); README/RELEASE-NOTES/
  CLAUDE.mds synced; packaging decision taken: hooks live IN kb, standalone-install note.
- steward: inbox has the build directive + 3 prior items to integrate; briefing/tasks now
  one wave stale again (expected — recompute at next sync).

## 2026-07-25 · Arrival check PASS + first seed + "do them all" batch (tasks #1, #3, retrieval rung 1)
Session outcomes, each disk-checked:
- **Task #1 DONE**: MCP live (kb_overview in-session, 67 entries), suites 166+32 green,
  marketplace row fixed 2.21.1→2.22.0, committed 1159497, pushed on owner word
  (local==origin verified). The 0.3.0 B-class (alwaysLoad wiring) is CLOSED — observed live.
- **First /kb-seed on this repo**: 6 entries → .claude/kb/extracted/ (owner approved all;
  candidate 7 skipped as vision-dup). Lens caught 1 false universal in the test-convention
  entry — amended in place. Owner direction captured to inbox: seed should judge on its own
  (relax confirm gate) — 20260725-0337-kb-seed-should-see-on-its-own.md.
- **Q9 ANSWERED, not parked-as-ratified**: owner wants retrieval improved ("fuzzy matching?
  other techniques?") — inbox 20260725-0337-retrieval-improvement-direction.md. Rung 1
  SHIPPED same session (kb 0.4.0): stemming + edit-distance-1 typo tier + config alias
  groups + skipThinPreamble (corpus 75→71, boilerplate preambles gone). 198+32 tests.
- **Task #3 DONE** (essense-flow 0.26.1): context-inject inversion fixed both ways —
  never-initialized repos silent (pipeline_present probe), parse-corrupt VISIBLE (was
  stderr-only; reproduced with duplicate-key fixture pre-fix). hooks.test.js 7→11 green.
  PLUS root-caused the generalize-first over-trigger: jq absent on this machine → hook
  matched the RAW payload where cwd "mk-cc-resources" contains noun 'resource' → fired on
  ~every verb-bearing prompt. Fixed in ~/.claude/hooks/generalize-first.sh (node extracts
  .prompt; no raw-payload fallback). 4-case behavior check green.
- Versions cascaded: kb 0.4.0, essense-flow 0.26.1, bundle 2.23.0, marketplace 2.34.0;
  README + RELEASE-NOTES + both CLAUDE.mds synced. Pre-existing red noted: essense-flow
  ledger-compaction T-ENF-3 (calendar drift, fails on clean tree too) — separate chore.
- **Dogfood (task #2)**: kb_query fired 6× this session — all protocol-driven (seed dupe
  checks), zero unprompted. Not yet the ambient signal; watch continues.

## 2026-07-25 · Inbox integrated (kb thread) — model recomputed
Item 20260724-1100 (session-scope counterpart + kb query surface) integrated as
largely-EXECUTED direction: kb 0.1.0→0.3.0 shipped 94a3b17, pushed (refs-verified
local==origin). Cascade: vision (push/pull frame + kb growth axes), parts (+kb, +statusline,
lens 0.3.2→0.4.0 + tm 1.9.1→1.10.0 stale entries fixed), state recomputed to 07-25
(07-22 "uncommitted batch" note was stale — b12e932 shipped), tasks recomputed (old #3
ship-batch DELETED as done; +arrival check, +MCP dogfood, crowd-game items merged),
Q9 opened (ratify characterization park). NEW drift found at integration, disk-verified:
marketplace mk-cc-all row 2.21.1 vs root plugin.json 2.22.0 — @ship check missed the
marketplace row; fix folded into tasks #1. Check: refs .git/refs/{heads,remotes/origin}/main
both 94a3b17; grep marketplace.json:93 = 2.21.1.

## 2026-07-25 · kb SHIPPED — 94a3b17 pushed to origin/main
Owner ran the lens audit first (verdict: build real and deep, 14A/2B/2U; ONE defect — read
skill's stale capture-routing line — fixed same turn, suites re-green), then committed
(94a3b17, 32 files, 3411+) and @ship-pushed. Checklist all-ok: version cascade 0.3.0 /
2.33.0 / 2.22.0 consistent, README+RELEASE-NOTES+CLAUDE.md current, suites green pre-push,
tree clean. Owner explicitly waived their own next-session wiring gate ("@ship it").
REMAINING B-CLASS: plugin .mcp.json registration + alwaysLoad honoring — observable ONLY at
next session start. Arrival check next session: /mcp shows kb connected -> kb_overview ->
both suites. If absent, .mcp.json is the suspect; one-line fix + patch push. Parked &
owner-unratified: characterization pass (revisit after first foreign seed — crowd-game).
Owner installed kb locally same session ("✓ Installed kb"); skills visible in-session;
MCP tools pending /reload-plugins or restart.

## 2026-07-25 · kb 0.3.0 — create + maintain (seed + capture skills)
Owner pushed back ("didn't I ask for it?") — correct: the seeder WAS asked for; phase-1-only
was too narrow a reading of "let's build it." Shipped same session: /kb-seed (extraction
seeder for existing projects — sweep docs/git-history/code, owner confirms candidate list,
one dated file per finding with mandatory Extracted-from citation -> .claude/kb/extracted/,
re-runs top up) + /kb-capture (one memory at a time -> .claude/kb/captures/, steward-routing
rule: model changes go to .steward/inbox/ for recompute) + frontmatter in markdown-dir
(per-file kind/caste/title/when/themes override spec; file themes EXTEND spec themes; the
mixed-kind-store enabler) + two shipped sources (kb-extracted, kb-captures). Engine stays
read-only permanently — skills write markdown it indexes. Versions: kb 0.2.0->0.3.0 (incl.
SERVER_INFO), marketplace 2.32.0->2.33.0. Check: kb.test.js 166/166 (+15 frontmatter/mixed-
kind) + kb-mcp.test.js 32/32; LIVE e2e — real decision (captures-vs-extracted split) filed
through the capture path, ranks #1 at 13.75 on its own terms, stat shows kb-captures=1.
Still parked: characterization pass, kb_capture MCP write tool, session journal + hooks.

## 2026-07-25 · kb 0.2.0 — MCP adapter, kb becomes self-serve
Phase 1 of the four-phase plan (MCP -> characterization -> seeder -> writes/journal), built on
owner's "Claude should call it whenever it thinks it needs it, ReAct-style." New: .mcp.json
(alwaysLoad:true — schemas in context every turn, never deferred) + mcp/kb-mcp-server.js
(stdio, hand-rolled JSON-RPC 2.0, zero deps; kb_query with narrowing hints inside the tool
result / kb_read full-entry-by-id / kb_overview; server instructions teach ask-before-re-derive;
isError content for model-correctable misuse; corpus refreshed per call). Facade gains read(id).
Versions: kb 0.1.0->0.2.0, marketplace 2.31.0->2.32.0. Bundle unchanged (skill only; MCP ships
with installing kb itself). Check: kb.test.js 151/151 + kb-mcp.test.js 32/32 (incl. live stdio
e2e: initialize -> tools/list -> tools/call -> isError -> METHOD_NOT_FOUND); real-repo smoke =
initialize ok + query over stdio returns 9 matches with hint line. NOTE: server not live in
THIS session (plugin installs load at session start) — first real dogfood next session.
Remaining phases parked: characterization (enrich job, cached by content hash), seeder
(kb:seed -> .claude/kb/extracted/, new store only), write tools, session journal.

## 2026-07-24 · kb 0.1.0 built — the pull surface (read-only slice)
New plugin `kb`: queryable knowledge base on two orthogonal axes, KIND (CoALA —
episodic/semantic/procedural/working) x CASTE (ordered narrow->wide —
session/thread/project/fleet/owner). Answers the owner's "session-scope counterpart"
thread: steward + lens PUSH a briefing at open; kb is the PULL side. Core = pure engine
(filter -> rank -> narrowing hints) + entry contract + `markdown-dir` generic source type
+ `term-overlap` deterministic ranker + config merge; CLI is one adapter over `lib/kb.js`,
a peer of the future MCP adapter (not its parent). Read-only on purpose — no writes, no
hooks, no MCP until retrieval quality is proven by hand. Registered in marketplace
(2.30.0 -> 2.31.0, 14 plugins); README + CLAUDE.md tree + dependency row updated.
Check: `node plugins/kb/tests/kb.test.js` = 148/148; `kb stat` on this repo = 57 entries
(semantic 30 / episodic 19 / procedural 8) across 6 populated sources; a 28-match query
returns 3 hits + a narrow_by facet breakdown. Named gaps: `working` kind unwritten,
`session` caste thin (handoffs + kickoff prompts only, both written at session end),
kind x caste being the right index still UNPROVEN — that is what hand-driven eval is for.

## 2026-07-22 — batch SHIPPED (owner: "@ship it")
- b12e932 pushed to origin/main (36 files, +908/-108), carrying 655f644 + 29b7839 (seed model).
- Check: origin/main == local HEAD == b12e932; tracked tree clean; suites at ship: 16/16, 17/17,
  21/21, 39/39; version pairs verified consistent pre-push.
- tasks.md #3 (commit+@ship+push) now DONE — next session's sync reconciles it + regenerates
  briefing (no inbox items pending; briefing is one-step stale until then, expected).

## 2026-07-22 — statusline plugin (owner request: GSD context counter back) + lens doc-cascade fix
- statusline 0.1.0: segment-based (model | task | dir | steward anchor+inbox | context counter
  with GSD normalization — 100% = usable limit, ~16.5% autocompact buffer). Open design: SEGMENTS
  array of fail-soft functions. Wired in user settings.json (repo path). Registered in
  marketplace + README + CLAUDE.md + RELEASE-NOTES. Check: 12/12 tests incl. normalization math.
- Lens Q8-batch escalation folded: verifiability-lens CLAUDE.md (v0.4.0 + roadmap entry) +
  README (override + presets rows). Steward README backslash claim = lens false positive
  (disk has forward slashes, verified cat -A). Check: all suites green (12/12, 17/17, 21/21,
  39/39), all JSON valid. Statusline active next restart. Uncommitted, same gated batch.

## 2026-07-22 — Q8 routed + executed (session)
- Q8 answer: "also build fleet briefing now" — GSD uninstall + fleet NOW; drop channel deferred
  behind eval; psience hygiene parked.
- GSD uninstalled: 140-file footprint (32 commands, 12 agents, 3 hooks, statusline, manifest)
  moved to ~/.claude/gsd-uninstalled-backup/ (recoverable); settings.json wiring removed.
  Check: settings parse ok, zero gsd refs, serena hooks intact. Statusline reverts to default.
  Effective next restart.
- steward 0.2.0: /steward:fleet (bin/steward-fleet.js, deterministic) + auto-registration in
  ~/.claude/steward/fleet.json via SessionStart hook. Check: 17/17 tests (isolated home after a
  real-fleet leak was caught + cleaned); live render shows this repo correctly.
- Lens preset dogfooded HERE: .claude/verifiability-lens/profile.yaml = plugin-repo preset.
  crowd-game gets game-project preset at its next session.
- Cascade: steward 0.2.0 in marketplace (metadata stays 2.30.0, same unshipped batch);
  RELEASE-NOTES, README, CLAUDE.md updated. All uncommitted.

## 2026-07-22 — three most-used-tools improvements landed (session)
- thorough-mode 1.10.0: machine-text guard (all 8 modifiers + hints silent on notification/hook
  text — the observed @prompt misfire class) + steward-aware @prompt (renders kickoff from
  .steward/ model). Check: tests/thorough-mode.test.js 21/21.
- verifiability-lens 0.4.0: per-project profile override (.claude/verifiability-lens/profile.yaml)
  + focus: list (per-project quality bar — the "too generic" fix) + 3 copyable presets
  (game/plugin-repo/research-data) + read-once profile rule (kills the 90x re-read waste).
  Check: hook contract tests 39/39.
- User-global (outside repo): serena-remind-wrapper.js wired in ~/.claude/settings.json —
  consecutive-read nag skipped for doc/data files, forwarded for code. Check: piped md-read
  silent, py-read forwarded, garbage fail-open; settings parse verified. Active next restart.
- Cascade: marketplace 2.30.0; README + CLAUDE.md + both RELEASE-NOTES updated. Uncommitted.

## 2026-07-22 · Q8 outcomes reconciled into the model
Q8 → resolved ledger ("also build fleet briefing now"; drop channel deferred behind
eval, psience parked). Fleet + GSD are LOG outcomes, not tasks. Task #1 shrunk to the
crowd-game preset half (this repo's half done). parts.md: steward → 0.2.0 (+fleet
exposes, 17/17 tests) + known-limitation line (steward can't delete/move — session
deletes the DELETE-ME stubs after integration). state.md: 0.2.0, GSD-next-restart,
preset-active-here, uncommitted batch widened. Check: questions.md header "None
open"; briefing top task = crowd-game preset half; versions list shows steward 0.2.0.

## 2026-07-22 · Inbox integrated (3 items) — model recomputed
Items: crowdgame-seeded-early (owner seeded crowd-game 2026-07-21 ahead of plan — two
parallel pilots; eval terms captured), eval-measurement-recipe (5-signal methodology
pinned; preserved verbatim in inbox/done/, summarized in tasks.md #5),
toolset-improvement-candidates (routed: Binance resolved-no-action; injection
inversion → task #2 + Phase C broadened; fleet-briefing/drop-channel/GSD/psience →
Q8; absorption list → Phase E). Session outcomes reconciled: tasks #1 (modifier
audit, tm 1.10.0, 21/21) + CLAUDE.md steward-sync (grep-verified lines 150-164)
DELETED as done; lens 0.4.0 = Phase C profile side landed early, #8 scope shrunk;
new task #1 = dogfood presets on both pilots. Check: inbox/ empty except .gitkeep;
tasks.md renumbered 1-10; state.md versions match marketplace 2.30.0.

## 2026-07-21 · LANDED: `.steward/` model committed (pilot seed closed on disk)
Commit 655f644 "chore(steward): seed the toolkit's own living model — Phase 0 pilot
is this repo" — confirmed HEAD of main. Includes corrected inbox gitignore rule
(`.steward/inbox/*` + `!.steward/inbox/.gitkeep`; dir-pattern negation trap caught,
proven with `git check-ignore`). Check: commit hash = HEAD of main. Residual: push
awaits owner word (tasks.md #3). Tasks recomputed: done task deleted, push sliver kept.

## 2026-07-21 · Seed answers integrated — all 7 questions resolved
Owner (AskUserQuestion): pilot = mk-cc-resources itself (not crowd-game → Phase D);
lens stays ON, Phase C baseline = rough session measurements (24–30 fires,
~25–55k tok/dispatch); modifier fix = all-8 audit; autopilot retires Phase E; doc
repositioning holds; scratch files gitignored (session appended entries); model
committed with inbox/ ignored. Model recomputed: tasks reordered for here-pilot,
questions.md → resolved ledger, state/vision cascaded. Check: questions.md shows
zero open; tasks.md #4 targets THIS repo; grep finds no remaining crowd-game-as-gate.

## 2026-07-21 · `.steward/` seeded for mk-cc-resources
Model built by /steward:seed from README.md, CLAUDE.md, `design/continuous-
transformation.md` (v3), `.claude-plugin/marketplace.json` (2.29.0, 11 plugins),
steward plugin README + RELEASE-NOTES, recent git log. 7 questions parked; 9 tasks
derived (ordered by Phase 0–E plan §5). Check: all 7 model files + inbox/ exist;
uncertain inferences carry (assumed).

## 2026-07-21 · steward 0.1.0 shipped (commit 3791b7f)
Phase 0 of continuous-transformation §5: agent + SessionStart hook + 4 alias commands.
Check: `node plugins/steward/tests/steward-brief.test.js` — 9 checks pass (per
RELEASE-NOTES).

## Prior arc (from git log, pre-seed)
- 72cba0f merge: reuse-first ship reconciled with remote (version collision re-sequenced)
- dbc2d0c docs(@ship): verifiability-lens README row + handoff gate in CLAUDE.md
- d6b1fc1 verifiability-lens follow-through — @prompt full shape, cascade drift closed,
  handoff quality gate (tm 1.8.1, pt 1.7.1, sl 1.3.0)
- 4449028 thorough-mode 1.8.0 — protocol-shaped injections (@thorough/@fresh/@prompt)
- bf1cbe2 essense-flow 0.25.0 — generativity protocol (design forks → open model)

## 2026-08-23 · Phase 1 status-spine pilot BUILT + LIVE on this ship (steward 0.5.0, kb 0.11.0, statusline 0.2.0, turn-end 0.6.0)
Owner "sync first then go" — sync's diff landed (3 items, Q11 resolved by ruling, tasks
recomputed), stubs deleted, then Phase 1 in full:
- **Contract**: design/status-contract.md v1 (10 rules, each tied to a measured defect).
- **steward 0.5.0**: lib/status.js (tolerant reader; 13/13) · brief hook cursor staleness +
  [instr] computed lines (40/40) · bin/steward-backfill.js (absent-only seeder) · agent
  protocol now writes the ledger, never moves files, regenerates briefing LAST, authors no
  volatile facts.
- **kb 0.11.0**: lib/status-join.js — status:/group: themes at collect (9/9; full sweep
  33+44+47+42+78+9+273).
- **statusline 0.2.0**: segSteward v2 ⚓N✱ ▲M, root-anchored, tolerant (20/20).
- **turn-end 0.6.0**: context-recall fail-open ranker fallback, engine named (146/146) —
  Q11's ruled shape, substrate: 3 live judge ETIMEDOUTs this sitting.
- **PILOT SEEDED LIVE**: backfill wrote status.json — 29 items, cursor 20260823-1520;
  live smoke: brief hook FRESH verdict + "[instr] git: main @ e6760ad"; statusline calm ⚓.
- Gates: test-all --root 33/33 suites 1758 checks · registry-check exit 0 (all four bumps
  + README + marketplace + CLAUDE.mds consistent).
- NOT pushed — owner word pending; installs see Phase 1 only after push + update + restart.
  Dogfood week starts at the first post-install session.

## 2026-08-23 · Phase 1 PUSHED — origin e6760ad -> 303c00c (owner "@ship it")
One commit, 38 files (+1662/−418): four plugin bumps (steward 0.5.0 / kb 0.11.0 /
statusline 0.2.0 / turn-end 0.6.0), contract page, seeded pilot status.json, sync-pass
model recompute. Pre-ship: leak grep clean · repo-guard exit 0 (July revert-chains
informational) · test-all --root 33/33 / 1758 · registry-check consistent. Next: owner
updates installs (steward, kb, statusline, turn-end) + restart → dogfood week begins;
first post-install open should show [instr] line + calm ⚓ on this ship.

## 2026-08-23 · Dogfood day 1 — arrival check: three legs observed, zero instrument lies
First post-install open (tasks.md #1 watch). Evidence per leg:
- **(a) staleness**: briefing injected "[instr] git: main @ e6528e0" + no ⚠ line. Reality:
  HEAD e6528e0 (21:28), briefing.md mtime 21:43 (newer than newest event), inbox empty.
  FRESH verdict honest. PASS.
- **(c) ledger truth**: status.json 29 items, all integrated-by-backfill; ids match
  inbox/done/ files 1:1 (backfill's own check field verified against disk). Cursor
  derived_through 20260823-1520 = max recorded id → derived new = 0, matches the
  briefing's "inbox: empty". PASS.
- **(d) statusline**: live render — real status.json piped through bin/mk-statusline.js —
  emits calm cyan ⚓ alone (byte-decoded U+2693; no N, no ✱, no ▲). Matches ledger. PASS.
- **(b) fallback fires**: not observable at open — needs a turn-end trace during the week.
Housekeeping: reconcile-pass model updates committed (902eb2b, 4 files, +118/−120);
git status clean after. Log entry rides the next push.

## 2026-08-26 · HFDP wish integrated at 902eb2b — invariant 7 re-affirmed owner-wide, gap map corrected at source, Q14 + task #20
One item (20260826-1446, owner verbatim preserved; the file stays in inbox/, id recorded —
contract rule 3). The wish is a RE-AFFIRMATION of invariant 7, extended: instance-shaped
output is a failure on EVERY code-writing surface, ambient included — not a pivot.
Provenance kept split: wish = owner authority; the capture's gap assessment = Claude
analysis, verified before entering the model. Verdicts: gap A ("elicit growth_axes never
executed") REFUTED — essense-flow 0.26.0 shipped the Declared-growth-axes SPEC section +
protocol fire-points (RELEASE-NOTES read; lens amended the capture on disk mid-pass);
gap 2 CONFIRMED — zero named pattern shapes in essense-flow references/ (grep, 0 matches);
gap 3 holds by construction (ambient = injected rule text). Genuinely unbuilt remainder:
the four extensibility CONSUMERS (glossary EXTENSIBILITY.yaml · review lens · verify items
· C sweeps — zero `extensib` matches in essense-flow). Model deltas: vision invariant 7
extended (owner verbatim) · state gap entry + dogfood day-1 legs reconciled · Q14 parked
(consumers into the dissolving pipeline vs surviving path; default: surviving) · tasks:
NEW #20 (named trigger→shape catalog at the design moment), #15 scope expanded to ambient
mechanism, #1 annotated day-1 PASS. Checks: RELEASE-NOTES 0.26.0 read (gap-A refutation) ·
grep "Strategy|Observer|Decorator|Template Method|Factory" over references/ = 0 matches ·
coordinator's `extensib`-absence verification adopted with its source line. status.json:
item integrated, both cursors → 20260826-1446.

## 2026-08-27 · Task #20 BUILT as the standalone `patterns` plugin (0.1.0) — ambient home per owner steer; install blocked on push
Owner GO (inbox 20260827-1406: richer multi-source catalog, examples, paradigm
annotations, singletons honest, "decoupled is always better") + plan-mode pass (Explore
conventions read + adversarial plan review; review REJECTED the YAML-subset parser →
JSON-canonical catalog, runtime-rendered menu, HOME-SIDE gate state, broadened nouns,
Type Object added). Shipped: catalog/patterns.json (41 entries — 15 tier-1 menu / 23
tier-2 / 3 caution; sources gof·hfdp·fowler·posa·msdocs·nystrom·solid, refguru
cross-check only; online sources verified live: Nystrom contents, Fowler eaaCatalog,
MS MVVM doc) · pattern-menu UserPromptSubmit hook (runtime-rendered tier-1 menu, 965
chars ≤ 1100 cap; machine-text + depth + min-chars + verb∧noun gates) · pattern-gate
PreToolUse hook (once per prompt_id, additionalContext only — no permissionDecision, no
exit 2; state ~/.claude/patterns/state/<root-hash>.json, never in-repo) · /patterns
skill · default ON w/ env+project+global opt-outs. Registration: marketplace 2.47.1,
bundle 2.26.1 (also fixed pre-existing description drift: verifiability-lens listed as
hook-carrying, turn-end missing), root README row+section, root CLAUDE.md tree entry.
Checks: tests/patterns.test.js 35/35 · test-all --root 34/34 suites / 1793 checks
(first sweep showed a transient essense-flow red; direct run 54/54 + re-sweep green) ·
registry-check exit 0 · repo-guard exit 0. NOT done: live install smoke — marketplace
source is the GitHub REMOTE (claude plugin marketplace list), so install needs a PUSH
[owner decision]; July capture "installs read the local checkout" REFUTED for the
current setup. Post-ship decision parked: slim/retire global generalize-first.sh vs
accept double injection tax [owner].

## 2026-08-27 · Three items integrated at 902eb2b — patterns landing reconciled, #20 CLOSED as built, Q15 opened, new #22
Items 20260826-1504 (owner steer: ambient home, essense-flow "rarely used", "claude
overall" must abide) + 20260827-1406 (owner GO + richer multi-source catalog, "decoupled
is always better") + 20260827-1440 (Claude-observed turn-end defect). The first two
arrived largely EXECUTED by the same sitting's build; the model catches up. Provenance
split kept: owner words = authority; each capture's analysis = Claude, verified on disk.
- **Owner steer superseded #20's placement BEFORE build** — the built home is the
  standalone ambient `patterns` plugin, not `generativity-protocol.md`; essense-flow will
  CITE the catalog, never own it (#21 leg 4). The same words recorded in Q14 as direct
  evidence for the surviving-path default — Q14 stays OPEN (the consumers half is a
  distinct decision the steer does not close).
- **#20 CLOSED as BUILT:** patterns plugin.json read (0.1.0, standalone, default ON,
  home-side state) · catalog `"id":` count = 41 · marketplace metadata 2.47.1 + bundle
  2.26.1 read. NOT live: both git refs read — local `902eb2b`, origin `e6528e0`, the
  build rides the tree UNCOMMITTED, and the marketplace install source is the GitHub
  remote (measured; the contrary July kb capture corrected on disk, correction capture
  globbed) — so commit + PUSH gate every install → **NEW Q15** (push now + slim
  generalize-first after one live fire is the recommended default) + **NEW #21**
  (go-live: push → install → both-hooks live smoke → Q15 execution → citation lines).
- **Defect item → NEW #22 + parts.md turn-end defect line:** the `session-digest` duty's
  satisfaction check is not plan-mode-aware — demanded a write plan mode forbids, 8+
  wasted nudge cycles in one span. Fix direction (defer vs plan-file-counts) parked for
  owner ratification; substrate-verify the payload's mode field before coding.
- **Model deltas:** state — ship position (uncommitted build, push-gated installs),
  versions (+patterns 0.1.0, marketplace 2.47.1, bundle 2.26.1), generativity gap map
  (gap 1 BUILT pending live, gap 3 half closed, gap 2 the open remainder), +2 known-gaps
  · parts — +patterns section, turn-end defect bullet · questions — Q14 evidence, +Q15 ·
  tasks recomputed 20 → 21 entries (#20 out; #21, #22 in; #15 annotated) · status.json
  +3 integrated, cursors → 20260827-1440 · briefing regenerated LAST.
- Checks this pass: patterns plugin.json read (0.1.0) · catalog id count 41 ·
  marketplace 2.47.1 + bundle 2.26.1 read · both git refs read · correction capture
  globbed on disk · inbox = exactly 3 unintegrated items, files left in place with ids
  recorded (contract rule 3).

## 2026-08-27 · Lens audit on the patterns build — two fixes applied, suite now 37/37
Verifiability-lens deep-read all 13 plugin files + web-verified sources (Fowler quotes
verbatim-correct, all 7 Nystrom chapter attributions correct). Verdict: build real,
incomplete-with-stated-reason (install smoke rides the push). Two escalations FIXED same
sitting: (1) false GoF cites — object-pool (not a GoF pattern) now nystrom+refguru,
registry-dispatch (Registry is Fowler/PoEAA) now fowler; (2) corrupt-catalog fail-open
path had no test seam — PATTERNS_CATALOG_PATH seam added + 2 e2e checks (corrupt +
absent catalog → exit 0, empty stdout, stderr breadcrumb). Check: tests/patterns.test.js
37/37. Third escalation stands as the done-check: on push approval run the 4-step
install smoke before calling 0.1.0 live.

## 2026-08-27 · patterns 0.1.0 PUSHED + INSTALLED + LIVE-VERIFIED (e8b9199 + 463baa4 -> origin)
Owner "push it". Pre-push gates re-run ROOT-scoped — which surfaced that repo-guard had
NEVER scanned the whole repo: the documented toolkit-cwd invocation scans only
plugin-toolkit (cwd trap, test-all's --root class), and this sitting's two earlier
"repo-guard exit 0" records were $?-after-pipe mismeasures. 8 pre-existing findings
(turn-end/steward win32-case-guard doc comments + fixtures, ellipsized shapes, no real
usernames) + 2 in the new patterns suite -> 5 allowlist entries (dated note),
plugin-toolkit 1.10.1, root CLAUDE.md gate row now mandates root cwd + direct exit read.
Gates at push: repo-guard 0 (root, direct) · registry-check 0 · test-all 34/34 / 1795.
Pushed e6528e0..463baa4. Marketplace updated, `claude plugin install patterns` OK
(cache/mk-cc-resources/patterns/0.1.0). LIVE SMOKE: fresh `claude -p --model haiku` in a
scratch dir replied with the menu's first line — the registered UserPromptSubmit hook
fired in a real session; installed pattern-menu.js piped: 965-char menu, exit 0;
installed pattern-gate.js piped: correct additionalContext JSON, exit 0, state file in
the (overridden) state dir, nothing in the project. Remaining: /patterns skill try-out +
gate fire in the owner's interactive session after their next restart. Q15's push half
CLOSED; generalize-first slim/retire half still open.

## 2026-08-27 · Position reconcile at 463baa4 — 4/4 queued inbox items verified already integrated; push/install absorbed into the model
Dispatched to integrate 4 inbox items; the ledger check found all four ids already in
status.json as `integrated` (20260826-1446 at 08-26; 1504/1406/1440 at 20260827-1545),
both cursors at 20260827-1440 — derived-new = 0, files correctly in place per contract
rule 3. NO re-integration, NO status.json write. What HAD moved was the ship: local =
origin = `463baa4` (both refs read; `e8b9199` = the patterns build, `463baa4` = the
repo-guard root-scope catch-up, plugin-toolkit 1.10.1 read from plugin.json). The
session's push outcome entry (above) landed MID-PASS; this recompute reconciled against
it rather than the pass-start snapshot: push-gates recorded (repo-guard 0 root/direct ·
registry-check 0 · test-all 34/34 / 1795), patterns INSTALLED + menu hook live-verified,
prior same-sitting "repo-guard exit 0" records reclassified as $?-after-pipe
mismeasures. Model deltas: state (header, ship position, versions +toolkit 1.10.1, gap
map (1) → LIVE, working tree CLEAN) · parts (patterns header; repo-guard root-cwd +
direct-exit rules) · questions (Q15 push half CLOSED, narrowed to the injection
decision) · tasks (rationale + #21 recomputed to interactive legs) · briefing
regenerated LAST. Checks: both git refs read = 463baa4 · plugin-toolkit plugin.json
read = 1.10.1 · all four inbox ids matched against status.json items[] · log tail
re-read after the mid-pass append.

## 2026-09-04 · prism 0.1.0 BUILT — designed BY its own method (five-lens panel, uncommitted)
Owner: perspective-panel skill directive + "apply that same logic to building what I've
asked" + doubt datum ("I don't think we've built... really doing anything") — all
captured verbatim (inbox 20260904-0405). Five sole-focus lenses dispatched in parallel
on the skill's own design (sustainability, decoupling, performance, extensibility,
simplicity; ~370k agent tokens total, self-bounded). Synthesis rulings (recorded in
plugins/prism/CLAUDE.md): simplicity WON the format fork — one SKILL.md, zero code,
lenses as prose, open set at the LANGUAGE level (asker-named lens = added lens, 0
edits; stronger drop-in test than a JSON entry); kept the two all-five-converged
structures (sole-focus charge + fixed 4-section return contract incl. the overreach
discount channel); economy block in briefs (performance); attribution + delta line as
the anti-graveyard (sustainability's /research autopsy: ceremony + invisible value);
no tests/config/modes/scout/debate — each refused with a named future trigger.
Shipped: plugins/prism/{plugin.json, SKILL.md, CLAUDE.md, README, RELEASE-NOTES};
registered marketplace 2.47.2 + bundle 2.27.0 (prism IS bundled — skill-only) + README
row+section + root CLAUDE.md tree. Checks: registry-check 0 · repo-guard 0 · test-all
34/34 / 1795 (prism correctly NAMED as no-suite unit — informational, per the
simplicity lens's source-verified prediction). NOT pushed — owner gate. Acceptance
criterion per sustainability lens: owner invokes /prism again unprompted.

## 2026-09-04 · prism 0.1.0 SHIPPED (2ffa2d0 -> origin) + a settings-level root cause found and fixed
Owner "@ship it". Pre-ship: all checklist items already landed at build; commit 2ffa2d0
(25 files incl. steward model recompute); post-commit gates on TRACKED files:
repo-guard 0 (root, direct) · registry-check 0. Pushed 463baa4..2ffa2d0, origin == local.
Install first FAILED — "marketplace mk-cc-resources not found": the settings declaration
(extraKnownMarketplaces) carried an INVALID field — a github source with an ABSOLUTE
LOCAL `path` (schema: path = repo-relative marketplace.json location). That bogus field
also explains the July/August install-behavior flip-flop (July "reads local checkout",
August "reads remote"): the mixed declaration was interpreted differently across CC
versions until it stopped loading entirely. Fixed: path field removed (default
.claude-plugin/marketplace.json), settings.json re-validated (JSON parse OK), marketplace
update OK, `claude plugin install prism` OK (cache prism/0.1.0, SKILL.md present,
settings now enable prism@mk-cc-resources). Remaining: owner /reload-plugins or restart
-> /prism live; first real panel run = the acceptance criterion.

## 2026-09-04 · CORRECTION to the ship entry's causal story (recall surfaced the July capture)
The July->August install flip was NOT caused by the invalid path field "degrading
across versions" — .claude/kb/captures/20260727-0730 records it was an OWNER DECISION
the same day ("i wanna push an update to me marketplace, update from there"): file
source re-pointed to github on 2026-07-27. My 08-27 capture guessed "either re-added or
different mechanism" when the July capture already knew — a recall failure, now caught
by turn-end recall. Revised story: the absolute `path` in extraKnownMarketplaces is
RESIDUE of that July migration (the old file-source path pasted into the github
declaration); it explains only TODAY'S "marketplace not found" (a CC update apparently
began rejecting the invalid combo) — not the July/August transition. The fix stands;
only the causal narrative shrinks.

## 2026-09-06 · AUDIT 2 — every plugin reviewed, five projects measured, ranked plan filed (owner decides)
Owner asked for a review of kb, steward, the lens, thorough-mode, every hook, the glossary and
the harness, plus how they were used in other sessions and how to improve them (inbox 1236).
Method: five background agents (transcript scan over 269 session files with a reproducible
script; on-disk state of 5 ships + 6 secondary roots; code reviews of kb, steward+turn-end,
and the whole injection stack incl. lens/thorough/patterns/glossary), plus one session-run
judge-child probe. Deliverables: capture
.claude/kb/captures/20260906-1340-second-usage-audit-five-projects-measured.md (every number,
file:line) and inbox 20260906-1345 (ranked plan: Tier 1 ten S items, Tier 2 seven M items,
Tier 3 owner decisions, cross-ship chores). Headline measured facts: 235/269 session files are
headless judges each paying the whole harness; judge 33.0 s default vs 3.9 s with
--setting-sources "" (OAuth intact, hooks silent) — startup, not inference; kb-hints 84%
ignored; per-prompt tax avg 6.3 KB p95 20.5 KB and RISING after 08-23 while pull fell to ~0;
platform stubs hook output >10 KB to a 2 KB preview (53x kb-pull, 1x turn-end tail today);
briefing prose contradicted by the log in 4/5 ships; give-up path looped to the platform's
9-block cap; self-check gamed by "Check: none" and blind to Bash edits. Three dogfood datums
measured live this sitting (inbox 1250). Cleanup: ~/.claude/steward/fleet.json restored to the
5 real ships (a probe + an old test leak had added 3 entries). Checks: 5 suites read by the
agents (kb 526/526, turn-end 146/146, steward 40+13, thorough 21/21, patterns 37/37,
statusline 20/20); judge probe numbers from three claude -p runs in a scratch project. NOT
done: no plugin code changed; no push; steward integrate pass + lens pass dispatched at
wrap-up (outcome in the next entry).

## 2026-09-06 · Five items integrated at 2ffa2d0 — audit 2 absorbed, the 09-04 doubt answered by measurement, Tier 1 → #23–#28, Q16/Q17 opened
Steward pass (HEAD snapshot 2ffa2d0; tree carried only log.md). Ledger check first: of the
9 top-level inbox files, 4 were already recorded (0826-1446, 0826-1504, 0827-1406,
0827-1440) — NOT re-integrated; the 5 unrecorded ones are integrated here: 0827-1615
(steward-sync counter ignores the ledger), 0904-0405 (panel skill directive + doubt),
0906-1236 (owner review request), 0906-1250 (three turn-end tail datums), 0906-1345
(ranked plan — Claude's proposal, recorded as such; nothing decided). Model moves:
vision — audit-2 reading in the active thrust (model-keeping works; injecting unread;
browse skills + pipeline unused), the measured 10 KB platform bound on invariant 5, prism's
language-level lens axis; state — full recompute (prism shipped + installed via the
settings fix; audit-2 verdicts beside the 08-23 ones; the judge-startup finding 33.0 s →
3.9 s; three PLATFORM INVARIANTS; dogfood legs a/c lies filed + root-caused, leg b BLOCKED
on the untraced `engine`); parts — turn-end/steward/kb gap maps with file:line (✓ marks =
re-read this pass: context-recall.js:287, hooks/scripts/turn-end.js:161, context.js:218,
runner.js:37/98/190, claude-p.js:112-113, steward-sync.js:45, steward-brief.js:63-67/151/
256, self-check.js:78/109-120), prism section NEW, stale "steward-sync never observed
firing" corrected, lens "CLOSED" drift re-opened on the audit's claim, two cross-reference
rules added (retired hooks leave; one machine-text guard); questions — Q15 measured (five
surfaces, 1,645 B / 1,788 B standing) + option (c) fold, Q16 zero-setup memory (default b:
one keystroke), Q17 retire/keep four dormant surfaces (fold/archive/freeze/gate defaults),
Q11 + Q9 resolved entries carry their new numbers, two EXECUTED directives ledgered; tasks —
#23 (cheap judge + readable tail + honest trace) leads, #22 rewritten as the generic
wrong-check class, #24 counters ledger-joined, #25 one machine-text guard, #26 test hygiene
+ dead weight, #27 kb-pull under 10 KB, #8 rewritten as compute-what-drifts, #28 self-check
un-gameable, #11 RE-PARKED, #21 behind Tier 2, per-ship chores under #12, plan items
14–17 folded into #13/#17. Checks: every version/file:line claim written was read once
(listed above); prism 0.1.0 + marketplace 2.47.2 + bundle 2.27.0 read from disk. Ledger:
5 items appended, cursors → 20260906-1345. Briefing regenerated LAST.
Lens pass (same sitting) over the capture + plan: 22/22 citations verified, numbers reproduce;
five escalations accepted and filed as inbox 20260906-1405 (essense-flow/autopilot hooks
omitted; judge-flag quality leg unmeasured + undocumented mechanism; background_tasks not a
documented field; owner-voice split; items 2/4 vs recorded runner decisions). Errata appended
to the capture. Steward pass still running at this line.

## 2026-09-06 · #23 + #22 + #24 BUILT (turn-end 0.7.0-pending, steward 0.5.1-pending) — owner delegated: "decide… my vision is applied and works"
#23/#22 turn-end: judge child spawned LEAN (`--setting-sources ""` + `--disable-slash-commands`
+ `--strict-mcp-config`), fail-open retry without lean args on an argument-class failure
(never on a timeout), verdict carries `lean` / `durationMs` / `costUsd`; exhaustion note
emitted ONCE at the budget line then silent (lens correction 5, not the plan's "silent
always"); DEFERRAL primitive — a duty may return a named reason from `defer()`; shared
predicates in lib/deferral.js (agents in flight, plan mode); request-closure + quality-lens
defer while agents run, session-digest also under plan mode; agents-in-flight derived from
the TRANSCRIPT (launch tool_use id ↔ `<tool-use-id>` in the completion notice — shape read
from this sitting's own transcript), `background_tasks` honoured if ever present, never
required; tail renders DEMANDS first, then errors, then material, whole tail hard-capped at
9,000 chars with the BRIEF (pointer) form substituted and named; session-scoped
`sessionSupplied` memory — a note already handed over this sitting returns as one pointer
line; trace now carries engine / ms / costUsd / lean / deferred / errors / satisfied_by /
agents_in_flight / emitted_chars / payload_keys / permission_mode; errored duties never
silent; session-digest satisfied against the REQUEST's own timestamp, not first-fire time.
Suite hygiene: E2E fixtures disable context-recall (no real judge spawn); exe test SKIPS by
name without a binary. Check: turn-end suite 170/170 in ~1 s (was 146 in 43 s); replay of
the 08-27 9-fire shape → advise, block, block, give-up, silence. #24 counters: brief
`inbox:` line, `[instr] items`, fleet table and turn-end steward-sync all derive from
status.json (turn-end's own port of the predicate); `[instr]` adds `(oldest Nd)`; fleet
dedupe case-insensitive. Check: on this repo all readers print 3 (ledger newIds = the three
post-pass items); steward suites 45/45 + 13/13. OUTSTANDING for #23: the recall-quality
replay (lean vs plain, 10 real turns) is running in the background; result lands below.
Plugin code changed, NOT pushed, versions not yet bumped.

## 2026-09-06 · #25 BUILT — one canonical machine-text guard, drift-tested; kb-pull stands down in judge children
Six markers (`[SYSTEM NOTIFICATION`, `<task-notification>`, `Stop hook feedback:`,
`<local-command` prefix, `<command-name>`, `<system-reminder>`) now identical in
thorough-mode, pattern-menu, kb-pull, turn-end context.js AND the two home hooks
(verification-rules.js gained a guard it never had — it fired 378× across 212 human prompts;
generalize-first.sh gained `<system-reminder>`). kb-pull stands down on `MK_TURN_END_DEPTH`
(pattern-menu precedent). New repo-guard detector `machine-guard-drift` (plugin-toolkit):
finds every `MACHINE_TEXT_MARKERS`/`MACHINE_PREFIXES` declaration in tracked .js and blocks
when copies differ (holds no canonical of its own — the invariant is sameness). Checks:
kb-pull 51/51 · patterns 37/37 · thorough-mode 21/21 · turn-end 170/170 · repo-guard live
from root: exit 0, 4 detectors ran (first run caught my own test fixture — fixture now
assembles the constant name at runtime); home probes: machine-prompt → 0 B from both home
hooks, human `++` prompt → 786 B unchanged. Caveman's tracker (third-party) still has no
guard — 121 B/prompt, not ours to edit.

## 2026-09-06 · #26 BUILT + GATES GREEN — test hygiene, dead weight gone, seven plugins bumped (not pushed)
Deleted: kb-scribe-stop.js + its 42-check suite (retired 0.9.0, "kept one release", shipped
three), lens verifiability-stop.{js,sh} + its 39-check suite (tested only the dead hook) —
replaced by tests/verifiability-lens.test.js (33 contract checks over agent/rubric/profile/
presets/metadata/no-hook); relic .claude/kb/scribe-state.json + .claude/verifiability-lens/
state.json in this repo; the unreferenced ~/.claude/hooks/thorough-mode.js (April copy).
Migrated this repo's dead `.claude/kb.json scribe.focus` (6 bullets, no consumer) into
`.claude/turn-end.json` duties.session-digest.important — the consumer that exists. Home
hygiene: ~/.claude/kb/cued.json 84 → 5 real roots; 4,458 leftover test dirs removed from
%TEMP% (kb-* 4,207, steward-* 249, patterns-* 2; all older than 60 min); kb-session suite now
pins a fake HOME (the source of the 79 temp roots); turn-end E2E fixtures disable recall (no
real judge spawn, 43 s → 1 s). Docs: lens CLAUDE.md/README/plugin.json/agent.md no longer
describe a live Stop hook; kb CLAUDE.md/README say two hooks + DELETED scribe; turn-end
README/CLAUDE.md 170 checks; steward README 45+13 checks, ≤6-line briefing. Versions:
turn-end 0.7.0 · steward 0.5.1 · kb 0.12.0 · patterns 0.1.1 · thorough-mode 1.11.2 ·
verifiability-lens 0.5.1 · plugin-toolkit 1.11.0 — plugin.json + marketplace.json (metadata
2.47.2 unchanged) + RELEASE-NOTES entries + root README rows. GATES (root cwd, direct exit
reads): test-all --root 33/33 suites / 1,783 checks · registry-check exit 0 (6 "worth a
decision" rows, pre-existing) · repo-guard exit 0, 4 detectors ran. Working tree: ~40 files
modified, 5 deleted, 3 added — NOT committed, NOT pushed (owner's call).

## 2026-09-06 · Tier-1 item 1b (lens-restored) BUILT — pipeline hooks stand down cheaply everywhere
essense-flow 0.26.2: context-inject + next-step test `.pipeline/` before importing lib/state.js
+ js-yaml (same predicate as readState's pipeline_present). essense-autopilot 0.4.1: js-yaml
lazy after the pipeline walk; hooks.json calls node directly (bash wrapper gone). Measured
best-of-3 in a non-pipeline repo: context-inject 154 → 105 ms, next-step 129 → 104 ms,
autopilot 125 (+197 wrapper) → 99 ms. Suites: essense-flow hooks 11/11, autopilot 44/44;
autopilot fixture with .pipeline still halts correctly. Judge probes (5 + 3 runs, one real
8.8 KB prompt): api_ms ≈ wall — the child DELIBERATES 2.1–4.0k output tokens for a ~600-char
JSON verdict; `--effort low` 2,138 tokens / 25.8 s; same config twice → different picks
(plain-vs-plain and lean-vs-lean). claude-p.js header corrected: lean buys no-boot + −36% cost
+ no state pollution, NOT speed on real prompts; the 60 s budget is overrun by deliberation.
Probe 2 (same prompt): `--effort low` 2,138 → 5,893 output tokens on two identical runs
(25.8 s → 56.9 s); `--effort medium` 8,853 tokens / 95.8 s — past the judge's own 60 s
budget. Every same-config pair picked DIFFERENT notes. Filed as a Q11 datum (inbox
20260906-1700) with five open options + the check each needs. Owner decides.

## 2026-09-06 · SHIPPED — bc39fe0 pushed (2ffa2d0..bc39fe0), nine plugins + marketplace 2.48.0
Owner "@ship it". Pre-ship checklist: README rows (9), RELEASE-NOTES (9), plugin.json +
marketplace (metadata 2.47.2 → 2.48.0), root CLAUDE.md tree (5 entries) + plugin CLAUDE.md
(turn-end, steward, plugin-toolkit, essense-flow, kb, lens), no new commands; gates at push
from root with direct exit reads: test-all 33/33 / 1,783 · registry-check 0 · repo-guard 0
(4 detectors). Leak grep: only the pre-existing author-name field. Commit carries no
attribution trailer (owner rule). 75 files: +2,1xx/−5xx, 5 deletions, 3 new. Post-push
install: see the next entry for measured versions. Known stale at push: briefing.md still
says "33 s → 3.9 s" under Next — superseded by inbox 20260906-1700; the ⚠ line flags 4
newer events; corrected at the next steward pass (this sitting's one pass is spent).
Post-push install (measured from installed_plugins.json + cache reads): turn-end 0.7.0 ·
steward 0.5.1 · kb 0.12.0 · patterns 0.1.1 · thorough-mode 1.11.2 · verifiability-lens
0.5.1 · plugin-toolkit 1.11.0 · essense-flow 0.26.2 · essense-autopilot 0.4.1; cache
carries the new code (LEAN_ARGS, lib/deferral.js, kb isChildSession, lens scripts dir
gone, steward status.derive). Live in the NEXT session — the running one still executes
the pre-ship hooks. First live legs to watch: a real Stop trace line with `engine`, `ms`,
`lean`, `deferred`, `payload_keys`; a tail under 9,000 chars with demands first; no
kb-pull fire inside a judge child; `[instr] items: N new (oldest Nd)`.

## 2026-09-08 · Harness research + plan — `design/harness.md` (owner asked; nothing decided)

Owner asked what a harness is, whether this toolkit is one, how others build them, and for a plan
covering memory / context / pushing work / verifying work (inbox `20260908-1748-…`). Four background
agents (Anthropic canon · other builders · Claude Code primitives · internal inventory) + session-side
verification (hooks doc: 33 events; SDK reference: `query()`/`hooks`/`canUseTool`/`maxBudgetUsd`; loops
post: turn/goal/time/proactive; `/goal` = session-scoped prompt Stop hook). Deliverable:
`design/harness.md` (8,966 words): definitions (3 Anthropic, verbatim), the four-layer model (Claude Code
IS the harness; this repo is a harness LAYER — "harness design" in Anthropic's 2026 sense), ten-component
table with measured status, other-builders mechanisms + disagreements, verified platform surface, gap
table G1–G13 each with a closing mechanism and a named check, target contract per axis (open base +
drop-in surface), five-phase plan mapped onto #27 #28 #8 #13 #3 and Q15–Q17, owner decisions.
Two live findings on the way: (1) this process (PID 34664, started 09-06 12:32) predates the 0.7.0
install (15:15) → all traces since the ship are 0.6.0 (`grep -c '"deferred"' trace.jsonl` = 0/127);
`/clear` does not reload plugins; "installed ≠ running" is invisible from disk → G1. (2) context-recall's
"did not use" detector is blind to Bash reads (re-served the audit capture read via `head -c`) → G2's
shared file-touch extractor. Dead end: the primitives agent's `new Agent()` SDK shape — refuted by the
TypeScript reference; discarded.
**Check:** file:line citations in the doc re-read from source this sitting (`runner.js:37-38,53,283`,
`duties/index.js:59`, `self-check.js:53-55,119-120`, `kb-pull.js:50-51`, `steward-brief.js:171`,
`pattern-gate.js:19-20`); hook events registered across `plugins/*/hooks/hooks.json` = SessionStart 3 ·
UserPromptSubmit 5 · PreToolUse 2 · Stop 4 · Notification 1 (no PostToolUse/PreCompact/SessionEnd/
SubagentStop), matching §4/§5. No code changed; suites not run (nothing to run).

## 2026-09-08 · Five items integrated at bc39fe0 — Tier 1 CLOSED as built (live proof pending a restart), the judge datum re-opens recall as Q20, harness plan → #29–#36 + Q18/Q19, #13 deleted
Items (all five had no ledger id; the nine earlier top-level files were already recorded):
lens corrections `1405` (silent drops restored — 1b BUILT; items 18 → #15, 19 half-built at
#24 / rest → #8, 20 → #17, 21 → #8, 22 → #35; the amended recall-quality check → Q20; the
ranking-key split recorded as provenance) · owner prism question `1500` (answered by Claude:
no panel for plumbing, panel for the push-side fork AFTER a baseline — the run is #17 step 0;
scorecard → #31; the "ships with its metric" rule → vision as Claude's proposal, Q18
ratifies) · owner delegation `1520` (EXECUTED: #22 #23 #24 #25 #26 + 1b built and SHIPPED
`bc39fe0` — DELETED from tasks as closed; live legs → #1(e)) · judge datum `1700`
(SUPERSEDES "slow from startup" in state.md, parts.md and the Q11 ledger paragraph → Q20;
the 1345 plan's speed claim is superseded in the model text, its ledger status unchanged) ·
harness request `1748` (`design/harness.md`: harness-LAYER frame + proposed rule → vision;
G1→#29, G2→#28, G3→#32, G4→#30, G5→#31 (absorbs #13, DELETED), G6=#27, G7=#17/Q15, G8→#33,
G9→#34, G10→#35, G11=Q16, G12=Q17/#3, G13→#36; §9 → Q18 goal scope, Q19 strictness + deny;
the two live findings → state.md G1 section + #28). Snapshot HEAD `bc39fe0` (ref file read);
the tree did not move mid-pass. Ledger `at` stamps are approximate to the hour (the agent has
no clock).
**Check:** all 16 `plugins/*/.claude-plugin/plugin.json` versions grep-read = the ship
entry's list; marketplace 2.48.0 / bundle 2.27.0 read; `lib/deferral.js` present and
kb/lens `*-stop.{js,sh}` absent (glob); `"deferred"` in `.claude/turn-end/trace.jsonl` = 0
of 128 lines (G1 persists at pass time); PostToolUse/PreCompact/PostCompact/SubagentStart/
SubagentStop/SessionEnd over `plugins/*/hooks/hooks.json` = 0 matches. No code touched; no
suites run (model-only pass).
Lens pass (same sitting, verifiability-lens): 54 claims verified, 1 refuted (a blog slug), completeness
COMPLETE; 5 escalations applied to the doc — (1) G3's "prompt-hook evaluator" was a second blocking Stop
hook (invariant 9) → prose done-checks go through a turn-end JUDGE inside the one tail; (2) "PreToolUse
deny" contradicted invariant 8 → settings-level `permissions.deny`, never a hook; (3) `/goal` starts
idle check-in turns on its own (docs: up to 3 per goal, first at 30 min) → invariant-1 conflict noted in
§4/§7.3, owner decision §9.5, default excluded; (4) G2's recorder must register PostToolUseFailure too
(PostToolUse fires only on success) and capture real payload fixtures before parsing; (5) evidence base
ephemeral → `.claude/kb/captures/20260908-1830-harness-research-sources.md`. Auto-resolved: errata
stub counts (51+2), Phase 0 restart marked [needs owner], G12 check reads BLOCKING registrations = 1.

## 2026-09-09 · #29 BUILT — running ≠ installed instrument (turn-end 0.7.1, steward 0.5.2) · Q15 slim applied · rulings Q18/Q19/Q16/Q15 recorded

Owner rulings via one-keystroke panel (inbox `20260909-0015-…`): Q19 done = ran-and-observed · Q18 goal duty arms every task I start · Q16 KEEP THE CUE · Q15 SLIM ONLY. Owner law (inbox `20260909-0010-…`): never point the owner to files; content in-environment; least clicks.
**#29 built.** `plugins/turn-end/lib/installed.js` (new, fail-soft): running version = manifest beside the executing script; installed = `~/.claude/plugins/installed_plugins.json` entry for the same plugin name (user scope preferred, newest wins). turn-end.js: `version` + `stale` on every trace line; a stale process PREPENDS one line to the tail it already emits. steward-brief.js: third instrument `instrRunning` (own copy — cross-plugin duplication deliberate). Versions: turn-end 0.7.0 → 0.7.1, steward 0.5.1 → 0.5.2 (manifest, marketplace row + description, RELEASE-NOTES, plugin CLAUDE.md, README table rows).
**Q15 slim applied** to `~/.claude/CLAUDE.md` (backup `CLAUDE.md.pre-slim-20260909.md`): Generalize-First Gate 1,788 B → ~640 B (the five steps live in the `generalize-first` hook, one-line summary + anti-signals stay), the `++` augment restatement dropped (hook-injected twice already). 6,528 → 5,228 B. Hooks untouched per the ruling.
**Checks:** `node plugins/turn-end/tests/turn-end.test.js` → 175/175 (+5: stale / equal / absent / malformed / scope preference; `withStaleNote` both emission shapes; E2E trace line = manifest version) · `node plugins/steward/tests/steward-brief.test.js` → 50/50 (+5) · `status.test.js` 13/13 · registry-check exit 0 (after README rows) · repo-guard exit 0 (4 detectors) · test-all `--root .` 33/33 · 1,793 checks on the third run — the first two runs reported essense-flow `test/run-all.cjs` exit 1 while the same suite run directly passes (54/0): INTERMITTENT under the sweep, untouched by this work, datum for #9-class adjudication. **Live probes against the REAL ledger:** steward hook from the repo → `[instr] running steward 0.5.2 ≠ installed 0.5.1 (installed 2026-09-06) — restart Claude Code to load it`; turn-end hook from the repo on the suite's self-check fixture → tail's first line `[turn-end] running turn-end 0.7.1 ≠ installed 0.7.0 (installed 2026-09-06) — …`, trace `{version:'0.7.1', stale:true, action:'advise'}`; pre-bump the same probe traced `{version:'0.7.0', stale:false}` with no prefix. Dead end on the way: three silent probes were my Bash quoting (`'\\t.jsonl'` → a TAB before Node), not the hook — forward slash works.
Not pushed, not committed. Next: #27.

## 2026-09-09 · #27 BUILT — kb-pull under the platform bound, not repetitive (kb 0.13.0)

Owner ruling context: Q15 slim-only left the hooks in place; #27 is the kb-pull half of the push-side economics. Built: `lib/pull-state.js` (home-side `~/.claude/kb/pull-state/<root-hash>.json`, session-scoped, presence-gated, `KB_PULL_STATE_DIR` test override); kb-pull.js — whole output within `PLATFORM_INLINE_BOUND_BYTES = 8192` (measured: the smallest hook output the platform ever stubbed was 9.9 KB, three times; 10 KB once), digest cut on a line boundary with a marker naming the platform, per-session hint dedupe + `(+N more above the floor (k already hinted this session) — kb_query "<terms>")` cue, unchanged digest → one pointer line, malformed `.claude/kb.json` → one visible line + digest still injected, trace carries `session_id/prompt_id/held/scores/digest mode/bytes`; kb-session-start clears the digest hash on every fire (compaction throws the transcript copy away); ranker: body-repeat bonus routed to the body side (the floor leak, `term-overlap.js`). Versions: kb 0.12.0 → 0.13.0 (manifest + description, marketplace row + description, README row, RELEASE-NOTES, kb + root CLAUDE.md).
**Checks:** kb suites — kb 276/276 (+3 floor-leak) · kb-pull 88/88 (+37: bound cut, dedupe, cue, pointer, session scoping, no-session_id = never suppress, malformed config, trace fields, state in the suite-private dir) · kb-footprint 31/31 (new writer audited with its why) · kb-session 78 · status-join 9 · mcp 44 · registry-check exit 0 · repo-guard exit 0 · test-all `--root .` 33/33 · 1,835 checks (was 1,793). **Live probe** on a fixture carrying THIS repo's real 11,353 B digest + two real captures, one session, same prompt ×3: fire 1 = 8,110 B (`digest: cut`, 3 hints), fires 2–3 = 324 B (`digest: pointer`, `held: 3`, cue present). Meaning: the session digest of this very sitting was past the bound all evening — stubbed unread — and now reads. Dead end: a bash-quoting failure (apostrophe inside a single-quoted node script) aborted one doc patch before anything ran; redone as a heredoc.
Not pushed, not committed. Next: #28 (ground-truth self-check + shared file-touch extractor; Q19 = ran-and-observed).

## 2026-09-09 · #28 BUILT — ground truth: file-touch, named-check floor, modality asks, exec-result recorder (turn-end 0.8.0) · PHASE 0 COMPLETE (#29 → #27 → #28)

Owner ruling Q19 (ran-and-observed) applied. Built: `lib/file-touch.js` (ONE extractor: tool targets + Bash/PowerShell argv → mutations `sed -i`/`>`/`>>`/`tee`/heredoc/`cp`-`mv` dest/`touch`; reads `cat`/`head`/`tail`/`sed -n`/`grep FILE`; pure, conservative — flags/vars/globs/devices never files; sed's script arg and a bare `>>` were the two parsing bugs the suite caught). self-check: mutations via file-touch (Bash edits count); named-check FLOOR (`namedCheckAnchored`: ratio, touched basename, or a command head the turn ran; "Check: none" is a confession); MODALITIES registry (prose re-read / scene look / code run); `requireGreen` knob reads the recorder ledger (default off). context-recall: `dropAlreadyRead` drops notes at paths the turn opened (Read OR Bash), judge prompt lists "FILES THIS TURN OPENED", trace carries `alreadyRead`. New hook pair PostToolUse + PostToolUseFailure on `Bash|PowerShell` → `hooks/scripts/tool-record.js` → `.claude/turn-end/checks.jsonl` + one real payload per event under `samples/` (fixtures first, per the lens's escalation 4; `tool_response` for Bash is undocumented — keys recorded, exit parsed best-effort, null never guessed); footprint only where turn-end keeps state; stands down in judge children. Item 4 (`startedAt` from the transcript) was already live since 0.7.0 (`session-digest.js:132`) — not rebuilt. Versions: turn-end 0.7.1 → 0.8.0 (manifest, marketplace row + description, README row, RELEASE-NOTES, turn-end + root CLAUDE.md).
**Checks:** `node plugins/turn-end/tests/turn-end.test.js` → 189/189 (+14: file-touch ×4, self-check Bash/floor/modality/requireGreen ×6, recall drop ×1, tool-record unit + E2E ×2 — E2E asserts ledger lines, per-event samples, truncated bodies, no footprint without state, judge-child silence) · registry-check exit 0 · repo-guard exit 0 · test-all `--root .` 33/33 · 1,849 checks (was 1,835). **Live through the real hook** (temp project, `sed -i` edit of parser.js in the transcript): final message "Check: none" → nudged; "verified by inspection" → nudged; "Check: node tests/parser.test.js → 12/12" → silent allow; "Check: re-read parser.js against the ask; result: matches" → silent allow. The recorder's real-payload fixtures land on the first Bash call after the owner restarts (hooks register at process start).
**Sitting total (2026-09-08/09):** research + plan (`design/harness.md`), rulings Q18/Q19/Q16/Q15, owner law "no pointers, least clicks", Q15 slim (global CLAUDE.md −1,300 B), #29 (turn-end 0.7.1 + steward 0.5.2), #27 (kb 0.13.0), #28 (turn-end 0.8.0). Tree: 4 plugins bumped, ~30 files changed, NOT committed, NOT pushed. Next: #30 trace schema v1 + lens telemetry → #31 harness-stats. Standing datum: essense-flow suite intermittent under the sweep (red 2 of 5 runs tonight, green direct) — #9-class.

## 2026-09-09 · SHIPPED `bc39fe0..68ce999` — turn-end 0.8.0 · kb 0.13.0 · steward 0.5.2 · harness plan + model (owner: "Yes, ship it")

Four commits (turn-end / kb / steward / docs+model), pushed to origin main; `claude plugin marketplace update` refreshed; `claude plugin update` → turn-end 0.7.0→0.8.0, kb 0.12.0→0.13.0, steward 0.5.1→0.5.2, all at `68ce999` (installed_plugins.json read after the update). Gates at ship: test-all 33/33 · 1,849 checks, registry-check 0, repo-guard 0 (incl. the five new files, once tracked). Not yet live: the owner's process must restart; the first trace line after restart should carry `"version":"0.8.0"` and no stale prefix, and the first Bash call writes `.claude/turn-end/samples/PostToolUse.json` (the recorder's real fixture) — that is the live check for the next sitting. Reminder from the 08-27 capture held true: installs read the GitHub remote, so the push was load-bearing, not ceremony.

## 2026-09-09 · Three items + the sitting's four outcomes integrated at 68ce999 — Phase 0 CLOSED (#29 #27 #28 → #1f), Q15/Q16/Q18/Q19 law, owner law → invariant 13, two axes → #37/#38 + Q21/Q22

Steward integrate pass (owner present, new sitting). Inbox: `20260908-1905` two-more-axes (owner
wish → vision frame + invariants 4/7 extended verbatim; harness §7.7/§7.8 = G14/G15 → tasks #37
code-design duty + `@ship` design gate, #38 knowledge lifecycle + garden job, Phase 4b; §9.6/§9.7
→ Q21 who may mark knowledge wrong (default proposal-only), Q22 design-duty severity (default
advise, block at `@ship`)); `20260909-0010` owner law no pointers / in-environment / least clicks
→ vision invariant 13 (sharpens 2 + 6) + the questions.md surfacing rule; `20260909-0015` four
rulings → resolved ledger verbatim: Q19 ran-and-observed (#28 ledger leg = `requireGreen` off),
Q18 every task arms the goal duty + the metric rule RATIFIED → invariant 12 (#32 UNBLOCKED),
Q16 KEEP THE CUE (closed, no change; #18's on-ramp = hand-seeding), Q15 SLIM ONLY (#17's
registry-fold leg struck; #21 step 2 done). Log outcomes reconciled: #29 #27 #28 BUILT + SHIPPED
`bc39fe0..68ce999` → CLOSED, deleted from tasks.md; their live legs fold into #1(f). Cascade:
state.md rewritten (ship 68ce999, versions, G1 now instrumented, Phase 0 closure, hook coverage
+PostToolUse pair, gap list); parts.md turn-end 0.8.0 / kb 0.13.0 / steward 0.5.2 bullets + gap
maps reconciled (self-check gameable, recall Bash-blind, kb-pull uncapped, install-instrument
claim → CLOSED); tasks.md recomputed (order #30 → #31 → #1 → #32 → #8 → #17 → #33 → #35 → #34
→ #36 → #37 → #38 → rest; every mechanism task now names its metric key); #9 gains the 09-09
intermittent datum. Snapshot HEAD `68ce999` (ref file read); the tree did not move mid-pass.
Ledger `at` stamps approximate to the hour (the agent has no clock).
**Check:** `installed_plugins.json` read — turn-end 0.8.0 / kb 0.13.0 / steward 0.5.2 each at
`gitCommitSha` 68ce999… (installed == HEAD); all 16 `plugins/*/.claude-plugin/plugin.json`
versions grep-read = the ship list; turn-end `hooks/hooks.json` registers PostToolUse +
PostToolUseFailure (grep); `.claude/turn-end/trace.jsonl` = 138 lines, `"version"` /
`"stale"` = 0 occurrences, `samples/` absent (glob) → running process predates the update,
recorded as PENDING not claimed; `design/harness.md` §7.7 (l.491), §7.8 (l.520), G14/G15
(l.428-429), §9.1–9.7 (l.612-631) read for #37/#38/Q21/Q22; the global CLAUDE.md gate as
injected this session is the slimmed one-line + anti-signals form (Q15 applied). No code
touched; no suites run (model-only pass).

## 2026-09-09 · Arrival check after the Phase 0 ship (task #1 legs f + e) — process is NEW; recorder fixtures real; stale leg deferred to this sitting's first Stop

Kickoff `prompts/prompt-2026-09-09T00-10-06Z.md`, step 0. Session `2da1777e` (the previous one was
`5e8e08b4`, ledger.json) — a fresh process. Legs: (2) `[instr]` at open = `git: main @ a5988ac` only,
NO running≠installed line — `steward-brief.js:201` prints it only on mismatch, so absence = equal
(steward 0.5.2 running); (3) the RECORDER is live in this process (0.8.0-only hook pair):
`samples/PostToolUse.json` written on the first Bash call, `checks.jsonl` lines carry kind/exit/
payload_keys/response_keys; forced `node -e "process.exit(3)"` → `samples/PostToolUseFailure.json`
+ a line with `exit: 3, ok: false` parsed from `error: "Exit code 3"`. FIXTURE SHAPE (was
undocumented): PostToolUse `tool_response` for Bash = `{stdout, stderr, interrupted, isImage,
noOutputExpected}` — NO exit field, so `exit: null, ok: true` on success is the platform's truth,
not a parser gap; PostToolUseFailure has no `tool_response` at all, `error` + `is_interrupt` +
`duration_ms` instead. (4) kb-pull on the first prompt: hints + digest inline, NOT stubbed; digest
in `cut` mode ("dropped 15 lines / 8223 chars" — the 14 KB digest itself needs compressing, done
this sitting). (1) the first Stop trace line of THIS session cannot be observed before this turn
ends — the previous session's last line (00:25Z) still lacked `version` (pre-0.7.1 code) — and (5)
the tail size: both read at the next prompt. No failed leg → no inbox item.
**Check:** `.claude/turn-end/samples/` ls = 2 files; `checks.jsonl` grep `process.exit(3)` → one
line, `"exit":3`; `trace.jsonl` grep `2da1777e` = 0 (no Stop yet); `installed_plugins.json` =
turn-end 0.8.0 / kb 0.13.0 / steward 0.5.2 / lens 0.5.1 / toolkit 1.11.0.

## 2026-09-09 · #30 BUILT — trace schema v1 across turn-end / kb / lens + the drift suite + acted-on derivation; SubagentStop payload MEASURED live

Contract: `plugins/plugin-toolkit/references/trace-schema-v1.md` + validator
`lib/metrics/trace-schema.js` (required t/plugin/version/session_id/prompt_id/ms/decision/bytes,
exactly one kind key hook|duty|agent|tool, optional cost_usd/engine/acted_on; legacy = no
`plugin` key, never malformed). Ownership: each plugin keeps its OWN pure `lib/trace-line.js`
exporting builders + `examples()`; `tests/trace-schema.test.js` discovers every sibling writer BY
SHAPE and validates every example, plus the negative (minus `decision` → fails). turn-end 0.9.0:
hook line (0.7.x shape kept + v1 keys), one `duty:<id>` line per supply duty with engine / ms /
cost_usd / surfaced / index_size / judge_chosen / ranker_top (the ranker now runs on every recall
fire — Q20 agreement computable from disk), `duty:acted-on` once per closed owner span at the next
genuine prompt (`context.js` turn.previous with timestamps, kb_read ids, prompt ids — a wake is the
same span; `lib/acted-on.js` reads sibling traces read-only; ledger `actedOnUpTo`). kb 0.14.0:
kb-pull / kb-session-start / MCP tool lines through `lib/trace-line.js` (kb-pull keyed
`hook: kb-pull`, was `tool: kb-pull-hook`; MCP lines null ids by construction). lens 0.6.0: a
SubagentStop RECORDER (`hooks/scripts/lens-record.js`, matcher `verifiability-lens$` — real
dispatches carry the plugin-scoped type, 81 transcripts) → one line per dispatch from the payload's
`last_assistant_message` (rollup a/b/u, escalations, auto_resolved, suppressed, verified/refuted,
completeness; null when unstated) + duration/model/tokens from `agent_transcript_path`; the agent
def now states `verification: {verified, refuted, unverifiable}` in its rollup. NOT the retired
Stop hook — informational, never blocks. MEASURED: a live probe (lean `claude -p`, haiku,
`--plugin-dir` dump plugin, 9 s, $0.036) captured the real SubagentStop input — keys session_id,
transcript_path, cwd, prompt_id, permission_mode, agent_id, agent_type, hook_event_name,
stop_hook_active, agent_transcript_path, last_assistant_message, background_tasks, session_crons;
SubagentStart carries NO agent_transcript_path (docs say it does). Parser measured on the real
2026-08-23 rollup: one bug caught before ship (`\s*` in a YAML key regex swallowed the first
`- item` line — escalations 1 read as 0). Docs + versions + marketplace + README rows + root tree
lines updated. LIVE legs pending a ship + restart: first Stop of the next-next session shows a
`duty:acted-on` line and, once the lens is dispatched, `.claude/verifiability-lens/trace.jsonl`.
**Check:** turn-end suite 195/195 (+6); kb suites 89/89 · 79/79 · 45/45 · 31/31 · 276/276;
lens suite 58/58 (+18, E2E over the real payload shape); toolkit trace-schema drift suite 74/74
over 3 writers (kb, turn-end, verifiability-lens); `registry-check --root .` consistent (exit 0);
`repo-guard` from the root clean (exit 0, 4 detectors); `test-all --root .` = 33/34 suites, 1957 checks; the one red is `essense-flow:test/run-all.cjs` (exit 1 under the sweep, exit 0 / 54 total / 0 failures run DIRECT a minute later — the #9-class intermittent, untouched this sitting; no essense-flow file in the diff).

## 2026-09-09 · #31 BUILT — `harness-stats`, the scorecard gate: 13 drop-in metric sources / 93 keys; audit 2 REPRODUCED at +0.0% on all 25 overlapping numbers

`plugins/plugin-toolkit/bin/harness-stats.js` (CLI, never writes) over the pure runner
`lib/harness-stats.js` and the registry `lib/metrics/index.js` — repo-guard's detector shape: context
gathered ONCE, every source reads the frozen object, a crashed source is a finding, a declared key
that comes back absent is NAMED, an undeclared key is flagged. Sources: hook-bytes · hint-followed ·
turn-end-fires · stop-durations · judge (engine/ms/cost/empty picks + judge-vs-ranker agreement from
0.9.0 duty lines — Q20 computable) · tail-bytes (vs the measured 9.9 KB bound) · kb-pull · acted-on ·
lens (`trace.lines_per_dispatch`) · checks · spawns (Stop hooks per fire exact = 5; UPS records per
prompt = a LOWER bound, silent hooks leave no record; REGISTERED counts from settings + enabled
plugins = 7 UPS / 5 Stop / 24 total on this machine) · running-vs-installed · briefing-vs-log
(registered, honestly null until #8). `lib/metrics/transcripts.js` = audit 2's `usage_scan.py`
in-repo definition for definition; every event carries its record timestamp and the sources window
EVENTS, not only prompts. Why: the first run drifted +8..+47% on six numbers — the audit had scanned
while its own session was in flight, so that span kept accumulating injections and fires for an hour
after the snapshot; windowing at the audit output's mtime (09:52:54Z) reproduces everything.
`defaults/harness-baselines.json` carries the audit numbers with provenance; the report prints drift
beside every baselined key. `--line` prints the `[instr]` form ONLY for keys the owner picks in
`.claude/harness-stats.json` — empty until then (the done-check's "nothing ships always-on without
that pick"). Live numbers on this repo NOW (whole life, 46 prompts): hook bytes avg 8930 / p50 7358 /
p95 29519; hints 31 → 3 strict (9.7%) / 5 loose; nudges 20 / blocks 13 / give-ups 12; judge 85 fires,
chosen empty 49.4%, ms/cost unknown (all pre-0.7.0 lines); tail: 0 of 121 fires carry bytes yet;
kb-pull 275 fires, hints/fire 2.69; lens 6 dispatches / 0 lines; acted-on 0 spans; checks 4 lines
(this sitting); running: installed≠checkout for turn-end/kb/lens (the unshipped bumps).
**Check:** `tests/harness-stats.test.js` 66/66 (registry, runner crash/silent-key/absent-surface,
scanner over the REAL record shapes incl. stubbed previews, every source, CLI E2E on a temp root with
a fake home + projects dir); `tests/trace-schema.test.js` 74/74; `node bin/harness-stats.js --root .
--until 2026-09-06T09:52:54.368Z` → 25/25 baselined keys at +0.0% (prompts 45, avg 8094, p50 7239,
p95 22673, max 30915, total 355.7 KB, UPS avg 3869 / p50 2737 / p95 9314, hints 30/3/5/10%, nudges
19, blocks 13, give-ups 12, w/block 10, ≥3 blocks 1, turn-end 128 fires / p50 190 / p95 56539 / max
60184 / 2092 s, 5 Stop hooks per fire); gates: `test-all --root .` 35/35 suites / 2023 checks (the harness-stats suite is the 35th; essense-flow green in this sweep); `registry-check --root .` consistent (exit 0); `repo-guard` from the root clean (exit 0) after ONE real finding — three leaked-path hits on the lens parser's `a:\s*`-shaped regex fragments (a one-letter key + colon + backslash reads as a drive path; the file was untracked during the #30 run, so unscanned) — fixed in source, not allowlisted. Nothing pushed; installed still 0.8.0 / 0.13.0 / 0.5.1 / 1.11.0 — a ship needs the owner's push + `claude plugin update` + restart.
