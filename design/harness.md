# Harness — what it is, what we have, what completes it (research + plan, 2026-09-08)

> Read this before doing anything:
> - Limits-awareness: Claude drifts, loses context, finishes prematurely, defers, takes shortcuts. Re-read when uncertain. Preserve specifics.
> - Positive mindset: every gap solvable. Find the way by working carefully.
> - Quality ownership: this work matters. Take ownership.
> - Propagation requirement: every descendant artifact must carry these same four instructions.

**Provenance.** Owner asked (verbatim in `.steward/inbox/20260908-1748-owner-research-what-a-harness-is-and-plan-to-make-toolkit-a-complete-harness.md`)
what a harness is, whether this toolkit is one, what would make it complete, how others build them,
and for a detailed plan covering memory, context, pushing work, and verifying work. Method: four
background agents (Anthropic canon · other builders · Claude Code primitives · internal inventory)
plus live verification by the session (hooks doc, SDK reference, loops post, install state, process
tree). Every number is MEASURED (source cited) unless marked *reading*. Readings and the plan are
Claude's; **the owner has ruled on nothing in this document.** Companion sources of record:
`design/continuous-transformation.md` (v3), `design/stack-a-blueprint.md` (§6/§6b plan of record),
`.claude/kb/captures/20260906-1340-second-usage-audit-five-projects-measured.md` (audit 2 numbers),
`.steward/tasks.md` / `.steward/questions.md` (open work).

---

## 0. The answer in one screen

**What a harness is.** Anthropic, three explicit definitions, all 2026:

- "An agent harness (or scaffold) is the system that enables a model to act as an agent: it processes
  inputs, orchestrates tool calls, and returns results. When we evaluate 'an agent,' we're evaluating the
  harness and the model working together." — *Demystifying evals for AI agents*, 2026-01-09.
- "The software scaffolding around a model: the loop, tools, context management, and guardrails that turn
  raw intelligence into a working agent. … Agent harness design is the practice of deciding what belongs in
  that scaffolding and, as models improve, what you can take out." — *Agent Harness Design: 3 Patterns*,
  claude.com/blog, 2026-04-02.
- "Claude Code serves as the agentic harness around Claude: it provides the tools, context management, and
  execution environment that turn a language model into a capable coding agent." — code.claude.com docs,
  *How Claude Code works*.

OpenAI uses the word the same way ("the core agent loop and execution logic that underlies all Codex
experiences", plus thread persistence, config/auth, and tool execution under one policy model), and
SWE-agent's "Agent-Computer Interface" is the same object seen from the tool side. In benchmarks the word
keeps its older meaning — the fixture that runs and grades the agent (SWE-bench, Terminal-Bench).

**Is what we have a harness?** Yes — with one correction to the framing. Claude Code **is** the harness
(loop, tools, compaction, permissions, subagents, memory, 33 hook events). What this repo builds is a
**harness layer on top of it**: plugins that add duties to the loop's end, memory the loop reads and
writes, context the loop is fed, judges and gates the loop must pass. In Anthropic's 2026 vocabulary that
activity is literally "harness design" — deciding what belongs in the scaffolding around the model, and
what to take out. So the honest name for the toolkit is a *harness layer* (or *harness configuration*),
and the question "is it a harness?" becomes "does it cover the components a harness has, and does each
component demonstrably change outcomes?" — a measurable question, answered in §5–§6.

**What a harness must do** (the union of every source in §2–§3, ten components):

| # | Component | We have | Measured state |
|---|---|---|---|
| 1 | Control loop + termination | Stop-end duties (turn-end), fire cap 3 < platform 8 | works; the live process runs 0.6.0 (§5.0) |
| 2 | Tools / ACI | Claude Code's + MCP (kb, serena) | kb MCP 38 calls total; no tool of ours is evaluated |
| 3 | Context management | injections at open + per prompt; 9 KB tail cap; briefing 900 chars | digest UNCAPPED; p95 20.5 KB/prompt; 84% of hints ignored |
| 4 | Persistent memory | kb (4 kinds × 5 castes), steward model, session digest, auto-memory | model-keeping WORKS (97 captures, 28 integrates) |
| 5 | Verification separated from generation | self-check (deterministic), lens agent, repo gates | self-check gameable + Bash-blind; lens has ZERO telemetry |
| 6 | Sub-agent orchestration | 14 agent defs, prism, judge child | judge lean flags shipped; agents inherit 25.6 KB standing context |
| 7 | Checkpoints / recovery | git + status.json + log.md | no "resume the work" mechanism; briefing Next: wrong 4/5 ships |
| 8 | Observability | turn-end trace, kb trace, log.md, statusline | no scorecard; installed≠running invisible; lens untraced |
| 9 | Guardrails / permissions / budgets | fail-open hooks, one blocking tail, fire caps | no cost cap, no PreToolUse guard, no per-sitting agent budget |
| 10 | Evals over harness + model | two manual audits (08-23, 09-06) | "does it do anything?" took two audits and seven agents |

**The law every 2026 Anthropic source repeats:** "every component in a harness encodes an assumption about
what the model can't do on its own, and those assumptions … can quickly go stale as models improve"
(Rajasekaran 2026-03-24; Martin 2026-04-02; Managed Agents 2026-04-08). Their own harness for
long-running apps **dropped context resets and the sprint construct** when Opus 4.6 landed. Read against
audit 2, this is the verdict the owner already reached ("fold > add", deletions first): the push side of
this toolkit is over-built and unread; the goal, verify, observe and guard sides are under-built.

**What completes it — six mechanisms, none of them "more injection":**

1. **Ground truth the loop can see** — record what checks actually ran and what they returned
   (PostToolUse), and let `self-check` be satisfied only by recorded outcomes, never by prose.
2. **Goal-based termination** — the steward's per-task *done-checks* become completion criteria the loop
   is held to (`/goal`-shaped), so "stopping while there is planned work" is a mechanism failure, not a
   plea in CLAUDE.md.
3. **Evaluator ≠ generator, and the evaluator is measured** — the lens/judge keep fresh context and get a
   trace (confirm/refute/acted-on), so their value is a number.
4. **One trace schema + a scorecard** — hint-followed %, tail bytes, judge ms, blocks, contradictions,
   running-vs-installed — printed as one `[instr]` line; a mechanism ships with its metric or does not ship.
5. **One injection channel with a budget** — a `{trigger, injection, budget}` registry replacing the six
   UserPromptSubmit spawns; demands first; hard 10 KB law everywhere; compaction guarded.
6. **Guards at the environment layer** — budgets (cost, fires, agents per sitting), a running-version
   instrument, and settings-level `permissions.deny` rules (never a hook-returned deny — invariant 8)
   where a deterministic rule beats a prose warning.

The plan (§8) sequences these as five phases, each with a named check, mapped onto the tasks and
questions that already exist so nothing is duplicated.

---

## 1. Definitions and the layer model

### 1.1 Vocabulary (Anthropic, verbatim where it matters)

- **Agent**: "LLMs autonomously using tools in a loop" (*Effective context engineering*, 2025-09-29).
  The loop: "Claude evaluates your prompt, calls tools to take action, receives the results, and repeats
  until the task is complete" — it ends "when Claude produces output with no tool calls" (*Agent SDK:
  agent loop* doc).
- **Workflow vs agent** (2024-12-19): "Workflows are systems where LLMs and tools are orchestrated through
  predefined code paths. Agents … dynamically direct their own processes and tool usage." In 2026 a
  *dynamic workflow* is "Claude writ[ing] its own harness on the fly, custom-built for the task at hand"
  (claude.com/blog, 2026-06-02).
- **Harness / scaffold**: synonyms (evals post). Narrow form in Managed Agents: "the loop that calls Claude
  and routes Claude's tool calls to the relevant infrastructure", with *session* (append-only event log)
  and *sandbox* split out as sibling primitives.
- **Context engineering**: "the set of strategies for curating and maintaining the optimal set of tokens
  during LLM inference"; *context rot*: "as the number of tokens in the context window increases, the
  model's ability to accurately recall information from that context decreases."
- **Tools**: "a contract between deterministic systems and non-deterministic agents" (*Writing tools*,
  2025-09-11).
- **Loop** (loops post, 2026-06-30): "agents repeating cycles of work until a stop condition is met";
  taxonomy **turn-based** (stops when Claude judges it done) → **goal-based** (`/goal`: explicit success
  criterion + turn cap, separate evaluator) → **time-based** (`/loop`, `/schedule`) → **proactive**
  (event/schedule, no human in real time).

### 1.2 The four layers this repo lives in

```
L0  model             Claude (Fable/Opus/Sonnet/Haiku) — what changes under us every release
L1  platform harness  Claude Code: agentic loop, built-in tools, compaction, permissions, subagents,
                      CLAUDE.md + auto-memory, 33 hook events, /goal, /loop, workflows, telemetry
L2  harness layer     THIS REPO + ~/.claude settings: hooks (SessionStart, UserPromptSubmit, PreToolUse,
                      Stop), duties, judges, skills, agents, MCP (kb), statusline, home hooks
L3  project substrate CLAUDE.md, .steward/ model, .claude/kb/, tests, git — what L2 reads and writes
```

Two consequences. First, L2 never owns the loop; it owns *what the loop is fed and what it must pass*.
Every L2 mechanism is therefore one of: an **injection** (context in), a **duty** (a condition at a
lifecycle point), a **judge** (an LLM asked a narrow question), a **gate** (a deterministic check with
an exit code), a **source** (memory read), or a **writer** (memory written). Second, L2 competes with L1
for the same attention budget: standing context is 25.6 KB per session *and per sub-agent* (global
CLAUDE.md 6.5 KB, project CLAUDE.md 16.2 KB, MEMORY.md 2.9 KB — audit 2) before a single prompt.

### 1.3 The rule that follows

Harness design (Martin) = decide what belongs and what to take out. The house corollary, first stated in
`.steward/inbox/20260906-1500-…` and now sourced: **a mechanism ships with its result metric or it does
not ship**, and a mechanism whose metric shows nothing is removed. Anthropic's own measured removals: the
2025 long-running harness's context resets ("dead weight" on Opus 4.5/4.6), the sprint construct, the
per-sprint evaluator. Ours, measured on 2026-09-06: kb-hints (84% ignored), the digest over 10 KB (stubbed
unread 51×), briefing prose (contradicted by the log in 4/5 ships), essense-flow + autopilot Stop hooks
(~430 fires each, 0 pipeline uses since 08-10).

---

## 2. What Anthropic's harnesses actually do (mechanisms, with evidence)

The mechanisms below are the ones with a stated result. The quoted passages per source, with URL and
fetch date, are persisted in `.claude/kb/captures/20260908-1830-harness-research-sources.md` (the
session scratchpad rotates; a kb capture does not).

| Mechanism | Source | Evidence / numbers |
|---|---|---|
| **Initializer + progress file + feature list**: session 1 writes `feature_list.json` (200+ items, all `passes:false`), `init.sh`, `claude-progress.txt`; later sessions read git log + progress, pick ONE feature, verify end-to-end in a browser, flip one field, commit | *Effective harnesses for long-running agents* 2025-11-26; `claude-quickstarts/autonomous-coding` (code read) | one-feature-per-session "turned out to be critical"; browser verification "dramatically improved performance" (qualitative); the loop has NO completion detection — `--max-iterations` is the only stop |
| **Planner → Generator → Evaluator** with hard thresholds per criterion; agents talk through files; evaluator tuned skeptical | *Harness design for long-running app development* 2026-03-24 | full harness 6 h / $200 vs solo 20 min / $9 on the same app; "Out of the box, Claude is a poor QA agent … talk itself into deciding they weren't a big deal" |
| **Verification ladder**: in-prompt check → `/goal` (separate evaluator each turn) → Stop hook (platform overrides after 8 consecutive blocks) → verification subagent "so the agent doing the work isn't the one grading it" | docs *Best practices* | "Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available, and you become the verification loop." |
| **`/goal`** = "a wrapper around a session-scoped prompt-based Stop hook"; Haiku evaluator returns Not-yet-met / Met / Impossible; stalls return control; evaluator "doesn't run commands or read files" | docs `/goal` | design constants only, no published measurement |
| **Ralph loop**: Stop hook re-feeds the same prompt until `<promise>` text or max iterations; state in `.claude/ralph-loop.local.md` | `anthropics/claude-code` plugins/ralph-wiggum (code read); scientific-computing post uses `--max-iterations 20` against "agentic laziness" | unmeasured; "This loop cannot be stopped manually" without a limit |
| **Sub-agents return condensed summaries (1,000–2,000 tokens)**; lead saves its plan to memory because >200k tokens truncate; artifacts to the filesystem, not "a game of telephone" | *Multi-agent research system* 2025-06-13; *Context engineering* | multi-agent +90.2% over single Opus 4; token usage explains 80% of variance; tool-testing agent −40% completion time |
| **Just-in-time retrieval** (paths, grep, head/tail) over pre-loading; compaction keeps decisions + unresolved bugs, drops tool outputs first; structured notes outside context (NOTES.md / CHANGELOG as "lab notes" so "successive sessions will not re-attempt the same dead ends") | *Context engineering*; *How Claude Code works*; scientific-computing 2026-03-23 | self-filtered tool outputs 45.3% → 61.6% (BrowseComp); memory folder 60.4% → 67.2%; compaction 43% (Sonnet 4.5) vs 84% (Opus 4.6) |
| **Tools as the prompt**: few consolidated tools, high-signal returns, 25k-token result cap, Claude rewrites its own tool descriptions | *Writing tools for agents* | SOTA SWE-bench Verified after tool-description refinements; 72 vs 206 tokens per concise/detailed format |
| **Task verifier nearly perfect** or "Claude will solve the wrong problem"; test harness prints one grep-able `ERROR` line; "Claude can't tell time" → sampled fast tests | *C compiler with parallel Claudes* 2026-02-05 | ~2,000 sessions, $20k, 100k LOC, 99% torture-suite pass |
| **Containment at the environment layer, then steer the model**: sandbox, allow-lists, PreToolUse security hook, auto-mode classifier that strips reasoning "so the agent can't talk the classifier into a bad call", stops after 3 consecutive / 20 total denials | *Auto mode* 2026-03-25; *How we contain Claude* 2026-05-25; quickstart `client.py`/`security.py` | sandbox −84% permission prompts; auto mode 0.4% FP / 17% FN |
| **Evals over harness+model**: 20–50 tasks from real failures, isolated trials, outcome grading, read transcripts ("Failures should seem fair"), per-model evals for every system-prompt change | *Demystifying evals* 2026-01-09; *April 23 postmortem* 2026 | CORE-Bench 42% → 95% after grader/harness fixes; a 25/100-word verbosity instruction cost 3% on evals |
| **Prompt-cache-stable harness**: static-first layering, `<system-reminder>` messages instead of prompt edits, never add/remove tools mid-session | *Prompt caching is everything* 2026-04-30 | "we build our entire harness around prompt caching" |
| **Dynamic workflow patterns**: classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter, tournament, loop-until-done; token budgets; resumable | claude.com/blog 2026-06-02; docs *workflows* | named failure modes: agentic laziness ("35 of the 50 items"), self-preferential bias, goal drift ("each summarization step is lossy") |

**Failure modes the harness exists for** (each named by at least one source): context rot · one-shotting
· premature "done" / agentic laziness · self-grading bias · lost state across windows · goal drift via
compaction · tool misuse · solving the wrong problem (bad verifier) · time blindness · **stale harness**.

---

## 3. How other teams build harnesses

Source rule honored: official blogs/docs/repos and authors' papers; the Ralph original (ghuntley.com) is
marked lower-confidence and its official mirror (the `anthropics/claude-code` plugin) is what §2 cites.
OpenAI's site blocks non-browser fetches; its three posts were read from Wayback snapshots of the official
URLs (snapshot ids in the sources capture named in §2).

### 3.1 Mechanisms by team

| Team / source | Defining move | Concrete mechanisms | Evidence |
|---|---|---|---|
| **OpenAI — *Harness engineering*** (2026-02-11): five months, 0 hand-written lines, ~1M LOC, ~1,500 PRs, 3→7 engineers | "Humans steer. Agents execute." The engineer designs environments, specifies intent, builds feedback loops | ~100-line `AGENTS.md` as a *map* into a linted `docs/` system of record (design docs + `core-beliefs.md`, `exec-plans/{active,completed,tech-debt-tracker.md}`, generated schema docs, `QUALITY_SCORE.md`); big AGENTS.md rejected for four reasons ("When everything is 'important,' nothing is"; "It rots instantly"; crowds out task context; can't be mechanically checked) · execution plans with progress + decision logs **checked into the repo** · CI linters that validate the docs are current and cross-linked · a recurring "doc-gardening" agent opening fix-up PRs · architecture invariants enforced by custom linters whose **error messages inject remediation instructions into agent context** ("When documentation falls short, we promote the rule into code") · per-worktree observability stack (logs/metrics/traces via LogQL/PromQL + Chrome DevTools) handed to the agent · PR loop "until all agent reviewers are satisfied (effectively this is a Ralph Wiggum Loop)" · entropy management: "golden principles" + background agents that scan for deviations and open one-minute refactor PRs ("This functions like garbage collection"); Friday cleanups "didn't scale" | ~3.5 PRs/engineer/day, "about 1/10th the time"; single runs "upwards of six hours"; authors warn autonomy "depends heavily on the specific structure and tooling of this repository" |
| **OpenAI Codex harness** (loop post 2026-01-23; app-server post 2026-02-04; docs) | Harness = loop + thread persistence + config/auth + tool execution under one policy | Prompt assembled append-only so "the old prompt is an exact prefix of the new prompt" (cache); config changes appended as messages, never edited in; compaction into an opaque `encrypted_content` item at `auto_compact_limit` · Item → Turn → Thread primitives, threads durable (create/resume/fork/archive), approvals pause the turn server-side · `AGENTS.md` discovery root→cwd, nearer files win, 32 KiB cap · hooks: `PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, UserPromptSubmit, SubagentStop, Stop, SessionStart, SessionEnd, SubagentStart, Interrupt` ("Keep conversations running via Stop and SubagentStop hooks"; "Summarize chats to create persistent memories automatically") · OS sandbox modes orthogonal to approval policy ("The sandbox defines technical boundaries. The approval policy decides when the agent must stop and ask") · **memories auto-generated in the background from idle sessions**, secrets redacted, per-chat toggle · subagents inherit the sandbox, `max_concurrent_threads_per_session` | a real cache-miss bug: MCP tools enumerated in inconsistent order |
| **SWE-agent — Agent-Computer Interface** (arXiv 2405.15793) | "an abstraction layer between the LM agent and computer" — LM agents are "a new category of end users" | 100-line file viewer with scroll/goto · edit command **rejected on lint errors** and reverted · search returning "at most 50 results", over-limit queries return nothing · history processor collapsing observations older than the last 5 to one line · $4/instance cost cap with auto-submit | SWE-bench Lite: full ACI 18.0% vs shell-only 11.0% (+64% relative); 30-line window 14.3%, whole file 12.7%; no linting 15.0%, no edit tool 10.3%; full history 15.0% |
| **OpenHands** (paper 2407.16741; condenser blog 2025-04-09; SDK docs) | Event stream as the single history, executed in a per-task Docker sandbox | Append-only event sourcing with resume · **condenser**: keep first 4 events + recent tail, LLM summary of the "forgotten" middle, triggered at 120 events or on a context-window error · **stuck detector** (default on): 4+ identical action/observation pairs, 3+ identical action/error pairs, 3+ agent messages without progress, 6+ ping-pong cycles · `MAX_ITERATIONS` 100, `MAX_BUDGET_PER_TASK`, sandbox timeout · repo memory as skills with `null` (always), keyword, task, and path triggers | SWE-bench Verified 54% with condenser vs 53% without, per-turn cost "<50% of baseline", linear instead of quadratic growth; the agent is never told its iteration budget (limits enforced, not communicated) |
| **Cognition** (*Don't build multi-agents* 2025-06-12; *Devin Fusion* 2026-06-29) | "Share context, and share full agent traces"; "Actions carry implicit decisions, and conflicting decisions carry bad results" | single-threaded linear agent · a dedicated compression model that "distills agent histories into key decisions and events" · subagents sequential, read-only, question-answering — never writing code · 2026: a cheaper "sidekick" executes while the frontier model keeps "the plan, the interpretation of ambiguity, the final review"; model switches happen at compaction boundaries so the cache is not lost | Fusion: −60% cost at −1.8 points (FrontierCode 1.1); "88% of internal merged PRs" router-driven |
| **Manus** (*Context engineering* 2025-07-18) | KV-cache hit rate is "the single most important metric" | stable prefix (no timestamps), append-only, deterministic serialization · **mask, don't remove** tools (logit masking with consistent name prefixes) · file system as "the ultimate context … unlimited in size, persistent by nature", compression must be *restorable* (keep the URL, drop the page) · **recitation**: rewrite `todo.md` every step to pull the goal into recent attention · "leave the wrong turns in the context" — error recovery is "one of the clearest indicators of true agentic behavior" · add structured variation against few-shot ruts | ~100:1 input:output tokens; cached 0.30 vs uncached 3 USD/MTok; ~50 tool calls per task |
| **LangChain — Deep Agents** (blog 2025-07-02 / 07-30; docs) | Context engineering = Write / Select / Compress / Isolate | detailed system prompt · a planning tool that is "basically a no-op … just context engineering strategy to keep the agent on track" · subagents for isolation returning only final results · the file system as the shared workspace · docs call the package "an agent harness" with four pillars: execution environment, context management (skills by progressive disclosure, AGENTS.md memory, summarization/offload, caching), delegation (`write_todos`, ephemeral subagents), steering (`interrupt_on` for human approval) | cites Claude Code auto-compact at 95% and RAG over tool descriptions improving selection 3× |
| **Aider** (docs) | The repo map is the context | tree-sitter definitions/references → dependency graph → ranked map fitted to `--map-tokens` (default 1,000) · built-in linters after every edit, `--auto-test` re-run until exit 0 · **every edit auto-committed** with a generated message, `/undo` | lint/test loop documented as the repair driver; formatter-exits-non-zero gotcha |
| **Cursor** (docs, changelogs 1.0 / 1.2) | "Large language models don't retain memory between completions" | `.cursor/rules/*.mdc` with `alwaysApply` / description-driven / glob-attached / manual modes, nested AGENTS.md accepted · **Memories** GA in 1.2 "with user approvals for background-generated memories to preserve trust" · structured to-do lists; Plan Mode = research → clarifying questions → saved markdown plan → build; advice on failure: revert, refine the plan, rerun · cloud agents in isolated VMs with `hooks.json` for formatters/audits/policy: "Agents are only as capable as the environments they run in" | — |
| **Google Gemini CLI** (docs) | Hierarchical context + shadow-git checkpoints | global → workspace → ancestor `GEMINI.md`, plus just-in-time scan of directories touched by tools, all concatenated every prompt · memory tool edits Markdown files directly · **checkpointing**: before any file-modifying tool, a commit in a shadow git repo (`~/.gemini/history/<hash>`) + conversation + pending call; `/restore` reverts both · eleven hook events incl. `BeforeModel/AfterModel`, `BeforeToolSelection` (filter tools), `PreCompress`; project hooks fingerprinted so changes warn | — |
| **Ralph Wiggum loop** (official plugin; original ghuntley.com 2025-07-14, lower confidence) | "deterministically bad in an undeterministic world" — repeated failure is a signal to fix the prompt, not the loop | same prompt every iteration, fresh context, state only in files/git; tests as backpressure; one task per loop; `--max-iterations` "the primary safety mechanism"; exact-string completion promise; unsuited to human-judgment tasks | reported failure mode: loops forever on impossible tasks |
| **Eval harnesses** (SWE-bench, Terminal-Bench/Harbor) | The fixture that runs and grades | one container per instance, apply patch, `FAIL_TO_PASS` must flip and `PASS_TO_PASS` must not regress; Terminal-Bench tasks = instruction + test script + oracle solution; Harbor adds logging, streaming, adapters, parallelism | SWE-bench Verified: 500 human-confirmed-solvable problems |
| **Empirical scaffold effects** | Scaffold choice is a first-order variable | METR (2025-04-16): o3 tested "with simple agent scaffolds … no elicitation", so measured capability is a lower bound; METR Time Horizon 1.1 (2026-01-29): the same models score significantly differently under two scaffolds · Galster et al. (arXiv 2602.14690, 2,853 repos): context files dominate real-world configuration and are often the only mechanism; AGENTS.md is the interop standard; skills/subagents rarely adopted and skills are mostly static text · Starace (arXiv 2606.08529, single author, lower confidence): scaffold alone moved GAIA accuracy up to 28 pp within one model | — |

### 3.2 Where the sources disagree

- **Multi-agent vs single thread.** Cognition 2025: parallel subagents make conflicting implicit decisions;
  one linear agent + compression. LangChain, Codex, OpenAI's harness post, Anthropic's research system and
  Cognition's own 2026 Fusion all use children — but every one keeps **a single decision-owner** and uses
  children for isolated, result-only work (read, review, execute). Convergent rule: parallelism for
  reading/reviewing/executing, never for deciding. (prism already obeys this: synthesis stays in the
  session, never a sixth agent.)
- **Remove vs mask tools.** Manus and the Codex loop post: never change tool definitions mid-run (cache
  + confusion); Gemini's `BeforeToolSelection` hook filters tools per turn — exactly the penalty Manus
  warns about. Anthropic's caching post sides with Manus ("never add/remove tools mid-session").
- **Instructions-as-text vs deterministic guardrails.** OpenAI: text rots and cannot be checked — promote
  rules into linters whose messages carry the fix. Cursor/Gemini/Codex ship rich instruction hierarchies,
  and Galster et al. find text is what people actually use. Only the guardrail side has measured wins
  (SWE-agent +3 pp from lint-rejected edits); no source shows a win from *more* instruction text, and OpenAI
  reports the opposite for big files. **This repo's invariant 3 ("mechanisms, not text") is the measured
  side of this argument.**
- **Keep errors vs compress them away.** Manus keeps wrong turns in context; OpenHands and Codex summarize
  them past a threshold; SWE-agent collapses old observations to one line. Unresolved — belief-updating
  vs cost.
- **Big memory file vs map + progressive disclosure.** OpenAI ~100 lines + pointers; Gemini concatenates
  every discovered file into every prompt; Codex caps at 32 KiB; Cursor's glob-scoped rules and
  OpenHands' path-triggered skills sit between. (Our root CLAUDE.md is 16.2 KB and the global one 6.5 KB
  — the Codex cap would already be close.)
- **Fresh context per iteration (Ralph) vs continuous context (Cognition).** Both agree the durable
  state must live outside the window.

### 3.3 The recurring failure modes, with who names them

1. Context exhaustion / quadratic growth — Codex, OpenHands, SWE-agent, Manus, LangChain.
2. Lost-in-the-middle goal drift — Manus (recitation), LangChain (no-op planner), Cursor (to-dos), OpenAI (checked-in plans).
3. Cascading edit errors — SWE-agent (lint-rejected edits), Aider (lint/test loop), OpenAI (linters with remediation text).
4. Infinite or unproductive loops — OpenHands (stuck detector, iteration cap), Ralph (`--max-iterations`), SWE-agent (cost cap).
5. Instruction rot and context crowding — OpenAI (four failures of the big AGENTS.md; doc-gardening), Cursor (scoped rules), Codex (32 KiB cap).
6. Illegible environment — OpenAI ("anything it can't access in-context while running effectively doesn't exist"), Cursor, Aider, OpenHands.
7. Pattern replication / entropy — OpenAI (golden principles + GC agents), Manus (few-shot ruts).
8. Conflicting decisions across agents — Cognition.
9. Cache-busting cost — Manus, Codex, Anthropic.
10. Unsafe or unapproved actions — Codex (sandbox vs approval), OpenHands (confirmation mode), Gemini (checkpoint restore).
11. Lost work across sessions/tabs — Codex (server-side threads), Gemini (checkpoints), Ralph/OpenAI (git as ledger).
12. Unmeasured scaffold effects — METR, Galster, Starace.

### 3.4 What transfers to this repo (reading)

- OpenAI's **linters whose messages carry the remediation** is the shape our gates already have
  (`repo-guard`, `registry-check`) — and the shape `self-check`'s tail should have (name the un-checked
  mutation, name the command that would check it).
- OpenAI's **doc-gardening / GC agent** is the steward's recompute pass, already built and measured to
  work; their **checked-in exec plans with decision logs** are `.steward/tasks.md` + `log.md`. The gap is
  not the artifact; it is that nothing *mechanical* reads them at the loop's end (§6 G3).
- OpenHands' **stuck detector** and SWE-agent's **capped outputs** are the same class as our fire cap and
  the 10 KB law: deterministic termination and size rules the model is never asked to obey.
- Codex's and Cursor's **background-generated memories with user approval** are the shape Q16 should take
  (background seed, visible diff, owner toggle) — both vendors converged on approval "to preserve trust".
- Manus's **recitation** is what a PostCompact "where we are" block does (§6 G8), and what the steward
  briefing's computed `Next:` line should do at open (#8).
- Cognition's **single decision-owner** is prism's existing rule; the same rule should govern judge and
  lens: they inform, the session decides.
- Gemini's **shadow-git checkpoints** are covered by Claude Code's own `/rewind`; nothing to build.

---

## 4. The platform surface today (verified 2026-09-08)

What L1 already provides that L2 can build on. **Bold** = we use it today; plain = unused by any plugin
in this repo; *italic* = new since early 2026 (verify before building on it).

| Axis | Primitives |
|---|---|
| Lifecycle hooks (33 events) | **SessionStart** (matchers startup/resume/clear/compact), **UserPromptSubmit** (can block), **PreToolUse** (can block/allow/edit input), PostToolUse, PostToolUseFailure, *PostToolBatch*, **Stop** (exit 2 / `decision:block` continues the turn), SubagentStart, SubagentStop (can block), PreCompact, *PostCompact*, SessionEnd, Notification, PermissionRequest, PermissionDenied, *TaskCreated/TaskCompleted* (can block), *TeammateIdle*, *ConfigChange*, *InstructionsLoaded*, *FileChanged*, *StopFailure*, *PreModelSwitch/PostModelSwitch*, *Setup*, worktree + cwd + elicitation events. Handler types: command, http, mcp_tool, **prompt** (LLM single-turn), *agent* (subagent with Read/Grep/Glob). Fields: `async`, *`asyncRewake`* (background hook that wakes Claude on exit 2), `once` (skill frontmatter only), `timeout`, `if` |
| Memory | **CLAUDE.md hierarchy** (managed/user/project/local, `@imports`, `.claude/rules/*.md` path-scoped), **auto-memory** (`MEMORY.md` index ≤200 lines / 25 KB, typed topic files, `modified:` stamp), per-subagent `memory:` scope, transcript JSONL at `~/.claude/projects/<proj>/<session>.jsonl` (format internal) |
| Context | auto-compaction (clears older tool outputs first, then summarizes; CLAUDE.md re-injected), `/compact <instructions>`, a compaction-preservation section in CLAUDE.md, PreCompact `trigger: manual|auto`, `--setting-sources` (**our judge child uses `""`**), `/resume` from summary, `/branch`, `/rewind` checkpoints, `/context`, `/usage` |
| Loops / pushing work | `/goal <criterion>` (goal-based, evaluator + turn cap — NOTE: while background work runs, `/goal` "starts a turn on its own to deliver the check-in", up to three idle check-ins per goal, first at 30 min; under invariant 1 set `CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0` before any use, or exclude it — §9.5), `/loop <interval> <prompt>`, `/schedule` + routines (cloud; owner law forbids unattended time-autonomy — invariant 1), background subagents + `/tasks`, **Workflow** scripts (`agent()`, `pipeline()`, `parallel()`, `phase()`, token budgets, resumable), agent teams (experimental), worktrees (`--in-worktree`, `isolation: worktree`), `claude -p` headless (`--output-format json|stream-json`, `--json-schema`, `--max-turns`, **`--setting-sources`**, `--bare`, `--append-system-prompt`, `--agents`, `--resume/--continue`) |
| Sub-agents | frontmatter `tools`, `disallowedTools`, `model`, `permissionMode` (bypass/acceptEdits do NOT cascade), `maxTurns`, `effort`, `background`, `isolation`, `memory`, `skills`, `hooks` (agent-scoped PreToolUse/PostToolUse/Stop), `initialPrompt`; fork (`subagent_type: fork`) inherits history; non-fork agents get CLAUDE.md but NOT conversation history or auto-memory; SendMessage continuation |
| Verification | PostToolUse lint/test hooks, `/goal` evaluator, Stop-hook ladder, verification subagent, `claude plugin eval` (early access: regex / tool_used / tool_order / file_exists / llm / baseline graders, `--ablation with-without`), `/skill-doctor` (per-skill cost, never-invoked warnings), permissions rules `Tool(prefix*)`, sandbox (macOS/Linux; not Windows), `/code-review`, `/security-review` |
| Observability | OpenTelemetry (`CLAUDE_CODE_ENABLE_TELEMETRY=1`; metrics `claude_code.cost.usage`, `token.usage`, `session.count`, `lines_of_code.count`, `active_time.total` with `agent.name` / `skill.name` / `plugin.name` attributes; events `api_request`, `api_error`, `tool_result`), `/cost`, `/usage`, hook `session_id` / `prompt_id` / `transcript_path`, `--verbose`, **statusline** |
| SDK (if L2 ever runs its own loop) | `query({prompt, options})`; `Options.hooks: Partial<Record<HookEvent, HookCallbackMatcher[]>>`; `canUseTool(request, {signal}) → PermissionResult`; `settingSources: ["user","project","local"]`; `maxTurns`, `maxBudgetUsd` (covers subagents; `error_max_budget_usd` result); `outputFormat: {type:'json_schema', schema}`; `agents: Record<string, AgentDefinition>`; `resume`, `continue`, `forkSession`, `resumeSessionAt`; `tool()` + `createSdkMcpServer()`; result subtypes `success | error_max_turns | error_max_budget_usd | error_during_execution` |
| Plugins | `plugin.json` ships skills, commands, agents, hooks, MCP servers, LSP servers, *monitors* (background `tail -F`, stdout as notifications), *themes*, settings (`agent`, `subagentStatusLine` only), `bin/` on PATH; `${CLAUDE_PLUGIN_ROOT}`, *`${CLAUDE_PLUGIN_DATA}`* (persistent per-plugin store), `userConfig` prompts, `dependencies` |

Unused-by-us events with direct value, already named in `design/building-blocks-catalog.md:23-24`
(PostToolUse "observe tool RESULTS — auto-record test/check outcomes"; PreCompact "snapshot digest before
compaction"). New in 2026 and relevant: PostCompact (re-inject the digest after compaction), SubagentStop
(observe agent returns without transcript scans), TaskCreated/TaskCompleted (bind Claude's own task list
to `status.json`), `asyncRewake` (a long check runs in the background and wakes the session only on
failure), agent-type hooks (verify a condition with Read/Grep before deciding).

---

## 5. What we have — inventory mapped to the ten components

Condensed from the inventory agent's report (paths are where to look; numbers from audit 2 unless dated).

### 5.0 A live fact that reframes every status below

This session's process (`claude.exe` PID 34664) started 2026-09-06 12:32:45; turn-end 0.7.0 was installed
15:15:41 the same day. `installed_plugins.json` → 0.7.0; the cache holds both `0.6.0/` and `0.7.0/`; both of
today's trace lines carry the 0.6.0 field set (`grep -c '"deferred"' .claude/turn-end/trace.jsonl` = 0
over 127 lines). `/clear` does not reload plugins. **Every dogfood trace since the ship is 0.6.0 data**,
and the deferral primitive that would have stood the closure duties down while four agents ran today was
not running. The log's "SHIPPED + PUSHED + INSTALLED" was true of the disk and false of the process.
No hook-side instrument could have shown it. **Prior art:** the same class was established for MCP on
2026-07-27 (`.claude/kb/captures/20260727-0310-what-runs-is-not-what-is-on-disk.md` — a stdio server
keeps the code it was launched with; three silent lags; mitigation: `kb_overview` returns
`{version, startedAt}` to compare against `installed_plugins.json`'s `lastUpdated`, "never against the
checkout"). Today's finding is that capture's hook-side twin: `CLAUDE_PLUGIN_ROOT` resolves at process
start. G1 (§6) reuses the same instrument shape — report the running version + start time, compare to
the ledger — rather than inventing a second one. (Component 8 gap.)

### 5.1 Control loop + termination (component 1)
- `turn-end` is THE blocking Stop hook: escalation `additionalContext` → `decision:block`
  (`plugins/turn-end/lib/runner.js:185-193`), `MAX_FIRES_PER_PROMPT = 3` under the platform's 8 (`:37-38`),
  tail `MAX_TAIL_CHARS = 9000` demands → errors → material (`:53`, `:128-137`). Duties are a hard-coded
  array (`lib/duties/index.js:52-59`). Deferral primitive `lib/deferral.js:27-45` (0.7.0, not live here).
- Other Stop hooks: essense-flow `next-step.js` (advisory) and essense-autopilot (blocking, opt-in OFF,
  but ENABLED and firing ~430× in every project with 0 pipeline uses since 08-10) — invariant 9 ("one
  blocking tail") holds except there; task #3.
- Measured: 127 trace lines here — 86 advise / 26 allow / 15 block; 0 errored across ~380 fires in 10
  traces; the pre-0.7.0 exhaustion loop ran 9 fires and was ended by the platform's own override.
- Gap: no goal-based termination — nothing holds the loop to a *completion criterion* for the work; the
  tail only holds it to housekeeping (digest, closure, check named). The owner's "stopping while there is
  planned work" (twin 08-12) is exactly the un-held criterion.

### 5.2 Tools / ACI (component 2)
- Ours: kb MCP (`kb_query`/`kb_read`/`kb_overview`, alwaysLoad), serena MCP (home), skills as
  on-demand tools. Measured: kb MCP 38 calls across 212 prompts; the serena PreToolUse wrapper costs ~200 ms
  per tool call and DENIES the 3rd consecutive code Read.
- Gap: no tool of ours has an eval (Anthropic: tool descriptions were the single biggest SWE-bench lever);
  the 7.9 KB skill listing is paid by every judge child.

### 5.3 Context management (component 3)
- Injections: steward briefing ≤900 chars + `[instr]` computed line + ⚠ freshness (`steward-brief.js`);
  kb-pull ≤3 hints + **whole session digest, uncapped by default** (`kb-pull.js:50-51`, still true on
  disk today — task #27); patterns menu ≤1,100 chars; thorough-mode; home hooks (verification-rules,
  generalize-first). Guards: one canonical machine-text marker list (0.12.0 / #25), `MK_TURN_END_DEPTH`.
- Measured: per prompt avg 6.3 KB, p50 4.5 KB, p95 20.5 KB, max 31.7 KB; rising after 08-23 while pull
  fell to ~0; platform stubs any hook output >10 KB to a 2 KB preview (51× kb-pull + 2× recall per the
  audit's errata, 1× a turn-end tail);
  ≥8 UserPromptSubmit + 5 Stop spawns per prompt; five surfaces for one design-open concern (1,645 B per
  design prompt + 1,788 B standing — Q15).
- Compaction: NO PreCompact/PostCompact hook; the digest survives only because `kb-session-start.js`
  treats `compact` as a continuing source.
- Sub-agent isolation: judge child lean (`lib/judges/claude-p.js:67`, measured 33 s → 3.9 s); steward pass, lens,
  prism panels get none — each pays the full 25.6 KB + hooks.

### 5.4 Persistent memory (component 4)
- Layers: CLAUDE.md (221 lines root + 11 plugin files); auto-memory (`MEMORY.md` 2.9 KB); kb captures (15
  here) / extracted (6) / digests (23) / session digest; steward model (`.steward/*`, single writer = the
  steward agent; `status.json` lifecycle ledger with 10 rules); handoffs (0 uses ever); serena memories
  (outside every model).
- Measured: model-keeping WORKS — 97 inbox captures, 28 integrates, 108 digest edits, recompute quality
  unchanged since 08-23; kb entry quality high (174/174 frontmatter). Where it fails: the two projects with
  NO kb/steward ("why is it not saved?") — Q16; briefing prose wrong 4/5 ships — #8; status contract
  adopted 1/5 ships; this repo's own KB is gitignored (single-machine).
- Gap vs canon: we have the *notes* half (captures, log, digest) and lack the *progress-state the loop
  consumes* half — Anthropic's `feature_list.json` + `claude-progress.txt` and OpenAI's checked-in exec
  plans are `tasks.md` + `status.json` here, but no mechanism reads them at the loop's end to decide "done
  or not".

### 5.5 Verification separated from generation (component 5)
- Deterministic: `self-check` (block, satisfied by an evidence registry — but "Check: none" satisfies it
  and Bash `sed -i` is invisible: `self-check.js:53-55`, `:119-120`; blocked 42×, 30 on a project where the
  owner asked for LESS testing) — #28; repo gates `repo-guard` (4 detectors) · `test-all` (33 suites /
  1,783 checks, discovery by shape) · `registry-check` (6 claim sources); the "named check" clause in every
  log entry, schema-required for `integrated` items.
- LLM-judged: `verifiability-lens` (27 dispatches, **zero telemetry**); essense-flow validator (one per
  finding, quote-drift first, `all-required` quorum — sound design, 0 uses); context-recall judge.
- Gap vs canon: the generator grades itself in the common path (self-check reads the generator's own
  prose); the fresh-context evaluator exists but is unmeasured; no ground-truth recorder (PostToolUse) so
  "tests pass" is a claim, not an observation. Measured today: context-recall's "did not use" detector is
  blind to Bash reads (it re-served the audit capture the session had read via `head -c`).

### 5.6 Sub-agent orchestration (component 6)
- 12 essense-flow agents (0 uses), steward agent (one background pass per sitting, diff ≤10 lines), lens
  agent (read-only, 11 tools), prism (zero code, session-side synthesis, ~370k agent tokens per design
  panel vs a 75–150k target), judge child (`claude -p`, lean, fail-open retry, `lean: applied|fallback` in
  the verdict). Measured: 235 of 269 session files were judge children; ~101 min wall-clock inside turn-end
  across three projects; lean judge on REAL prompts still ~28 s and non-deterministic (same config twice →
  different picks; `.steward/log.md:990-1005`).
- Gap: no SubagentStop observer (agent returns are found by transcript scan); no per-sitting agent budget;
  no isolation policy for anything but the judge.

### 5.7 Checkpoints / recovery (component 7)
- git + `status.json` cursors + `log.md`; briefing `Next:` line is the only cross-session continuation and
  was wrong in 4/5 ships. No resume-the-work mechanism (the owner re-states the goal every session).

### 5.8 Observability (component 8)
- turn-end trace (0.7.0 schema: `deferred`, `satisfied_by`, `payload_keys`, per-supply `engine/ms/costUsd/
  lean` — none live yet), kb trace (no `session_id`/`prompt_id`/scores — #27), `status.json`, `log.md`,
  statusline (110 B / 50 ms). NOT instrumented: lens, patterns, thorough-mode, prism, essense hooks (stderr
  only). Scorecard (`harness-stats`, task #13) NOT built. Running-vs-installed: invisible (§5.0).

### 5.9 Guardrails / permissions / budgets (component 9)
- Fail-open everywhere; blocking confined to Stop; fire cap 3; quality-lens one ask per request; steward
  one pass per sitting; autopilot no-progress halt. **No cost cap anywhere** (`costUsd` recorded, never
  enforced); no PreToolUse permission decision from this repo (by design — `pattern-gate.js:19-20`); the
  only deny on the machine is the third-party serena wrapper.

### 5.10 Evals over harness + model (component 10)
- Two manual audits (08-23, 09-06) with reproducible scripts left in a session scratchpad (`usage_scan.py`,
  `measure.js`, `measure-pull.js`, `probes.js`) — not in the repo, not re-runnable by a gate. `claude plugin
  eval` unused (early access). Anthropic's own datum: a 25/100-word instruction cost 3% on evals — we cannot
  see a regression of that size at all.

---

## 6. Gap analysis — what is missing, what refutes it, what closes it

Ranked by quality-per-cost under the owner's laws (quality over speed; dead mechanism = quality failure;
deterministic > LLM; fold > add; fire conditionally; nothing moves unseen).

| # | Gap | Evidence | Closing mechanism (deterministic unless noted) | Named check |
|---|---|---|---|---|
| G1 | **Installed ≠ running is invisible** | §5.0: two days of traces from 0.6.0 while the ledger and log say 0.7.0 | SessionStart instrument: each hook script reports its own package version vs `installed_plugins.json`; mismatch → one `[instr] running turn-end 0.6.0 ≠ installed 0.7.0 — restart` line; every trace line carries `version` | restart this process → line disappears; trace lines carry `"version":"0.7.0"` |
| G2 | **Verification has no ground truth** | self-check satisfied by prose (`:119-120`), Bash-blind (`:53-55`); recall "did not use" blind to Bash reads (measured today); SWE-agent/Aider/OpenAI all verify by tool result, never by claim | PostToolUse **and PostToolUseFailure** recorder (matcher `Bash|PowerShell` — PostToolUse fires only on success; a failing check lands in PostToolUseFailure, whose error text begins with the exit-code line): parse argv for check commands (`node --test`, `npm test`, `pytest`, `test-all`, `repo-guard`…) and mutating heads (`sed -i`, `>`, `tee`, heredoc targets) → append `{prompt_id, kind: check|mutation, cmd, exit, files}` to a per-root ledger; `self-check.satisfied` reads the ledger (a check RAN after the last mutation), never the prose; one shared `file-touch` extractor serves self-check + context-recall; the tail names the un-checked mutation and the command that would check it (OpenAI's remediation-in-the-message shape) | FIRST: capture one real payload each for a passing and a failing `node --test` into `plugins/turn-end/tests/fixtures/` before parsing anything (the `tool_response` shape for Bash is undocumented); then transcript (f) from #28 → applies; `Check: none` → false; `sed -i` then `node --test` → satisfied; a failing `node --test` → recorded as `check, exit≠0`, not as "no check ran"; audit-2 twin transcripts replayed → block count ≤ 42 and each remaining block names a real un-checked mutation |
| G3 | **No goal-based termination** | "stopping while there is planned work" (owner, twin 08-12); briefing Next: wrong 4/5; canon: `/goal`, feature list, "35 of 50 items" laziness; OpenAI's checked-in plans; Manus recitation | `steward:goal <task#>` — a session-scoped DEMAND duty whose criterion is the task's *done-check* from `tasks.md`/`status.json`; satisfied by the G2 ledger (the named check ran and passed) or by an explicit owner "stop"; capped by fires (3), not by a promise phrase; a prose done-check is evaluated by a turn-end JUDGE (`lib/judges/`, the claude-p shape) inside the one tail — never a second Stop hook of any handler type (invariant 9) | pick task #27 → duty active → a turn that yields without the check → one tail line naming the task; after `node --test` green → duty satisfied → silent |
| G4 | **Evaluator unmeasured** | lens: 27 dispatches, 0 trace; judge: nondeterministic picks, `chosen` empty ~50% | Trace schema v1 shared by turn-end, kb, lens, patterns, thorough-mode: `{t, plugin, hook|duty|agent, version, session_id, prompt_id, ms, cost_usd?, engine?, decision, bytes, acted_on?}`; lens rollup appends `{a,b,u,escalations,refuted,verified}`; "acted on" derived at the NEXT prompt (did the session touch a hinted/escalated path?) | one dispatch → one line; refute/confirm and acted-on ratios computable from disk |
| G5 | **No scorecard** — "does it do anything?" took two audits | audit 2 method lives in a scratchpad; METR/Galster: scaffold effects are first-order and usually unmeasured | `harness-stats` gate (plugin-toolkit `bin/`, pure runner over drop-in METRIC sources, like repo-guard's detectors): hint-followed % (strict/loose), tail bytes p50/p95 + % under 10 KB, judge ms p95 + engine mix, blocks + wasted nudges per prompt, briefing-vs-log contradictions, digest bytes, spawns per prompt, installed≠running; printed as ONE `[instr]` line at open + full on demand; the audit's scripts become its first sources | run on this repo → numbers match audit 2 within 3% on the overlapping metrics (baseline 7%/16%, p95 20.5 KB); a second run after Phase 2 shows the deltas |
| G6 | **Digest uncapped, hints repetitive** | 9,963 B / 110 lines; 84% ignored; top-3 ids fill 40% of slots; SWE-agent: capped outputs beat both too-little and too-much | task #27 as written (cap, per-session dedupe, change-aware digest, floor-leak fix, "+N more" cue) | same prompt twice → no repeated id; unchanged digest → second fire < 300 B; every kb-pull output < 10 KB |
| G7 | **Six spawns, five surfaces, one concern** | Q15 numbers; 9 spawns ≈ 0.85 s; `++` three ways; OpenAI: "When everything is 'important,' nothing is" | ONE UserPromptSubmit hook over a `{trigger, injection, budget, metric, provenance}` registry (Q15 option c); each entry carries its byte budget and a metric key (G5) so an unread injection is visible | `measure.js` before/after: plain prompt unchanged; `++` −363 B; design prompt one block; global CLAUDE.md < 5 KB; spawns 9 → ≤6 |
| G8 | **Compaction unguarded** | no PreCompact/PostCompact anywhere; canon: goal drift via lossy summaries; Manus recitation; OpenHands condenser keeps head + tail | PreCompact: snapshot digest + open task + last named check to `.claude/kb/compact-<ts>.md`; PostCompact: re-inject a ≤1 KB "where we are" block (goal, last check, next step); a compaction-preservation section in CLAUDE.md (docs-supported, zero mechanism) | force `/compact` mid-task → the next turn's first hook output names the task and last check |
| G9 | **No budgets** | cost recorded never enforced; 235 judge children; prism 370k tokens; OpenHands/SWE-agent/Ralph all cap iterations or dollars, and OpenHands' known defect is that the agent is never TOLD its budget | per-sitting budget ledger (agents dispatched, judge cost, tokens where reported) with soft thresholds that print, never block (invariant 8); `maxTurns` + `effort` on every shipped agent definition; the budget line is *communicated* in the tail | trace shows `budget: {agents: n, judge_usd: x}`; prism panel with `effort: medium` lenses ≤150k tokens |
| G10 | **Sub-agents unobserved, uninsulated** | agents found by transcript scan; each inherits 25.6 KB; today's deferral miss | SubagentStart/SubagentStop hooks → trace line per agent (type, ms, bytes returned) and the authoritative in-flight set for deferral; an isolation policy per agent definition (lean flags for judges; `tools`/`effort`/`maxTurns` floors for panels) | every dispatch in a sitting has a trace line; a Stop fire with agents in flight shows `deferred: N`; judge children show 0 hook fires in their own transcripts |
| G11 | **Zero-setup memory** | "why is it not saved?" ×2; cue fired, unheeded; Codex and Cursor both ship background-generated memory *with owner approval* | Q16 (owner decision): one-keystroke seed on first open of an un-seeded git root, background, diff at next open, `unseed` reverts | open a fresh repo → one question → next open shows a briefing |
| G12 | **Dead weight still firing** | essense-flow + autopilot Stop hooks ~430 fires each, 0 uses; session-lifecycle, reuse-gate, code-glossary at 0; the "stale harness" law | Q17 (owner decision): fold / freeze / archive per surface; autopilot `decide()` → a duty (#3) so invariant 9 holds everywhere | after the ruling: BLOCKING Stop-hook registrations across enabled plugins = 1 (advisory ones not counted); scorecard shows spawns per prompt down by the removed count |
| G13 | **No harness eval** | no way to see a 3% regression; Anthropic runs per-model evals on every system-prompt change | replay gate: the audit's transcript-replay scripts in-repo (`plugin-toolkit/bin/harness-replay.js`) run the hooks over recorded payloads and diff the scorecard; later `claude plugin eval` cases per plugin once early access lands | CI-less but gate-able: `test-all` sweeps it; a deliberate 400 B injection bump shows as a red delta |
| G14 | **Code design enforced by text, not measure** (owner 09-08) | five text surfaces, 1,645 B/design prompt; glossary engine (extensibility, dispatch scanner, coupling, DRY) never runs ambiently; instance-shaped output is a failure invariant 7 cannot see | §7.7 design duty: deterministic delta on touched files (switch-on-type, coupling, cluster growth, extensibility), advise with the closing seam named; `@ship` gate with baseline; regressions → catalog examples | seed a `switch (kind)` in a hook → duty names file:line + `registry-dispatch`; third member joins a cluster → extraction demand; `@ship` with a lowered score → exit 1; text surfaces retired once the duty's regressions-caught count is non-zero over a week |
| G15 | **Knowledge accretes; wrong things keep surfacing** (owner 09-08) | 25.6 KB standing per session + sub-agent; log 82 KB; archived digests = noise hits; 84% hints unread; no lifecycle on kb entries | §7.8 knowledge lifecycle (`live/superseded/refuted/archived` in `status.json`, joined at collect, downranked by default) + garden job (steward, background, diff, owner ratifies removals) driven by usage/size/contradiction measures | mark a capture `refuted-by` → it leaves hints and `kb_query` says "1 refuted held back"; garden diff proposes ≥1 CLAUDE.md cut with its measure; standing bytes per session trend down across two sittings |

---

## 7. Target shape — the harness contract, one open base per axis

The owner's four axes (memory · context · pushing work · verifying work) plus the two the sources insist on
(observing · guarding). Each axis is an **open base with a drop-in surface** — the house pattern already
instantiated three times in plugin-toolkit (pure runner over a registry; silence is a finding; a crashed
member is reported, never skipped) and three times in turn-end (duties · sources · judges). Nothing below
is a new architecture; it is the existing pattern applied to the axes that lack it.

### 7.1 Memory — sources, writers, and the progress state the loop consumes
- **Base**: kb's KIND × CASTE model; sources are drop-ins (`markdown-dir` + `split`); the steward agent is
  the single writer of the model; the session writes inbox + digest; duties enforce the writes.
- **Add**: the *progress-state* reader — `status.json` + `tasks.md` are the feature list; G3's goal duty
  reads them; the briefing's `Last:`/`Next:`/`Waiting:` are computed from them (#8) so prose cannot lie.
- **Add**: compaction snapshots as a memory source (G8) so a summarized session still has its own notes.
- **Owner decision**: zero-setup seeding (Q16), in the approval shape Codex and Cursor converged on.

### 7.2 Context — one channel, budgeted, compaction-aware, isolation-aware
- **Base**: ONE UserPromptSubmit hook over a `{trigger, injection, budget, metric}` registry (G7); the
  10 KB law and demands-first order as runner invariants, not per-plugin habits.
- **Surfaces**: injections (drop-in), budgets (config), triggers (regex or predicate), a `child` policy
  (stand down under `MK_TURN_END_DEPTH` by default).
- **Add**: PreCompact/PostCompact guard (G8); per-agent isolation policy (G10).

### 7.3 Pushing work — goal-based, owner-present, never unattended
- **Base**: turn-end duties. **Add**: the goal duty (G3) as a DEMAND whose criterion is a task's done-check;
  `steward:next` arms it; `steward:goal <n>` arms it explicitly. The platform's `/goal` is NOT the
  owner-present path: it starts idle check-in turns on its own (up to three per goal, first at 30 min —
  an invariant-1 conflict unless `CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0`); whether it is allowed at all is
  an owner decision (§9.5). The G3 duty gives the same goal-holding inside the one tail, with no turn the
  owner did not start.
- **Bind** Claude's task list to the model: TaskCreated/TaskCompleted hooks append to `status.json`'s
  ledger (read by the steward, never written by the session) so "what should I be seeing now?" is
  computable.
- **Excluded by owner law**: time-based and proactive loops (invariant 1). The harness pushes in DEPTH
  within a sitting, never in TIME.

### 7.4 Verifying work — ground truth first, fresh evaluator second, both measured
- **Base**: self-check (cheap floor) + quality-lens (opt-in deep tier) — kept.
- **Change**: self-check satisfied by the G2 ledger, never by prose; a mutation without a subsequent
  recorded check is the only thing that blocks.
- **Add**: evaluator telemetry (G4); evaluator separation policy — the agent that judges never edits, and
  its rollup names what was verified vs asserted; an adversarial-verification workflow template for design
  panels (prism) where a second lens grades the first.
- **Add**: the replay gate (G13) so the harness itself is under test.

### 7.5 Observing — one schema, one scorecard, one line
- **Base**: trace schema v1 (G4) written by every plugin that fires; `harness-stats` (G5) reads them.
- **Add**: running-vs-installed instrument (G1) and per-sitting budget line (G9) as scorecard sources.
- **Rule**: a mechanism ships with its metric key registered in `harness-stats` or it does not ship.

### 7.6 Guarding — budgets and environment-layer rules, fail-open
- **Base**: fail-open hooks, one blocking tail, fire caps.
- **Add**: soft budgets (G9); agent definitions with `maxTurns`/`effort`; settings-level
  `permissions.deny` rules — a platform permission config, NOT a hook, so invariant 8 stays intact
  (`plugins/patterns/hooks/scripts/pattern-gate.js:19-23` records why a hook must never touch
  permissions) — only for a short owner-ratified list of irreversible commands (e.g. `git push --force`,
  `rm -rf` outside the scratchpad); deterministic where a prose warning currently stands, per invariant 3.

### 7.7 Code design — better codebases as context enriches (owner, 2026-09-08)

Owner's words: *"as new things are added and context is enriched we need to be designing better code.
code is cheap now so we need to be designing better codebases."* Extends the HFDP wish (08-26) and
invariant 7. Today the concern has FIVE text surfaces (Q15: 1,645 B per design prompt + 1,788 B standing)
and one advisory pre-code gate — the "instructions-as-text" side of the §3.2 disagreement, where no
source shows a measured win. The measured side is deterministic: SWE-agent's lint-rejected edits, OpenAI's
linters whose messages carry the fix. The substrate already exists: the code-glossary engine ships
`extensibility.py` (open-for-extension measure), a dispatch scanner (switch-on-type / registry detection),
coupling, and DRY clusters (2.1 s on `plugins/kb`, 8 real clusters) — never run ambiently.

- **Measure (deterministic, per project — never across independently-installed plugins):** on the files
  the turn touched (the shared file-touch extractor, G2), compute the DELTA: new switch-on-subtype or
  hard-coded concrete target (dispatch scanner), coupling edges added, a duplicate cluster that gained a
  member, extensibility score down. Signal known dead for untyped languages (`signals/signature.py:46-48`)
  — the duty must say which signals ran.
- **Duty (turn-end, DEMAND, advise by default):** fires only on a regression, names the file:line and the
  named seam from the patterns catalog that would close it ("second `switch` on `kind` in hooks/ → registry
  dispatch; see /patterns registry-dispatch") — remediation in the message, OpenAI-style. A cluster
  reaching three members is the "context enriched" trigger: it demands an extraction decision (extract /
  accept with reason), never silently. This is where "design better as things are added" becomes a
  mechanism: not upfront abstraction, but measured convergence.
- **Gate (`@ship`):** the same measures as blocking checks with a baseline file, so a ship cannot lower
  the score (Q17 ★ for code-glossary, sharpened).
- **Learning:** every regression the duty finds is a capture candidate with the pattern id; recurring ones
  become catalog examples (`patterns.json` is data — a drop-in). The scorecard tracks regressions per
  sitting and the text surfaces retire as the duty proves itself (Q15).
- **Drop-in surfaces:** measures (`code_glossary/` signals), catalog entries, per-project thresholds.

### 7.8 Knowledge hygiene — store less, mark wrong things, keep learning (owner, 2026-09-08)

Owner's words: *"we are storing too many things. we should be able to clean up wrong things or things
that are not necessary and also keep learning from what we are seeing."* Measured today: standing
context 25.6 KB per session AND per sub-agent (project CLAUDE.md 16.2 KB — Codex caps AGENTS.md at
32 KiB, OpenAI runs ~100 lines + pointers); `.steward/log.md` 82 KB, parts 49 KB; 23 archived digests
titled by stamp produce noise hits; top-3 kb ids fill 40% of hint slots; 84% of hints unread. OpenAI's
answer is the doc-gardening agent + linters that validate docs are current and cross-linked; ours has the
same pieces half-built: the steward recompute (works), the status contract (`status.json` lifecycle,
files never move, kb joins statuses as themes at collect — `plugins/kb/lib/status-join.js`), captures
that already carry CORRECTION / supersedes headers by convention.

- **Lifecycle for knowledge, not deletion:** extend the status contract's item types to kb entries —
  `live | superseded-by:<id> | refuted-by:<id> | archived` — set in `status.json` (steward = only
  writer), joined onto entries at collect (zero engine change, the 0.11.0 shape). The engine downranks
  or hides non-live entries by default and says so ("2 superseded held back"). Wrong things stop
  surfacing; the history stays — the toolkit's dead ends are its most-queried knowledge.
- **Measure (deterministic):** per entry: pulls, hint slots, acted-on (G4) over the last N sittings;
  per file: bytes injected standing (CLAUDE.md, MEMORY.md, briefing, digest); contradictions (briefing vs
  log #8; two captures with opposing claims flagged by the lens). Never-used-in-N + never-cited =
  archive candidate; the "would removing this cause a mistake?" test (Anthropic docs) applied to every
  CLAUDE.md line by the same duty that measures injections (G7's registry gives each line a metric).
- **Garden job (steward, background, one per sitting like `integrate`, diff visible):** proposes merges,
  supersessions, archives and CLAUDE.md cuts from the measures; the owner ratifies anything that removes
  (invariants 1 + 2). Log compaction (task #9) is one of its motions.
- **Learning loop:** trace → scorecard → capture with provenance + check → recompute. The lens's
  refute/confirm marks entries `refuted-by`; the code-design duty's regressions feed the catalog; the
  scorecard's "unread bytes" and "entries never acted on" are the numbers the garden job works down.
- **Drop-in surfaces:** status types (data), measures, garden motions.

Both axes obey the contract of the other six: a deterministic measure → a duty/gate at a lifecycle point
→ a drop-in registry → a metric key → an owner-visible diff for anything that removes.

---

## 8. The plan — five phases, each with a check, mapped to existing work

Order follows the sources' own sequencing ("instrument first, then decide") and the owner's ("result
based"). Phase 0 is hours; 1–2 are evenings; 3–5 wait on measurements and rulings.

### Phase 0 — see what is actually running (S, deterministic)
1. Restart this session's process so 0.7.0 is live [needs owner — the executor cannot restart its own
   process]; confirm a trace line with `"deferred"`. → **Check:** `grep -c '"deferred"'
   .claude/turn-end/trace.jsonl` > 0.
2. G1 running-vs-installed instrument in `steward-brief.js`'s `INSTRUMENTS` registry (drop-in) + a
   `version` field in every trace line. → **Check:** mismatch line on a stale process, silent after restart.
3. Task #27 (digest cap + dedupe) — already specified, still open on disk.
4. Task #28 + G2's shared `file-touch` extractor (Bash argv → files) used by self-check AND context-recall.
   → **Check:** today's transcript replayed → recall no longer re-serves the audit capture; `sed -i` counts
   as a mutation.

### Phase 1 — trace + scorecard baseline (S/M)
5. Trace schema v1 across turn-end, kb, lens (G4). 6. `harness-stats` gate with the audit's scripts as its
   first metric sources (G5). → **Check:** numbers reproduce audit 2 within 3%; one `[instr]` line at open.
7. Lens telemetry (audit plan item 17) — refute/confirm/acted-on. **Rule adopted here:** no new mechanism
   without a metric key.

### Phase 2 — ground truth + goal (M)
8. PostToolUse + PostToolUseFailure check-recorder (G2) — real payload fixtures first — and self-check
   reading the ledger. 9. Goal duty (G3) armed by
   `steward:next` / `steward:goal <n>`; TaskCreated/TaskCompleted → status ledger. 10. Briefing computed
   lines (#8). → **Check:** replay of the 42 twin blocks → each remaining block names a real un-checked
   mutation; a session that yields with an armed goal unmet gets exactly one tail line naming it.

### Phase 3 — context economics (M, Q15 ruling first)
11. One injection registry hook (G7). 12. PreCompact/PostCompact guard (G8). 13. Isolation policy per agent
    definition + SubagentStart/Stop trace (G10). → **Check:** `measure.js` deltas as in G7; forced
    compaction keeps the goal + last check; every agent dispatch has a trace line and Stop fires with
    agents in flight show `deferred: N`.

### Phase 4 — budgets + replay gate (S/M)
14. Per-sitting budget line (G9). 15. Harness replay gate in `test-all` (G13). → **Check:** a deliberate
    injection bump shows as a red delta; prism panel under the token target.

### Phase 4b — the two owner axes of 09-08 (M each; both ride on G2's file-touch extractor + G4's trace)
15a. Code-design duty + `@ship` design gate (G14) — after G2 (touched files) and G5 (metric key) exist.
15b. Knowledge lifecycle + garden job (G15) — after G4's acted-on trace gives the usage measure.
    → **Checks:** as in G14/G15.

### Phase 5 — strip (owner rulings Q16, Q17, then S)
16. Fold/freeze/archive per Q17; autopilot `decide()` → duty (#3); zero-setup seed per Q16. 17. Standing
    rule from Martin/Rajasekaran: on every model release, re-run `harness-stats` and remove any mechanism
    whose metric is flat. → **Check:** BLOCKING Stop-hook registrations across enabled plugins = 1
    (invariant 9's wording; alert-sounds' advisory Stop hook is not counted); spawns per prompt ≤ 6; the
    scorecard's "unread injection bytes" trends down across two sittings.

**What the plan does NOT do:** add injections, add a second Stop hook (of any handler type) or a second
judge, or make the harness run unattended.
Every item is a reader of state that already exists or a guard on a fire that already happens.

---

## 9. Decisions only the owner can make (extension surfaces, not A/B)

1. **Goal duty scope** — which tasks arm it: every `steward:next` (default) · only explicit `steward:goal`
   · every task with a machine-checkable done-check. The base supports all three; the default is the
   question.
2. **Ground-truth strictness** — does a recorded check have to be *green* to satisfy self-check, or merely
   *run and observed*? Canon says green ("task verifier nearly perfect"); the owner's Unity sessions asked
   for less testing. Registry default per project (`turn-end/config.json`).
3. **Q15 / Q16 / Q17** as already framed in `.steward/questions.md` — this document changes none of the
   defaults there; it adds the scorecard as the thing that judges the folds afterwards.
4. **Deny-list** — whether any settings-level `permissions.deny` rule exists at all (§7.6). Default
   proposed: none until the scorecard shows a class of irreversible mistakes; invariant 8 stands either way.
5. **`/goal` itself** — allowed with idle check-ins disabled (`CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0`), or
   excluded entirely under invariant 1's strict reading. Default proposed: excluded; the G3 duty carries
   the goal inside the one tail.
6. **Who may mark knowledge wrong or unnecessary** (§7.8) — the garden job proposes and the owner ratifies
   every removal (default), or the steward may auto-archive entries never used in N sittings with a
   visible diff. Default proposed: proposal-only, N a per-project number the scorecard suggests.
7. **Design-duty severity** (§7.7) — advise (default) or block on a measured regression in `@ship` only.

---

## 10. Sources

Anthropic (official): anthropic.com/engineering/building-effective-agents (2024-12-19) ·
/effective-harnesses-for-long-running-agents (2025-11-26) · /effective-context-engineering-for-ai-agents
(2025-09-29) · /writing-tools-for-agents (2025-09-11) · /multi-agent-research-system (2025-06-13) ·
/harness-design-long-running-apps (2026-03-24) · /demystifying-evals-for-ai-agents (2026-01-09) ·
/building-c-compiler-with-parallel-claudes (2026-02-05) · /scaling-managed-agents (2026-04-08) ·
claude.com/blog: harnessing-claudes-intelligence (Lance Martin, *Agent Harness Design: 3 Patterns*,
2026-04-02) · a-harness-for-every-task-dynamic-workflows
(2026-06-02) · getting-started-with-loops (2026-06-30) · prompt-caching-is-everything (2026-04-30) ·
docs: code.claude.com/docs/en/{hooks, how-claude-code-works, best-practices, goal, memory, context-window,
checkpointing, workflows, scheduled-tasks, routines, monitoring-usage, plugins-reference,
agent-sdk/{overview, agent-loop, typescript}} · github.com/anthropics/claude-quickstarts
(autonomous-coding) · github.com/anthropics/claude-code (plugins/ralph-wiggum).

Other builders: openai.com/index/harness-engineering (2026-02-11), /unrolling-the-codex-agent-loop
(2026-01-23), /unlocking-the-codex-harness (2026-02-04), Codex docs (AGENTS.md, hooks, sandbox, memories,
subagents) · arXiv 2405.15793 (SWE-agent) · arXiv 2407.16741 + openhands.dev condenser post (2025-04-09) +
docs.openhands.dev SDK · cognition.com/blog/dont-build-multi-agents (2025-06-12), /devin-fusion (2026-06-29)
· manus.im context-engineering post (2025-07-18) · langchain.com/blog context-engineering-for-agents
(2025-07-02), deep-agents (2025-07-30), docs.langchain.com deepagents · aider.chat docs (repomap,
lint-test, git) · cursor.com docs (rules, planning, cloud-agent) + changelogs 1.0 / 1.2 · geminicli.com
docs (gemini-md, memory, checkpointing, hooks) · github.com/SWE-bench/SWE-bench ·
github.com/laude-institute/terminal-bench · metr.org o3 report (2025-04-16), time-horizon-1-1
(2026-01-29) · arXiv 2602.14690 (Galster et al.) · arXiv 2606.08529 (Starace, lower confidence) ·
ghuntley.com/ralph (2025-07-14, lower confidence).

Internal: audit 2 capture (2026-09-06), `.steward/{tasks,questions,log}.md`, `design/*.md`, and the
file:line references throughout.
