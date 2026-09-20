# Changelog

All notable changes to **plugin-toolkit** are recorded here, newest first, in the terms that
matter to someone who installs it. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.22.0] - 2026-09-20

### Added
- **`behaviour-probe` — the arm is scored by what it DOES, not by what its source text contains.** A case may ship a `probe.json` beside its `graders/`: the entry file, where the app reads its port, a readiness route, and a list of steps (a request, expectations over the JSON response, values picked for later steps, or `restart`). `lib/behaviour-probe.js` copies the arm to scratch, boots it on a free port, drives it step by step, kills and restarts it, and returns `passed/total` with one line per step. Expectation ops: `eq`, `contains`, `matches`, `count_min`, `oracle` (a truth set computed outside the app — `session-titles` reads the last `ai-title` line of every real transcript, so "the pull shows a real title" is checked against disk). Ops and oracles are one-entry extension surfaces. `node bin/behaviour-probe.js --spec <case>/probe.json --dir <arm dir>` runs one arm; exit 0 all passed, 1 some failed, 2 cannot run.
- **`plugin-eval --keep-outputs` runs the probe on every kept arm** and prints a `probe <case>: WITH a/b · W/OUT c/d` line per case; the numbers ride in `--json` as `probes`. **`--probe-outputs`** re-scores the arms already under `results/outputs/` without running `claude`, so a new or fixed probe applies to yesterday's arms for free.
- The `postit-board` case (steward, turn-end) ships an eleven-step probe — create → drag → edit → done → job → add-to-job → export (one fenced block) → restart → read back → pull → a real session title — and its prompt now pins the API contract the probe drives (routes, bodies, the `{ board: {groups, tasks, jobs} }` shape). Measured 2026-09-20 on the four arms kept the day before, none of which had seen the contract: steward/without 11/11, steward/with 2/11, turn-end/with 1/11, turn-end/without 2/11 — the regex graders had scored those same four 0.75 / 0.75 / 0.80 / 1.00.

### Why
- Both Δ rows of 2026-09-20 were decided by regex graders (`node:http` present, `4321` absent, `resolveInside` named), not by the plugins, and nothing in any arm ever RAN its own code (page, "what it tells us" 5–6). A probe is the cheapest substrate that answers "does it work": deterministic, no judge, no tokens.

## [1.21.0] - 2026-09-20

### Added
- **`plugin-eval --keep-outputs` / `--show-full` / `--show-lines <n>`: read the difference, not only score it.** The runner keeps each run's temp dir, copies what the agent PRODUCED (new or changed files vs the case's `fixtures/`, plus the final message) to `<plugin>/evals/results/outputs/<case>/<arm>-<n>/`, prints the first run per arm in full and lists the rest, then removes the temp dirs. The plugin's own bookkeeping under `.claude/` is dropped; `.steward/inbox/` captures are kept because they are output.

### Changed
- **The four suites now run a task from the owner's own line of work** — a Unity/XR toolkit in the Zarmada house shape (sealed-lifecycle `CoreBehaviour`, quit-aware `Singleton<T>`, typed `EventID<T>` bus with dispatch-safe removal, `List<enum>` PauseManager, `AudioManager` as the reference manager) and the prompt "add a HapticsManager: pulse on GrabStarted/GrabEnded, never while paused, designer-tunable". Graders: three house rules on the produced manager (extends `Singleton<HapticsManager>`, unsubscribes in `OnDisable`, no `FindObjectOfType`), two decisions that live only outside the code (config asset under `Zarmada/Config/…`, the 0.6 amplitude cap), and per plugin the want it exists for (steward: an inbox capture of a parked wish; turn-end: the page rewritten + the check named; thorough-mode: verified done under `++`). The earlier one-line "add a date to the header" task is gone — sonnet solved it identically with and without help.

### Fixed
- `target: files` in a regex grader is the LIST of created paths, never their contents (doc, "what a grader can look at") — the first haptics graders scored 0/1 in both arms on files that plainly matched. Contents are graded through `{source: file, path}` on the path the prompt pins, and the two out-of-code decisions on the trace, with their literals scrubbed from the notes so a Read of the note cannot satisfy the grader.

## [1.20.0] - 2026-09-18

### Added
- **`plugin-eval`, a fifth repo-level gate — one WITH / W/OUT / Δ / seconds table per plugin.** It discovers every `plugins/<name>/evals/` suite by shape, runs `claude plugin eval --ablation with-without` on it (three runs per arm, sonnet on both sides, a cost ceiling, the HTML report kept local) and prints the table in the terminal, with a second line per case saying which of the three wants moved — progress captured, prior decisions honoured, verified done — because a case score hides that. `--dry-run` prints the exact argv per suite; `--plugin`, `--runs`, `--model`, `--judge-model`, `--max-cost-usd`, `--concurrency`, `--case`, `--json`.
- Four suites, one case each, sharing one tiny fixture project (a report renderer with a house date rule): kb `decisions-honoured` (the rule lives only in `.claude/kb/extracted`, hints opted in), steward `decisions-and-capture` (the rule lives only in `.steward/briefing.md`, plus an owner wish to park in the inbox), turn-end `page-and-self-check` (PROJECT.md present, six other duties switched off), thorough-mode `verified-done` (a `++` prompt). Each case seeds its cwd through a scaffold script from its `fixtures/`, because on Windows the eval child has no sandbox and cases grant no Bash.

### Notes
- Measured while building it (2026-09-18): the WITHOUT arm runs with none of the plugin's hooks, the WITH arm fires UserPromptSubmit and Stop with `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PROJECT_DIR` set, the scaffold finds its case dir through `BASH_SOURCE`, and a relative plugin target is resolved against the eval's own cwd (so the runner passes absolute paths). The `trace` grader target is the stream output, not the transcript, so a hook firing is proven by a file it writes, never by its text.

## [1.19.0] - 2026-09-18

### Added
- **`context-composition`, a 17th metric source — where a session's context went.** From the transcript's real API usage counters (input + cache creation + cache read at each call), it reports the context at the last call and splits it into ten named buckets: instructions (the floor the first call already carried: system prompt, CLAUDE.md, tool schemas, listings), tool results (by tool), hook injections (by family), the model's own writes (tool inputs), its replies, thinking, your prompts, per-turn platform reminders, machine text, and `unattributed`. Assistant-side tokens are real counters; thinking is the real counter and stays in context (measured: over 140 intervals the context never grew by less than the previous call's full output). Only the user side converts chars to tokens, and the ratio is **calibrated** on intervals whose appended text is fully recorded, never assumed — what the ratio cannot explain is named `unattributed` instead of being smeared into a bucket that would then argue for cutting it. Headline keys `ctx.last` and `ctx.harness_pct` join the shipped `--line` pick (owner 2026-09-18: "530K tokens in messages looks excessive").
- `--session <id-prefix>` scopes every transcript source to one session — the mid-sitting question is about this session, not the project's whole life.

### Fixed
- A `<synthetic>` assistant record ("No response requested." after an interrupt) carries all-zero usage and is no longer counted as a call. Counted, it split the session at context 0 and the next real call read as a 428K jump with nothing to explain it (measured on one 2026-08-23 session; the calibrated ratio went from an impossible 1.37 to 2.49 chars/token once excluded).

### Notes
- The earlier hand-run answer (13% harness) double-counted every hook attachment — `JSON.stringify` of the record holds the text twice, as `content` and `stdout` — and assumed 3 chars/token. Measured properly the same session reads 6.2% harness, 38% tool results, 22% writes, 10% thinking. The Bash, WebFetch and thinking figures reproduce within ~1 point; harness and writes do not, because they were wrong.

## [1.18.0] - 2026-09-12

### Added
- `repo-guard` detector #5, `control-char` (block): a raw control byte in tracked source. Measured three times in one sitting — an intended `\b` word boundary delivered as a literal 0x08 BACKSPACE through a shell heredoc. The regex then read with the boundary simply absent and matched nothing, while `node --check` passed, the module loaded, and grep printed what looked correct; only `cat -v` showed `^H`. Findings name the codepoint and the `sed | cat -v` command that reveals it, because a defect a human cannot see must say exactly what it is. Tab, newline and CR are excluded; `fixtures/`, `__fixtures__/` and `testdata/` trees are skipped, where such a byte may be the point.
- On first run it found 11 live bytes in tracked source: 8 deliberate 0x01 glob sentinels in `essense-flow/lib/rule-sweep.cjs` and 2 in repo-guard's own `LOG_SEPARATOR`/`COMMIT_SEPARATOR`. All were converted to `\u0001`-style escapes — identical values, visible intent — rather than allowlisted.

## [1.17.0] - 2026-09-12

### Fixed
- `test-all` now prints a failing suite's **captured output**, not just its exit code. The runner already captured stdout/stderr (`bin/test-all.js:118`); the report threw it away, so `essense-flow:test/run-all.cjs — exit 1` survived four red sweeps across two sessions with zero diagnostic bytes and the "shared resource" hypothesis was never falsifiable. FAILED, SUSPECT and CANNOT RUN each carry a bounded tail excerpt (12 lines / 1200 chars, `|`-prefixed). A suite that fails while printing **nothing** now says so explicitly — silence is itself a diagnosis, and a different bug from a failing assertion.

## [1.16.0] - 2026-09-12

### Fixed
- **"Was this note used?" credited shared boilerplate as use.** A note's distinctive words were counted equally, so the four-instruction preamble every `.steward/` file carries — *quality, context, working, ownership* — scored as evidence against notes an answer never touched, and did so most for the largest files. Terms are now weighted by how rare they are across the whole note corpus: a word in every note counts for nothing, a word in one note of thirteen counts most. Measured effect on this repo: steward-model uptake 79% → 64%, with two "used" verdicts revealed as boilerplate-only hits. Scoring without a corpus is unchanged, so the original audit figure still reproduces.

### Added
- **`asset-value`, a 16th metric source** — which stored knowledge actually earns its place, ranked **per source** (which kb source produced the entry) and **per asset** (the entry itself): surfaced, used, unknown, used %. It also names the assets surfaced repeatedly and never once carried into an answer — the keep/cut shortlist — and reports how many rows are still below the readable floor, because a ranking over two surfacings is noise.
- A drift test that the two copies of the scorer (this plugin's and turn-end's) share identical constants AND score identically. Both file headers had claimed this test existed since 2026-09-11; it did not.

### Notes
- `asset.origin_recorded` is `false` and says why: `.claude/kb/` is gitignored, so an entry has no commit, author or history — only a filename date and a directory. Answering "where did this knowledge come from?" needs a field written at capture time; no reader can recover it.

## [1.15.0] - 2026-09-12

### Added
- **`digest-uptake`, a 15th metric source** — the session digest is the largest standing injection in the stack (it is written at every turn end and injected into every prompt) and it was the only one with no number attached. The run now reports how often it was injected as text versus a pointer, **how often the platform's size bound CUT it** so its tail was never shown, its size on disk, and whether a PAST session's digest was carried into a later session's answer.
- `note-uptake` names digests as their own families (`session-digest-live`, `session-digest-past`) instead of lumping them into `other`.

### Notes
- **`digest.live_used_pct` is deliberately `null`, and the run says so every time.** Scoring the live digest against the same session's answers would be circular: the digest is written FROM those answers, and the only copy on disk is its final state, so bullets written after an answer would score as evidence that answer used them. Making it computable needs kb-pull to record the digest text at the fire; until then the honest value is nothing, not a flattering number.
- The digest's own share of each injection is not recorded per fire either — the report names that rather than estimating it.

## [1.14.0] - 2026-09-11

### Fixed
- **`test-all` could not read node's own test counts.** It looked for the `# pass 13` summary; node 22 and later print `ℹ pass 13`. Every node test file in this repo — 30 of 35 suites — counted as zero checks, so the reported total (1,325) was short of the real one (1,443) and, worse, could not move: adding 16 real tests changed it by 0, and removing them changed it by 0.
- The same blind spot hid skipped suites. With it fixed, one suite is exposed as **"ran but CHECKED NOTHING"** — it had been reporting as a pass for as long as the gate has existed.
- `registry-check`'s `doc-version` claim went blind when a catalog table moved from `**name**` to `[name](link)` rows. It now reads either form, finds the version in any cell, and sweeps `plugins/*/README.md` and `CHANGELOG.md` as well as the root docs.
- `repo-guard`'s allowlist entry for turn-end's release history MOVED with the text when it became `design/notes/turn-end-history.md`. The allowlist is path-keyed, so the same sanctioned Windows-path example resurfaced as a blocking finding at its new path — the guard behaving correctly, and worth remembering: moving a file re-arms every exemption it carried.

### Added
- **`plugin-docs`, an 8th registry-check claim.** Every plugin must have a README, a CHANGELOG whose newest entry is the version it ships, and a marketplace description of at most 200 characters — that description is the text `/plugin` prints at install time, and five plugins had no README at all while three descriptions had grown past 3,500 characters.

## [1.13.0] - 2026-09-11

### Added
- **`note-uptake`** — the scorecard now measures whether surfaced notes were actually USED, by comparing each note's distinctive terms against the answer that followed. The old readings said 0% in every project because they asked whether a file had been opened, of notes whose body is injected directly; real uptake is 71–81%. Unknowns are reported beside the ratio, never folded into it, and the report says on every reading that term overlap is a proxy.
- **Vintage annotation** — a zero from a recorder that was not installed yet is no longer mistaken for a dead mechanism. It happened three times in one audit, each time arguing to delete something that works; the run now names the install date.
- **`vendored-entrypoint`** — a registry check that resolves every vendored dependency's declared entry point against disk. It catches the defect that left essense-flow's CLI dead in every installed copy, silently.

### Changed
- The one-line `[instr]` summary leads with the uptake number instead of a byte count.

## [1.12.0] - 2026-09-09

### Added
- **`harness-stats`** — one run over every trace, ledger and transcript a project left behind, printed in the session: hook bytes per prompt, hints followed, nudges and blocks, judge cost and agreement, tail size, acted-on ratios, checks per sitting, hook spawns per prompt, and running-vs-installed drift. 13 metric sources, each a drop-in file. It reproduces the hand-run audit it was built from to the digit, and prints drift against those baselines.
- A shared **trace schema** every plugin here writes through, with a drift suite that validates each one's own examples — so a dropped field turns a test red instead of quietly changing the data.

## [1.11.0] - 2026-09-06

### Added
- **`repo-guard` detector: machine-guard drift.** The lists that stop hooks reacting to machine-generated text had grown into four different versions across the plugins, and none of them knew about `<system-reminder>`. The guard now blocks a push when the copies differ.

## [1.10.1] - 2026-08-27

### Fixed
- **Run `repo-guard` from the repository root.** From the toolkit's own directory it scans only the toolkit — 8 pre-existing findings elsewhere had been invisible since 08-23. The documentation now names the root-scoped invocation, and the allowlist covers the sanctioned Windows-path examples the first full run surfaced.

### Notes
- Two gate records in that sitting read a pipe's exit code instead of the guard's. Read the exit code directly, never after a pipe.
