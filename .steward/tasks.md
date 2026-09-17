# Tasks — ordered, executor-ready (recomputed 2026-09-17 · HEAD `6052e6b` == origin, tree clean · INSTALLED == DISK for all 17 plugins (ledger read) — #1's install leg and Q24 are CLOSED · the owner's value question is Q26 and it moved #17 + #38 ahead of Phase 2 · the 09-13/14 sitting is held at subject level only and needs ONE capture · numbers are stable ids, file order is the order; next free id 43)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Ordering rationale (2026-09-17 recompute).** Three things moved the order. **First, the
install gate is GONE:** the ledger (read this pass) shows every plugin installed at its disk
version — turn-end 0.13.0 / kb 0.15.0 / reuse-gate 0.2.0 / thorough-mode 1.12.2 on 09-14,
plugin-toolkit 1.18.0 + steward 0.6.1 on 09-12, the rest on 09-11 — so #1 leg B is CLOSED, Q24 is
closed by install, and every gate in this file reaches any project. The model (and the session's
09-17 digest) carried "nothing installed" three to six days past the truth — an authored install
fact, the class the instruments exist to compute. **Second, the owner's question (Q26):** *"is
steward and verification and all that adding value?… it feels like it's just burning tokens"* —
and the table (state.md) says where: push 9.3–13.5 KB per prompt (2.0 KB on the control), kb-hints
the largest family at 0–7.5% followed, the judge EMPTY 81% of 21 post-install fires on aithseis
with the 300 s cap live, 31–55 min per ship inside Stop, logs never rotated. So **#17 (push-side
cuts) and #38 (memory garden) move AHEAD of #32 (a new duty) and #8** — Claude's call, reversible
by Q26: building a new tail duty while the owner asks whether the tail earns its keep is the wrong
order, and the 09-06 reading already prescribed deletions before mechanisms. **Third, the
09-13/14 sitting the model has not seen:** five commits to `6052e6b` (subjects only), four kb
captures. What this pass VERIFIED from it: `@fc` committed (Q25 closed by build), the judge cap
300 s by owner ruling (source read), #42's truncation MARKER landed, #9's flake is lock contention
(capture read) — the rest waits for the sitting's capture. **Order:** #1 stays first as the
standing READINGS task (watch + the post-install numbers Q26 needs — leg E), then #42 (its
evidence-preserving half is unverified — `checks.jsonl` is #32's satisfaction signal) and #41 (no
`base-freshness` under `plugin-toolkit/lib` — still open, a 30-minute claim source), then #17,
#38, Phase 2. No pre-1.14.0 test-all total is a baseline; under invariant 12 every mechanism task
names its METRIC KEY, registered in `plugins/plugin-toolkit/lib/metrics/index.js` — no key, not
done. #13 stays deleted; ids 1–42 stable, never reused.

**Hygiene rule for this file:** `.steward/` model files are COMMITTED to a PUBLIC repo
(only `inbox/` is gitignored). Never write an absolute path, username or machine-specific
detail here — name projects, not drives. Under invariant 13, a task's done-check is what the
executor RUNS; the owner reads the outcome in the session, never this file.

## 1. Dogfood — the INSTALL leg is CLOSED (ledger 09-17: installed == disk for all 17); what stands is the hook-liveness WATCH under its YIELD GUARD and the post-install READINGS Q26 needs (legs D + E) (standing; feeds #17, #12)

- **Where it stands (2026-09-12):** Phase 1 (turn-end 0.9.0 / kb 0.14.0 / lens 0.6.0) is
  installed, LIVE and demonstrably healthy — 28 v1 trace lines, 9 `duty:"context-recall"` lines
  all carrying `judge_chosen` + `ranker_top`, 2 kb lines, 1 lens `agent:` line, plus a timed
  hand-run of the installed Stop hook returning exit 0 in 38,436 ms with a 2,334-byte tail. On
  top of it sit FIVE uninstalled ships (state.md). Every claim about those is checkout evidence
  until one update + restart. The 09-09 Stop-hook silence stays unexplained and undiagnosable —
  leg 0 was deleted as unrunnable and lives on as leg C.
- **Leg A — CLOSED 2026-09-11 evening, with ONE number now RETIRED.** Recorded in log.md with the
  commands that printed them: 28 v1 lines / 9 recall lines with both judge fields;
  `harness-stats --root .` exit 0 — `lines_per_dispatch` 1, `acted_on.spans` 6,
  `judge.agreement_n` 3 / `agreement_pct` 66.7, `running.installed_vs_checkout` non-empty.
  **Do NOT carry that run's `uptake.used_pct` 100 forward:** the scorer credited boilerplate as
  use until plugin-toolkit 1.16.0 added idf weighting, so it is not comparable to anything after
  it. Method for the re-run, unchanged: (1) read one `duty:"context-recall"` line and confirm the
  judge fields; (2) `node plugins/plugin-toolkit/bin/harness-stats.js --root .` (plugin-toolkit
  1.18.0 is installed standalone since 09-12 — reaches any project) and record `trace.lines_per_dispatch`, `acted_on.spans`, `judge.agreement_*`,
  `running.installed_vs_checkout`, `uptake.used_pct`. Re-run it AFTER leg B — that run is the
  proof the install took, and it is the only place the drift shows.
- **Leg B — CLOSED 2026-09-17 from the ledger, not from a claim.** `installed_plugins.json`
  (grep-read: every version / sha / lastUpdated): turn-end 0.13.0 · kb 0.15.0 · reuse-gate 0.2.0 ·
  thorough-mode 1.12.2 at `6052e6b` (09-14T18:27Z) · plugin-toolkit 1.18.0 · steward 0.6.1 at
  `553c366` (09-12) · lens 0.7.0 (09-11) · essense-flow 0.27.0 · autopilot 0.5.0 · mk-cc-all
  2.28.0 with elicit (09-11). Nothing is behind. Lesson for this file: the model asserted "not
  installed" for up to six days after the update — the install fact must come from
  `running.installed_vs_checkout` (which now names NOTHING, or the model is wrong again), never
  from prose. Restart is per process (platform invariant 4): the aithseis post-install fires prove
  at least one process runs 0.13.0; a stale process shows itself via `[instr] running`.
- **Leg E — NEW 09-17, Q26's judge input; the first reading is IN.** Post-install window
  (`--since 2026-09-14T18:30Z`, the lens correction on inbox 20260917-1652): aithseis 21 fires /
  p50 34 s / p95 66 s / **81% empty picks**; twin 3 fires / 67%; mk-cc 2 fires @ 73 s / 0%. The
  300 s cap (`claude-p.js:66-82`) did not change the failure mode. **Next reading:** after 20 more
  fires per ship, `judge.chosen_empty_pct` + `judge.agreement_pct` with the command; empty >50%
  → Q20 option (5) ranker-only on that ship (Q26 amendment 2). Also read `lens.refuted` per ship
  after 20 dispatches (amendment 5) — the lens has ONE v1 line per ship today: unmeasured, not
  zero.
- **Leg C — the WATCH, predicate SHARPENED 2026-09-12 because it FIRED FALSE (Claude's ruling,
  taken by the model rather than patched by a session, as the capture asked).** The old trigger
  ("no Stop line while `checks.jsonl` grows") is true of the FIRST TURN OF EVERY SITTING, so it
  cried wolf on 09-11 exactly where the harness was healthiest (142 checks lines, 0 Stop lines,
  one `promptId` across 760 transcript lines, nothing yielded yet). **New trigger:** a sitting
  that has YIELDED at least once — a `stop_hook_summary` in the transcript, or ≥2 distinct
  `promptId`s — and STILL has no Stop line in `trace.jsonl` while `checks.jsonl` grew. If it
  fires, capture IN THAT SITTING (it is unreproducible afterwards): the transcript's per-turn
  hook summaries and a TIMED hand-run of the installed hook over that transcript. Hand-run lines
  are stamped `prompt_id: "legC-handrun"` and must be excluded from per-fire measurements. The
  finding is an inbox item, never a hotfix. **09-17: the "platform kill at the 90 s hook timeout"
  candidate has lost its mechanism** — every 60,615 ms Stop ceiling was the judge's own constant
  and the hook ceiling is 420 s now; a crash before the ledger write and a registration that did
  not take remain the candidates.
- **Leg D — prove Track 4's silence paid (folded in from the closed #39).** essense-flow
  0.27.0 + autopilot 0.5.0 are INSTALLED (09-11) and silent outside `.pipeline/` (lens correction
  09-17: remaining cost is process spawn only). Post-install hook bytes per prompt read 12.4 /
  16.2 / 11.8 KB on three ships (the capture's order) — NOT lower than whole-life, because
  kb-hints, not the banners, is the byte family (#17). Record this repo's `hook_bytes.p50` /
  `p95` with the command before and after #17's hints cut; that pair, not the install, is the
  before/after that matters now.
- **Still-open legs:** (a) staleness — ⚠ right 5/5, false git-HEAD ⚠ + authored prose wrong
  4/5 → #8; (e) 0.7.0 legs — no kb-pull fire inside a judge child, `[instr] items: N new
  (oldest Nd)`, one real wake-turn ending on the owner's request; (f) a self-check nudge naming
  a real un-checked mutation, a silent allow on a named check, `digest: pointer` + the
  `kb_query` cue. (b) readable now · (c) CLOSED (#24) · (d) correct · (h) leg C's false positive
  recorded and closed as a predicate fix.
- **Done-check:** `running.installed_vs_checkout` names NOTHING (a non-empty list now means
  the checkout moved past a fresh install, never the reverse); a fresh trace line in THIS repo
  reports `"version":"0.13.0"` — the trace, not the install cache, proves the restart took here;
  leg D's two hook-bytes readings recorded in log.md with the command; leg E's next judge reading
  (20 more fires) recorded the same way; each remaining leg observed at least once with zero UNEXPLAINED
  instrument lies; then #12 unblocks. **Metric keys:** `running.*` · `acted_on.spans` (a
  file-open measure — pointer kinds only) · `judge.agreement_n` · `judge.p95_ms` ·
  `hook_bytes.p50`/`p95`; the watch reads
  `spawns.stop_hooks_per_fire` (transcript) against `turn_end.prompts` (trace) — the same
  comparison as the prose predicate, but with the fire count in the denominator, so it cannot
  divide by zero.

## 42. The exec ledger must record the EVIDENCE, not the first 300 characters of it (turn-end; S) — precondition for #32, and a live source of false refutations

- **Why:** measured 2026-09-12 in this repo. `.claude/turn-end/checks.jsonl` writes
  `cmd: command.slice(0, MAX_CMD_CHARS)` with `MAX_CMD_CHARS = 300`
  (`plugins/turn-end/hooks/scripts/tool-record.js:44,137`), so a gate invoked at the TAIL of a
  long compound command leaves no trace in the ledger text. The verifiability lens read that
  silence as proof and **refuted two gate runs that had actually run and passed**. This is the
  exact mirror of the false-clean the recorder was built (#28) to kill: a ledger that
  manufactures FALSE NEGATIVES teaches everyone downstream to distrust it, which is worse than
  no ledger. Two facts from the source shape the fix: the cut is SILENT (the sibling sample
  truncator at `:90` appends `…[+N]`; this one appends nothing, so "short" and "cut" are
  indistinguishable), while `classify()` and `filesInCommand()` already run on the FULL string
  (`:127,138`) — the parse is right, only the record is lossy.
- **What:** keep a bound (the file is append-only and must stay cheap to read) but make it
  honest and evidence-preserving: (1) ~~mark every truncation the way `truncateSample` does~~ —
  **DONE on disk by 09-17** (`tool-record.js:111-112` appends `…[+N]` to a cut `cmd`, grep-read;
  `MAX_CMD_CHARS` still 300, so (2)–(4) are what remain); (2) preserve the CHECK-BEARING segments rather than the first N chars —
  the same `CHECK_COMMAND_RX` that sets `kind: 'check'` knows where they are, so record the
  matched segments (or head + the matched tail) instead of a blind prefix; (3) raise
  `MAX_CMD_CHARS` only as far as the real compound commands in this repo's ledger require —
  measure, do not guess a number (the no-arbitrary-thresholds rule); (4) a regression test built
  from a REAL 600+ char compound command whose gate sits last. Consumers need no change if the
  recorded text stops lying.
- **Done-check:** replay the exact compound command that produced the false refutation → its
  ledger line names the gate; a truncated line is visibly marked; `kind`/`files` unchanged on
  every existing fixture; turn-end suite green; then the lens, re-run over the same sitting,
  confirms instead of refuting. **Metric key:** `checks.truncated_pct` (lines whose cmd was cut /
  lines) registered in `plugins/plugin-toolkit/lib/metrics/index.js` beside the existing `checks`
  source — a number that must trend to ~0 and that makes any future regression visible.

## 41. `git fetch` before a bump, as a CLAIM SOURCE rather than a habit (plugin-toolkit / registry-check; S)

- **Why:** 2026-09-12, measured the expensive way: a full feature (thorough-mode 1.12.0) was
  built on a checkout TEN COMMITS stale, so its whole doc cascade landed on surfaces upstream had
  already retired (RELEASE-NOTES.md, the pre-Track-5 marketplace shape, a plugin README that did
  not exist locally), its suite baseline was read wrong (21 vs 22), and the push would have been
  a non-fast-forward reverting two commits. `registry-check` exited 0 the whole time — it
  validates the checkout against ITSELF and structurally CANNOT see a stale remote. Invariant 3:
  a rule that lives only as "remember to fetch" is a rule that breaks again.
- **What:** a new claim source in the existing drop-in registry (`lib/registry-claims/`, the
  house gate pattern — one `require`, no runner change): **`base-freshness`** — compare the local
  `origin/<branch>` ref against the remote's (`git ls-remote --heads origin <branch>`, the only
  network call in the family, so it degrades to INFORMATIONAL, never a hard fail, when offline);
  report how many commits behind and NAME the branch. Report as a MISMATCH (exit 1) only when
  behind, since that is a fact that is wrong; offline or detached = informational. Wire it where
  the bump actually happens: `/version-bump`'s first step runs the gate, and `@ship`'s checklist
  names it — the same retargeting Track 5 did for CHANGELOG, so the text and the gate agree.
- **Done-check:** with the local ref deliberately rewound one commit behind origin,
  `node bin/registry-check.js --root <repo>` exits 1 naming `base-freshness` and the count;
  after a fetch it exits 0; with the network unavailable it prints an informational line and
  still exits on the other claims' verdict alone; a negative control in
  `tests/registry-check.test.js` (every claim source has one — the suite's own rule).
  **Metric key:** the claim's own verdict, the #36 precedent — the gate exists to fail once and
  never again.

## 17. Phase C — the push side re-economized under the quality-over-speed law (audit-2 Tier 2 items 15–16 + harness G7 + the prism run; MOVED ahead of Phase 2 on 2026-09-17 — Claude's call, Q26 rules the shape) — registry-fold leg OFF (Q15 SLIM ONLY, 09-09)

- **Why it moved (09-17):** the owner asked whether the harness *"is just burning tokens"*, and
  the table (state.md) says where: push 9.3–13.5 KB/prompt on the steward ships vs 2.0 KB on the
  control, and it ROSE since audit 2; kb-hints is the largest family everywhere (145–225
  KB/project) at 0–7.5% strict-followed — the one push kind whose file-open metric is honest;
  31–55 min per ship inside Stop. Cutting the measured-dead push is what the 09-06 reading
  prescribed; adding a duty (#32) to a tail the owner is questioning is the wrong order. Nothing
  here is decided — Q26 rules which cuts; this task is where they land, each with its key.
- **What:** (0) `harness-stats` EXISTS (1.12.0+) — put its current numbers (`hook_bytes.*`,
  `hints.*`, `spawns.*`, `tail.*`, `kb_pull.*`) in the brief, then ONE `/prism` run on the
  push-side question — verbatim brief + owner-named lens *what-I-actually-experience* in
  inbox `20260906-1500` — build the winner, re-measure; **(0b) the Q26 (a) cut if ruled:**
  kb-hints ambient injection off by default, the `kb_query` cue kept (Q16), before/after
  `hook_bytes.p50/p95` recorded with the command; (1) ~~fold the per-prompt regex
  stack into ONE registry hook~~ — REMOVED by the Q15 ruling: every hook stays as it is;
  the global CLAUDE.md slim is DONE (6,528 → 5,228 B); the text surfaces retire only as
  #37's measured duty proves itself; (2) serena PreToolUse hook: matcher `Read|Grep|Glob`,
  advisory or raised thresholds (owner settings, owner session); alert-sounds `clear` off
  Python (one of the ≥8 spawns); (3) tail-read the transcript (`context.js:122-123`) — scan
  back to the last genuine user entry; datum 2026-09-11: a timed hand-run of the INSTALLED
  Stop hook over one real 760-line transcript took 38,436 ms before any duty decided anything —
  the hook ceiling is 420 s since 09-14, so this is now a COST datum (Q26's wall-clock row), not
  a kill risk; (4) per-duty supply budget via `Promise.race` + a
  suite timing assertion that sync duties stay cheap (lens item 20); `DUTIES` discovered by
  shape (`lib/duties/index.js:59`). Economics may cut FIRES and SCOPE, never quality; every
  cut ships with a fail-open path.
- **Done-check:** the audit's `measure.js` before/after — plain prompt unchanged, Stop
  spawns 5 → 3, one fewer UPS spawn; a 170 MB transcript reads in < 100 ms with identical
  `toolCalls`; hint-followed and tail-bytes metrics moved in #31's second run; each
  injector fires only where its trigger holds; on this repo `hook_bytes.p50` below the 09-17
  reading (10.1 KB avg) with the command recorded. **Metric key:** `push.bytes_per_prompt`
  p50/p95 + `push.spawns_per_prompt` (#31).

## 38. Knowledge lifecycle + garden job — "store less, mark wrong things, keep learning" (owner 2026-09-08 + 09-17; harness G15 / §7.8; MOVED ahead of Phase 2 on 2026-09-17; M) [removal authority: Q21]

- **Why:** owner, verbatim 09-08: *"we are storing too many things. we should be able to clean up
  wrong things or things that are not necessary and also keep learning from what we are
  seeing."* — and 09-17: *"are we keeping a good digestibgle memory or infinite things that
  conflict each other as we go on?"* Measured 09-17 (state.md table): log.md 1669 / 1528 / 1255 /
  529 lines across four ships, never rotated; tasks.md up to 1145 lines; 12–25 open questions
  per ship; every capture repeating the four-line preamble; earlier: standing 25.6 KB per
  session AND per sub-agent; 23 archived digests titled by stamp = noise hits; 84% of hints
  unread; no lifecycle on kb entries — the status contract has one for inbox items only. **The
  first garden pass is THIS repo** (Q26 (a)): rotate log.md, merge/close questions, and note
  that the digest's "19 unintegrated" was a FILE count — the ledger said 2. Precondition on the
  usage measure, CORRECTED 09-17: `acted_on.*` is a FILE-OPEN measure (honest for pointer kinds
  only); for injected bodies use the content-scored `uptake.used_pct` (idf-weighted since
  1.16.0; capture `20260911-0300`).
- **What:** (1) extend the status contract's item types to kb entries — `live |
  superseded-by:<id> | refuted-by:<id> | archived` in `status.json` (steward = only writer),
  joined at collect (the 0.11.0 `status-join` shape, zero engine change); the engine holds
  non-live entries back by default and SAYS so ("2 superseded held back"); history stays;
  (2) deterministic measures — per entry: pulls, hint slots, content uptake over the last N
  sittings; per file: bytes injected standing (CLAUDE.md, MEMORY.md, briefing, digest);
  contradictions (briefing vs log; two captures with opposing claims — the lens flags);
  never-used-in-N + never-cited = archive candidate; the "would removing this cause a
  mistake?" test applied to every CLAUDE.md line; (3) the GARDEN job — a steward verb,
  background, one per sitting like `integrate`, proposing merges / supersessions /
  archives / CLAUDE.md cuts as ONE diff the owner ratifies in-session (Q21 sets what may be
  automatic; invariant 13: one keystroke per batch, never a file to read); log compaction
  (#9's archive sibling) is one of its motions; the lens's refute/confirm marks
  `refuted-by`; (4) sweep the residual kb defects on the way: `source` facet unfilterable,
  stamp-titled archived digests as noise, 8-digit runs read as timestamps, BOM defeating
  frontmatter; **(5) record PROVENANCE at capture time.** `asset-value` reports
  `asset.origin_recorded` FALSE: `.claude/kb/` is gitignored, so no entry carries a commit,
  author or date, and an archive proposal cannot answer "who said this, when, and was it ever
  true". Add the field where the WRITE happens (capture / seed / digest frontmatter) — it costs
  nothing then and is unrecoverable later. Owner deferred it; the garden job needs it.
  **Real input exists for the measures (1.16.0):** `unused_assets` is a keep/cut list, and
  `.steward/log.md` scored 0/1 used across 5 surfacings — but no "never used" verdict from
  before the idf fix may be trusted (the scorer counted this model's own four-line preamble as
  use). Drop-in surfaces: status types (data), measures, garden motions.
- **Done-check:** mark a capture `refuted-by` → it leaves the hints and `kb_query` says
  "1 refuted held back"; the garden diff proposes ≥1 CLAUDE.md cut WITH its measure; a
  stamp-titled digest no longer wins a hint slot; this repo's log.md rotated with nothing lost
  (the archive sibling readable by kb); kb + steward suites green. **Metric key:**
  `knowledge.standing_bytes_per_session` (trend down across two sittings) +
  `knowledge.held_back` + `knowledge.never_acted_on`.

## 32. Goal duty — the armed task's done-check becomes the loop's termination criterion (harness G3, Phase 2; M) — UNBLOCKED by Q18/Q19; sequenced AFTER #17/#38 on 09-17 (Q26)

- **Why:** no goal-based termination exists in the layer; "stopping while there is planned
  work" (owner, twin 08-12) is prose; Anthropic's harnesses hold the loop to a checked list;
  the steward already keeps per-task done-checks — the criterion exists, nothing consumes
  it. **Owner ruling 09-09 (Q18):** the duty arms EVERY task the owner starts (`do it` /
  `steward:next`); one tail line if the session yields with the done-check unmet; advise,
  never block. The first mechanism built under invariant 12.
- **What:** a session-scoped turn-end DEMAND duty `goal`, `severity: advise`, armed by
  `steward:next` / an owner "do it" on a task (the base still supports explicit
  `steward:goal <n>` and machine-checkable-only as config, never default): criterion = the
  armed task's done-check from `tasks.md` / `status.json`; satisfied by the 0.8.0
  `checks.jsonl` (a check RAN after the last mutation and was observed — Q19; `requireGreen`
  per project) — **#42 lands first: that ledger truncates its command at 300 chars, so a gate
  run at the tail of a compound command reads as absent, and a goal duty built on it would nag
  about checks that had already passed** — or an explicit owner "stop"; capped by fires (3), never by a promise phrase;
  `defer()` while agents are in flight (0.7.0 primitive). Prose done-checks go through a
  turn-end JUDGE inside the one tail (lens escalation 1 — never a second Stop hook), off by
  default. `/goal` itself EXCLUDED (harness §9.5 default, invariant 1): the goal lives in
  the one tail. TaskCreated/TaskCompleted (if the platform exposes them) → status ledger
  entries, never a second task list. The nudge text obeys invariant 13: it names the task
  and the check to run, in the tail, not a file.
- **Done-check:** arm a task (#8 is the next mechanism) → a turn that yields without its
  check → exactly one tail line naming the task and the check; after the suite goes green
  (recorded in `checks.jsonl`) → silent; a sitting with no armed goal shows no line; turn-end
  + steward suites green; **the second `harness-stats` run** (the leg #31 carried) shows the
  deltas against `defaults/harness-baselines.json` with the new keys present. **Precondition
  SATISFIED 2026-09-11** — the Stop hook demonstrably runs (13 v1 lines), so a new duty can
  actually nudge. **Metric key:**
  `goal.met_before_yield` (sittings whose armed task's check ran before the last yield /
  armed sittings) + `goal.nudge_heeded`, registered in `lib/metrics/`.

## 8. Briefing: compute what drifts, author only what cannot be computed (audit-2 Tier 2 item 12; Phase 2; absorbs the write-time budget check + lens item 21)

- **Why:** the authored briefing BODY (Ship/Last/Next) is contradicted by the log's last
  entry in 4 of 5 ships — regenerated only at integration, it lags one session; the
  instruments are RIGHT everywhere (three of them since 0.5.2). Plus a false ⚠ on
  `git-HEAD` after committing the regenerated model (`steward-brief.js:63-67` reads the
  ref file's mtime). The 08-23 ruling was "authored narrative + COMPUTED instruments" —
  this moves the drifting narrative lines to the computed side. Nothing checks a real
  briefing's budget at write time either — computing the lines makes that moot. Invariant
  13 sharpens the target: the briefing is the owner's READING, so every line must be true
  at the moment it is read. **Unblocks a registered key:** `briefing.contradictions`
  (1.12.0 `briefing-vs-log` source) is `null` by construction until these lines are
  computed — the scorecard names it as absent on every run until then.
- **What:** the hook prints `briefing: <date> (<age>d)`, `Last:` = log.md's last heading,
  `Next:` = tasks.md's top-3 headings, `Waiting:` = questions.md's open headings; the
  agent authors ONLY `Ship:`; freshness by SHA — the agent records `views.briefing.head`
  in status.json at regeneration; ⚠ only when HEAD ≠ recorded; `agents/steward.md:59-60`
  stops instructing a done/-move (the `:62-66` install-instrument claim is now TRUE — #29
  built it, nothing to delete); lens item 21 — anchor the remaining protocol text to
  `<git root>/…` (`SKILL.md:55-56,79`, `commands/next.md:8`, `agents/steward.md:24`,
  `session-digest.js:76,78`); optional: a configurable backlog-age escalation for
  steward-sync (lens item 19's block half — config, no default). Contract v2 in
  `design/status-contract.md`. The five-key `harness-stats --line` form AT SESSION OPEN (inbox
  20260910-0510's follow-up, folded here 09-17 — the `[instr]` surface is this task's) rides the
  same computed lines; a hand-written copy of any of its numbers is the defect this task exists
  to kill.
- **Done-check:** commit the regenerated model → no ⚠; the hook's `Last:` equals the
  tail heading of log.md by construction on all 5 ships; a deliberately stale authored
  `Ship:` is the ONLY line that can lie; a real briefing over budget fails a deterministic
  check in the steward suite; a grep for "done/" over the steward protocol text hits only
  the pre-contract note; hook tests green. **Metric key:** `briefing.contradictions`
  (briefing-vs-log, #31) = 0 by construction on computed lines.

## 33. Compaction guard — PreCompact snapshot + PostCompact "where we are" (harness G8, Phase 3; S)

- **Why:** no PreCompact/PostCompact registration exists anywhere (grep 0 on 09-08);
  every compared harness names goal drift through lossy summaries as a top failure (Manus
  recitation; OpenHands' condenser keeps head + tail). A long sitting on this repo compacts
  mid-task with nothing holding the goal — and 0.13.0 already had to teach kb-session-start
  that compaction discards the transcript's digest copy.
- **What:** PreCompact hook: snapshot the live digest + the armed goal (#32) + the last
  recorded check (`checks.jsonl`, #28) to `.claude/kb/compact-<ts>.md`; PostCompact:
  re-inject a ≤1 KB "where we are" block (goal · last check · next step) — under the
  platform bound, demands-shaped; a compaction-preservation section in CLAUDE.md is the
  zero-mechanism companion. Presence-gated (a project with no kb/steward gets nothing).
- **Done-check:** force `/compact` mid-task → the next turn's first hook output names the
  task and the last check; the snapshot file exists; a no-memory project shows no output.
  **Metric key:** `compact.recovered` (post-compact turns whose first output named the
  armed task / compactions).

## 35. Sub-agents observed and insulated — SubagentStart/Stop trace, isolation policy per agent definition, modifier propagation mechanized (harness G10 + lens item 22; Phase 3; M)

- **Why:** agents are found by transcript scan (0.7.0 deferral); each inherits the 25.6 KB
  standing context (25.2 after the slim); the 235 judge children paid the whole harness
  until the lean flags; prism's panel cost ~370k tokens; modifier propagation to sub-agents
  (`++`, `@verify`) is prose only. **Substrate now MEASURED (09-09, capture
  `20260909-0355`):** SubagentStop carries `agent_id, agent_type, prompt_id,
  agent_transcript_path, last_assistant_message, stop_hook_active, background_tasks,
  session_crons`; SubagentStart carries `agent_id, agent_type, prompt_id` and NO
  `agent_transcript_path` (docs drift) — `agent_id` is the Start↔Stop join key; a plugin
  agent's type is plugin-scoped (`verifiability-lens:verifiability-lens`), so matchers are
  regexes; the ONE registration today is lens 0.6.0's recorder (matcher
  `verifiability-lens$`, checkout only) — the generic hook must not duplicate its line.
- **What:** SubagentStart/SubagentStop hooks (turn-end, empty matcher = every agent) → one
  trace-schema-v1 line per agent (`agent: <type>`, ms Start→Stop by `agent_id`, bytes of
  `last_assistant_message`, model/tokens from the agent transcript) and the AUTHORITATIVE
  in-flight set for `defer()` (Start without Stop = in flight; transcript scan stays the
  fallback; `background_tasks` now arrives on Stop payloads too — state.md invariant 2); an
  isolation policy per agent definition — lean flags for judges,
  `tools`/`effort`/`maxTurns` floors for panel lenses; a PreToolUse hook (matcher `Agent`)
  that injects the prompt's active modifiers recorded home-side by prompt_id (lens
  item 22).
- **Done-check:** every dispatch in a sitting has a trace line; a Stop fire with agents in
  flight shows `deferred: N` sourced from the hook set; judge children show 0 hook fires in
  their own transcripts; `++ do X` then an Agent dispatch → the child's context contains
  `[thorough-mode]`; a prism panel with `effort: medium` lenses ≤ 150k tokens. **Metric
  key:** `agents.traced` (dispatches with a line / dispatches) + `agents.bytes_inherited`.

## 34. Soft budgets — a per-sitting budget line that prints, never blocks (harness G9, Phase 4; S)

- **Why:** cost is recorded (0.7.0 `costUsd`) and never enforced or even TOLD to the
  session; 235 judge children; prism 370k tokens; every compared harness caps iterations
  or dollars, and OpenHands' known defect is an agent never told its budget. Invariant 8: a
  guard prints, it does not block.
- **What:** a per-sitting budget ledger (agents dispatched, judge cost, tokens where
  reported) with soft thresholds that print ONE tail line — thresholds are owner-set via
  config, Claude ships NO default number (the no-arbitrary-thresholds rule); `maxTurns` +
  `effort` on every shipped agent definition; the budget line is COMMUNICATED in the tail.
- **Done-check:** trace shows `budget: {agents: n, judge_usd: x}`; crossing a configured
  threshold prints once per sitting; nothing is ever blocked; suites green. **Metric key:**
  `budget.crossings` per sitting + `budget.judge_usd`.

## 36. Harness replay gate — the audit's transcript-replay scripts become a `test-all` suite (harness G13, Phase 4; S/M)

- **Why:** a 3% injection regression is invisible today; Anthropic re-runs evals on every
  system-prompt change; the audit's replay scripts sit in a scratchpad; the 0.8.0
  recorder's `samples/` are the first REAL hook payload fixtures the repo will own.
- **What:** `plugin-toolkit/bin/harness-replay.js` runs every hook over RECORDED payloads
  (fixtures in-repo, scrubbed of paths — the `samples/` shape; the lens's
  `SubagentStop.sample.json` and turn-end's `samples/` are the first two) and diffs the
  `harness-stats` scorecard against `defaults/harness-baselines.json`; test-all discovers it by shape; later `claude plugin
  eval` cases per plugin if/when early access lands.
- **Done-check:** a deliberate 400 B injection bump shows as a red delta; the sweep still
  runs with no network/judge spawn; test-all `--root` green. **Metric key:** the replay
  delta itself.

## 37. Code-design duty + `@ship` design gate — "better codebases as context enriches" measured, not texted (owner 2026-09-08; harness G14 / §7.7; Phase 4b; M) [severity: Q22]

- **Why:** owner, verbatim: *"as new things are added and context is enriched we need to be
  designing better code. code is cheap now so we need to be designing better codebases."*
  Today the concern has five TEXT surfaces (kept by Q15) and one advisory pre-code gate —
  the shape invariant 3 rejects; the measured substrate (code-glossary's extensibility
  measure, dispatch scanner, coupling, DRY clusters — 2.1 s on `plugins/kb`, 8 real
  clusters) never runs ambiently. Instance-shaped output is a failure invariant 7 cannot
  SEE. Preconditions now met: the 0.8.0 file-touch extractor names the files a turn
  touched; `harness-stats` (1.12.0) reads the key the moment it is registered.
- **What:** (1) a turn-end DEMAND duty `design` (advise by default; Q22 may raise `@ship`
  to block) that computes the DELTA on the touched files, per project only (invariant 7's
  scope limit): new switch-on-subtype / hard-coded concrete target, coupling edges added, a
  duplicate cluster that gained a member, extensibility score down — fires ONLY on a
  regression, names file:line + the catalog seam that closes it ("second `switch` on
  `kind` in hooks/ → registry dispatch; see /patterns registry-dispatch"); a cluster
  reaching THREE members demands an extraction decision (extract / accept with reason),
  never silently; the duty SAYS which signals ran (the signature signal is dead for untyped
  params — #15's precondition, fix or declare); (2) the `@ship` gate: the same measures as
  blocking checks against a per-project baseline file, so a ship cannot lower the score
  (Q17's ★ for code-glossary, sharpened); (3) learning: every regression is a capture
  candidate with its pattern id; recurring ones become `patterns.json` examples (data);
  (4) the Q15-kept text surfaces retire as the duty's regressions-caught count goes
  non-zero over a week. Drop-in surfaces: measures (`code_glossary/` signals), catalog
  entries, per-project thresholds (owner-set, no Claude default).
- **Done-check:** seed a `switch (kind)` in a hook → the duty names file:line +
  `registry-dispatch`; a third member joining a cluster → an extraction demand; `@ship`
  with a lowered score → exit 1 with the measure named; an untyped-JS turn → the duty says
  which signals were blind; turn-end + toolkit suites green. **Metric key:**
  `design.regressions_caught` per sitting + `design.text_bytes_retired`.

## 21. Patterns 0.1.1 — finish the interactive legs (Q15's answer is EXECUTED)

- **Why:** pushed + installed 08-27, menu hook live in a scratch session; `/patterns` was
  never invoked in any real session since (audit 2) — the interactive legs are still
  owner-session work. Q15 is RULED (slim only) and APPLIED 09-09 — step 2 CLOSED.
- **What:** (1) `/patterns` try-out + one real gate fire in the owner's interactive
  session; (2) ~~Q15's answer~~ DONE; (3) the one-line catalog citation in essense-flow
  `generativity-protocol.md` + `code-conventions.md` (pipeline points at ambient; no
  ownership move). #37 later makes the catalog the duty's remediation vocabulary.
- **Done-check:** both hooks observed in the owner's session once each; citation lines
  present or explicitly declined.

## 2. Ratify the distribution layout — it is now standalone toolkit + FULL bundle, six skills double-listed (Q24 closed by install; the slim-or-keep residue is the one decision left)

- **Why:** the layout has flipped twice without a ruling: 07-31 "bundle disabled + toolkit
  standalone"; 09-11 "no toolkit entry, bundle 2.27.0"; **09-17 (ledger read): plugin-toolkit
  1.18.0 standalone (09-12) AND mk-cc-all 2.28.0 (09-11) both installed** — reach is restored,
  the six toolkit skills are listed twice, and elicit rides the bundle. An unclosed decision
  drifts; this one has drifted three times. What a PUBLIC marketplace user should install was
  never decided either.
- **What:** (1) the owner's one-keystroke pick: KEEP the duplication (zero work; the bundle stays
  the one-install path for public users) or SLIM the bundle (drop the six toolkit skills, bump
  the bundle so the cache updates, re-verify registry-check's bundle-path claim) — Claude's
  default: keep, until a public user or the scorecard shows the double listing costs anything;
  (2) prove the reach: run ONE gate (repo-guard or test-all `--root`) from a DIFFERENT project
  via the installed 1.18.0 and record command + exit code; (3) README + marketplace prose match
  the chosen layout (#40's doc set is layout-independent, so this is a small edit under the
  `plugin-docs` claim); (4) the repo-guard detector for instruction-names-unreachable-path remains
  a candidate (Claude's proposal, unrequested).
- **Done-check:** (1) decision recorded in log.md with its reason; (2) one gate run recorded from
  a different project (command + exit code); (3) README + marketplace prose match the chosen
  layout.

## 3. Extract autopilot's `decide()` so it can become a duty (closes invariant 9; harness G12 leg)

- **What:** essense-autopilot still owns a blocking `Stop` hook and IS installed
  (user-scope); 0.4.1 stands it down cheaply without `.pipeline/` but it stays REGISTERED.
  Its decision logic is welded into `main()` — only `countInFlightAgents` is exported
  (`plugins/essense-autopilot/hooks/scripts/autopilot.js:421`). Extract a PURE
  `decide(state) -> {advance|halt, reason}` in that plugin, then register a turn-end duty
  that consumes it. Owner direction: "autopilot should become a duty." Do NOT re-implement
  a thinner "what's next" inside turn-end — that creates a competing source of truth.
  NOTE: 0.7.0's `lib/deferral.js` is now the generic in-flight-agent reader; the duty
  should consume it, not `countInFlightAgents`.
- **Done-check:** `decide()` exported and unit-tested against the existing halt cases;
  the turn-end duty returns the same verdict for the same state; autopilot's `hooks.json`
  no longer registers a Stop hook; BLOCKING Stop-hook registrations across enabled plugins
  = 1; a pipeline project shows ONE tail with both items.

## 4. Prove which kb MCP build is answering (collect the evidence)

- **What:** no server-side `kb_query`/`kb_read` trace line has ever been confirmed
  post-restart. A stdio server keeps the code it was launched with, so `kb_overview`
  should report the freshly-installed build. Audit 2 counted 38 MCP calls fleet-wide but
  did not read the version. Same class as G1 — turn-end/steward now print theirs (#29);
  the MCP server's `kb_overview` is the equivalent read. A restart is step zero.
- **Done-check:** one `kb_overview` call reports the INSTALLED version — **0.14.0 since
  2026-09-10, so this is runnable today** — AND a `tool: kb_query|kb_read` line (0.14.0 shape;
  `tool: kb-pull-hook` was the old key) with a post-restart timestamp appears in the trace
  (2 kb hook lines already exist in this checkout; the MCP-side line is the missing half).
  Both, or the leg is not closed.

## 5. Crowd-game: commit its config, run the DEEP seed, and collect the post-fix turn-end data

- **What:** crowd-game is DORMANT since 08-02 — it has ZERO post-fix turn-end data. Next
  crowd-game session: (a) commit the written-but-uncommitted `.claude/kb.json`; DROP its
  `scribe.focus` (no consumer anywhere — this repo's copy was migrated at #26) — port to
  `.claude/turn-end.json` `duties.session-digest.important` only if it should still apply;
  (b) the user-scope installs now carry the timeout + digest-theft + root-anchor + 0.8.0
  ground-truth + 0.13.0 bounded-pull fixes — restart (the `[instr] running` line confirms
  it), then watch the first real fires; (c) re-run `/kb-seed` under the depth mandate,
  running `kb coverage` FIRST — the first real test that re-seed is incremental BY
  MECHANISM; (d) copy the `game-project.yaml` lens preset into
  `.claude/verifiability-lens/profile.yaml`; (e) delete the stray
  `.claude/prompts/.claude/verifiability-lens/state.json`; (f) audit-2 chores: untrack the
  11 MB PNG evidence; delete the CONSUMED duplicate inbox item.
- **Also record while there:** every hand-driven query that MISSES, classified —
  splitter / vocabulary / ranking / genuinely-absent (feeds #11).
- **Done-check:** config committed there; `kb coverage` shows previously-uncovered
  substrate now cited; a turn-end trace line with a completed judge verdict AND
  `"version"`; a hand-driven query finds a fact only the deep sweep could reach; the miss
  list exists in writing, even if it reads "none found".

## 6. Make documented counts and claims derivable, not remembered

- **What:** registry-check covers versions/listings/paths — extend the same pattern to
  what it does not cover: test counts and hook-registration prose. Phase 1's `[instr]`
  lines subsume the VOLATILE half; #8 takes the briefing's narrative lines; this sweep
  keeps the STATIC prose half. Open instances, each read from the file that claims it:
  test-all totals (re-run `node plugins/plugin-toolkit/bin/test-all.js --root <repo>` and let ITS
  output be the number — and note the sharper lesson: the pre-1.14.0 totals this file used to
  quote were freshly RUN each time and still wrong, because the sweep could not read node 24's
  pass marker, so a re-derived number is only as good as a deriver that has been shown it can
  MOVE) · the plugin-toolkit 1.10.0 doc gap and the 1.9.0 `checks.yml` claim, both now living in
  `CHANGELOG.md` / `design/notes/plugin-toolkit-history.md` after Track 5's migration (re-read
  them there; the RELEASE-NOTES spelling is retired repo-wide) · 613 Python glossary-engine checks in no
  documented total · moved-content references from the 07-31 restructure · marketplace
  metadata non-bump convention (decide, then bump-or-drop) · steward CLAUDE.md test-count
  line (50 + 13 since 0.5.2 — re-read the CLAUDE.md side) · the hook-event table in root
  CLAUDE.md now that turn-end registers PostToolUse and lens 0.6.0 SubagentStop · **root
  CLAUDE.md's "three repo-level gates" while its own table already lists four — still present in
  the text injected at the 2026-09-12 session open, so it survived BOTH the `019e007` doc sync
  AND Track 5's whole README/CHANGELOG pass. Two doc passes missed it because neither was
  looking: that is the argument for a claim source over another sweep.**
  Prefer printing the command over the number wherever
  the number earns nothing; `harness-stats` now prints the VOLATILE numbers, so any of them
  hand-written in prose is a defect by construction.
- **Done-check:** a check (registry-check claim source or peer) fails on today's
  instances and passes after correction; one command re-verifies every documented count
  and hook claim.

## 7. Retire the leaked-path allowlist entry (the absolute-path debt, expressed as a gate)

- **What:** `plugins/essense-flow/test/` is the one entry in repo-guard's `leaked-path`
  allowlist, self-described as *"Known debt, NOT exempt by design"*. Those files carry
  real home-directory literals as load-bearing fixture roots — a blanket replace broke 4
  suites and was reverted, so per-file: read what each literal is FOR, replace with a
  tmpdir/`__dirname`-derived path, run that suite, move on. Do NOT re-introduce a count —
  the allowlist entry IS the done-check.
- **Done-check:** the entry deleted AND `node plugins/plugin-toolkit/bin/repo-guard.js`
  (root cwd, direct exit read) still exits 0 AND `node plugins/essense-flow/test/run-all.cjs`
  reports zero failures.

## 9. Adjudicate the essense-flow reds — starting by making the sweep SAY why a suite failed (the first move is plugin-toolkit's, not essense-flow's)

- **What:** FOUR suspects now, and they must not be merged. **(0) the two standing reds:**
  `essense-flow test/run-all.cjs` resolves fixture paths OUTSIDE the repo (the #7
  leaked-path debt seen from the test side — fix there, not here) and code-glossary's pytest
  deps are absent in this checkout (an environment fact: either the sweep declares the suite
  SKIPPED-for-deps, which 1.10.0's skip discipline says it must, or the deps get installed —
  a red that means "not runnable here" is a reporting defect). **(1) CORRECTED 2026-09-11 —
  `plugins/essense-flow/tests/ledger-compaction.test.js` was never "red from calendar drift":
  it was RUNNING AND ASSERTING NOTHING since the gate began**, invisible until 1.14.0 taught
  test-all to read node 24's pass marker. So the old sub-question ("why does the sweep report it
  green?") is answered — the sweep could not count — and the real work is to find out whether
  the suite's assertions were lost, never written, or skipped by a guard, then restore them and
  prove the count moves. (2) **MECHANISM NAMED
  2026-09-12, and the first move moved plugins.** The signature is stable — `essense-flow:
  test/run-all.cjs — exit 1` under the sweep, green standalone, now **4 of 8 observed sweeps**
  (was 3 of 7). Why four investigations stalled: `bin/test-all.js:118` runs children through
  `spawnSync(..., {encoding:'utf8'})` so stdout AND stderr ARE captured and handed to `classify`
  (`:122-123`), but the FAILED branch keeps only `note: exit <status>`
  (`lib/test-sweep.js:199`) and the renderer prints label + suite + note (`:257`) — **the
  evidence is discarded at the REPORTER, not missing.** So: (2a) FIRST, in plugin-toolkit, make
  a FAILED/SUSPECT suite print the captured output (bounded, marked when cut — the same honesty
  #42 demands of the other ledger) and add a sweep test asserting the child's text reaches the
  report — **DONE: plugin-toolkit 1.17.0 (`edae5e5`) gives FAILED/SUSPECT/CANNOT RUN a bounded tail
  excerpt (capture 20260914-2130, read 09-17)**; (2b) **DONE on the very first red run after it —
  the cause is LOCK CONTENTION, not a shared resource:** `withLock: failed to acquire
  .pipeline/heal/HEAL-LOG.md.lock after 5 attempts (~1.5s)`; `with-lock.cjs:56` `MAX_ATTEMPTS = 5`
  with 50 ms backoff (~1.5 s) against `LOCK_STALE_THRESHOLD_MS = 60000` (:51) — three orders of
  magnitude apart, which is the smell; green alone, red in company. **What remains is the FIX:**
  raise the retry budget in `essense-flow/lib/with-lock.cjs` (governed by D-Rd11-4) with a MEASURED
  number from contended sweeps, never a guess; and the two pre-existing `state-shape WARN` lines
  the same excerpt surfaced; (2c) a flaky suite is named SUSPECT, never green.
  For the ledger-compaction suspect: author the archive sibling (the root fix; raising the
  threshold re-fires in 30 days — #38's garden job wants the same motion). Also the precondition for Q12(b)/(c)
  if the owner wants CI back.
- **Done-check:** a deliberately failing fixture suite makes `test-all` print the child's own
  output (and say so when it bounds it); both suites green on a clean tree, ledger-compaction
  still green with the system date advanced 60 days AND reporting a NON-ZERO check count that
  moves when an assertion is added or removed, run-all green on 5 consecutive sweeps, AND
  `test-all --root` demonstrably counts them. Run `tests/` explicitly; `test/run-all` says
  nothing about it.

## 10. Diploma residual: confirm the corrupt-state banner (next Diploma session)

- **What:** essense-flow 0.26.1's parse-corrupt DEGRADED banner is only observable IN
  Diploma. First minutes of the next Diploma session: launch, expect the banner, fix the
  file.
- **Done-check:** banner observed (or its absence investigated as a 0.26.1 bug); Diploma
  `state.yaml` parses clean afterward.

## 11. kb retrieval rung 2 — RE-PARKED on evidence; re-measure after 0.13.0 [needs owner only if #31's numbers still say vocabulary]

- **What:** the aithseis kb-probe capture met the rung-2 evidence gate on 08-23, but
  audit 2 says the hints are ignored for REPETITION + SIZE (84% ignored, top-3 ids in 40%
  of slots, the digest stubbed by the platform) — not for vocabulary; an LLM
  characterization pass is the wrong lever before the push side is readable. #27 SHIPPED
  (kb 0.13.0: bounded, deduped, cued); now re-measure the hint-followed ratio — `node
  plugins/plugin-toolkit/bin/harness-stats.js --root . --since <the 0.13.0 install stamp>` →
  `hints.strict_pct` / `hints.loose_pct` (whole-life at the #31 run: 9.7% strict; the
  post-0.13.0 window is the number that matters) — and the miss classes (#5's crowd list adds the second corpus); bring the Q9 ladder to the owner
  ONLY if misses are then vocabulary-class.
- **Done-check:** a post-0.13.0 measurement recorded in log.md naming the miss classes; if
  the owner says build: enrich job cached + incremental, ranker tests green, previously
  missing queries hit.

## 12. Phase 2 — fleet rollout of the status spine (~1 evening, after #1 + the per-ship chores)

- **What:** backfill twin-game / crowd-game / aithseis / Endure (status contract adopted
  in 1/5 ships today); done/-moves retired fleet-wide; harbor: fleet-caste source (+ `~`
  expansion + the missing-dir-is-silently-empty loudness fix); fleet table — `steward
  fleet` reads status.json + instruments, SESSION-ONLY per the Q3 ruling. **Per-ship
  chores first, in THEIR sessions (audit 2):** twin-game — remove the hardcoded aithseis
  drop path from its model + CLAUDE.md, untrack its nested `.claude/turn-end`, digest 110
  lines → pointer file; aithseis — repair the mangled inbox filename (merge the newer
  body), commit 43 days of model + KB changes, investigate the 09-03/04 hook silence;
  Endure — untrack `.claude/turn-end`, drop `inbox/.README.md` (a phantom only until the
  contract runs there); crowd — #5(f); **this repo — retire the dead `.pipeline/` cache
  (untracked and not gitignored, 2026-04-22 vintage): gitignore it or delete it, but NOT
  `state-reconcile --apply`, which would assert `phase: architecture` on a repo that runs no
  pipeline. Cost today is one SessionStart banner, so it is a chore, not a defect.** Surfaces
  the per-ship git-policy divergence (owner call per project). Every ship: RESTART after update — the `[instr] running` line
  (0.5.2) now tells each ship whether it did.
- **Done-check:** the fleet table matches a spot audit on all five ships; one downstream
  friction event reaches this repo via harbor instead of waiting for an audit.

## 14. Crowd-game steward evaluation (~5 sessions or ~1 week after its deep seed)

- **What:** re-run the 2026-07-21 audit methodology on crowd-game transcripts; 5 signals,
  full rules preserved verbatim in
  `.steward/inbox/done/20260721-2345-eval-measurement-recipe.md`. The 08-23 + 09-06
  audits cover the OTHER ships; this is the crowd-specific before/after — `harness-stats
  --root <crowd checkout>` (1.12.0) replaces the hand method.
- **Done-check:** before/after table with confidence notes. **Owner annoyance = veto
  regardless of numbers.** Unlocks the deferred drop-channel decision (Q8).

## 15. Phase A — wire the gates (on this repo; v3 resumes here, after the spine phases)

- **What:** coupling/extensibility + tests into every executor step; a deterministic
  model-vs-code drift check (parts.md contracts vs `runner map`). test-all +
  registry-check + repo-guard + harness-stats (1.12.0) + (#37) the `@ship` design gate are
  the gate family #6 extends — reuse, don't re-derive. Respect the coupling scope limit:
  per project, never across the marketplace. Ambient sessions are #37's job (the 08-26 +
  09-08 wishes): patterns 0.1.1 covers the VOCABULARY + pre-write nudge, #37 the
  measurement; what remains HERE is the executor-step wiring + the drift check.
  **Precondition (lens item 18, shared with #37):** the code-glossary signature signal is
  DEAD for JS/untyped params (`signals/signature.py:46-48`; `with_signature_hash` 0/128 on
  plugins/kb) — derive an arity/param-name signature or document the dead signal before any
  gate reads it. The essense-flow-side consumers join ONLY if Q14 resolves (b)/(c); default
  (a) keeps them unbuilt.
- **Done-check:** `with_signature_hash > 0` on plugins/kb; a deliberate reach-in fails a
  hand-back; a stale parts.md entry is flagged; an executor step that adds a closed
  dispatch on a declared growth axis is flagged by mechanism, not by rule text.

## 16. Phase B — harden the steward

- **What:** adversarial inbox suite (pivot, vision-contradiction, deletion, duplicate,
  items superseding each other, an item whose defects disk already fixed — integrates as
  DONE with zero tasks); recurring spot-check re-injection; verbs /discuss /test /work
  (+ `garden` from #38). **`/discuss` is now CONSTRAINED, not free (2026-09-12):** the
  idea → shaped-vision job already ships as the `elicit` plugin (one SKILL.md, writes one inbox
  capture, never the model). `/discuss` must absorb or extend it — a second brainstorm verb with
  its own protocol would be exactly the duplication invariant 4 forbids, and the model would
  then have two surfaces claiming the vision text. RECONCILED vs the blueprint: the orphan-`.steward/` detector +
  frontmatter warnings + digest size guard live in blueprint Phase 4, not here; Q10's
  second-staleness-signal remainder is SUPERSEDED by Phase 1 cursors; the briefing's
  computed lines are #8. Under invariant 13 every verb's output is in-session content, and
  the integrate DIFF is measured against the owner's reading, not the model's completeness.
- **Done-check:** each adversarial item produces a correct diff incl. cascaded deletions;
  spot-check fires periodically in normal use.

## 18. Phase D — generalization pass

- **What:** extract anything mk-cc-resources-specific from the loop after the #14 eval;
  verb set + model structure prove open or get fixed; /kb-seed generalization rides the
  same pass. The on-ramp is HAND-SEEDING behind the existing one-time cue — Q16 RULED keep
  the cue (no auto-seed, no one-keystroke seed), so this phase ships no seeding mechanism;
  what it ships is a seed that needs no tooling change per project. Then
  EMDE/psience/BiananceRepo — the two ships where the owner measurably felt the loss.
- **Done-check:** the next project onboards by steward-seeding + kb-seeding alone — no
  tooling code changes.

## 19. Phase E — retire ceremony officially [Q4, Q5, Q17 land here; harness G12 + the "stale harness" rule]

- **What:** docs + marketplace reposition — **the mechanical half is DONE (#40, 2026-09-11:
  README rebuilt, 18 marketplace rows re-described, CHANGELOGs, tags, and a `plugin-docs` claim
  that keeps it true), so what is left here is the POSITIONING claim, not the file work**;
  classic pipeline preserved — and the extraction it was waiting for already happened (#39:
  `/elicit` is its own plugin, essense-flow 0.27.0 + autopilot 0.5.0 are silent outside a
  pipeline), so this phase now inherits a quiet pipeline whose one wanted phase is already
  standalone, and Q17's live vote is freeze-vs-archive; essense-autopilot retires (Q4 — #3 may make this a deletion
  rather than a migration); session-lifecycle + reuse-gate per Q17. Standing rule, now LAW via invariant
  12: on every model release re-run `harness-stats` (1.12.0) and remove any mechanism whose
  metric is flat. Absorption fodder: handoff/resume redundant in steward projects
  (measured: 0 uses ever); retro/meta-review → steward verbs; truth split memory=owner /
  model=project / CLAUDE.md=code / kb=queryable everything.
- **Done-check:** BLOCKING Stop-hook registrations = 1; spawns per prompt ≤ 6; a new toy
  project goes idea → running slice through the steward loop only, in one evening.
