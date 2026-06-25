# Decoupling propagation plan

Propagate essense-flow's "build decoupled" principle (shipped 0.21.0) across the
ecosystem as a CHECKED GATE, not a stated value. Same arc the glossary already
proves: an engine *computes the violation* (duplication → DRY; coupling →
decoupled) and downstream phases *consume pre-computed evidence* instead of
re-hunting.

## Standing directives (user, this session)

- **No arbitrary numbers.** Gates fire only on deterministic BINARY facts, never
  on a magic threshold. Counts/metrics may be *reported*; they never *gate*.
- **The thing built is itself decoupled** — modular, reusable anywhere, testable
  on its own. It practices what it enforces.
- **Verify-or-research** — verify what's verifiable; build a verifier for what
  isn't-but-could-be; research + recommend what genuinely can't be verified.

## Substrate anchors (verified at file:line)

- Module/cross-module edges in MAP.md are **composition edges** (`composed_of`),
  not call edges — `map.py:177-183` `build_map_model`, drawn at `map.py:217`
  `_emit_edges` (`cross = src.module != dst.module`). Module = file-path group,
  `map.py:108` `_module_of`.
- A **real intra-codebase call graph already exists**: `signals/abstraction.py:38`
  `compute_abstraction` resolves each `FunctionRecord.notable_calls`
  (`records.py:51`) to other indexed record IDs via `_resolve_calls`
  (`abstraction.py:64`). It returns `called_ids` for EVERY record (the ≥2
  `MIN_COMPOSED_OF_LEAVES` threshold only sets the `is_composite` flag, not the
  edge list) — so the full edge set is reusable as-is.
- `runner map` (`runner.py:679` `_cmd_map`) consumes **GLOSSARY.yaml only**, which
  does NOT persist raw calls (`records.py` `Instance` has no calls field).
  Therefore coupling computes from **records.yaml** (Stage-1 output, has
  `notable_calls`), not from the glossary.
- Review's evidence-consumption pattern to mirror: `skills/review/SKILL.md:75`
  `dry-violation` lens — "duplication evidence is pre-computed, not re-hunted …
  substrate-verifies the cited sites". The `coupling` lens (`review/SKILL.md:72`)
  already exists but re-hunts by reading; closing the arc = feed it pre-computed
  evidence.

## Target 1 (engine multiplier) — the decoupling signal

**New module `code_glossary/coupling.py` — PURE, decoupled.** No I/O, no import of
the signal/cluster stages. Signature:

    build_coupling_model(edges: dict[str, list[str]],   # caller_id -> [callee_id]
                         module_of: dict[str, str],      # record_id -> module
                         private_of: dict[str, bool])    # record_id -> is-internal-name
        -> CouplingModel

Caller (runner) supplies the inputs; `coupling.py` knows nothing about how they
were derived → reusable on any call graph, testable in isolation.

Computes (all deterministic):
- module dependency edges (caller-module → callee-module) + per-module afferent /
  efferent COUNTS — **reported, never gated** (counts are measurements).
- **cycles** — strongly-connected components of the module graph with >1 member,
  or a self-loop edge. BINARY fact. Gate-worthy.
- **private reach-ins** — a cross-module edge whose callee name is internal by the
  language's own convention (Python leaf name starts with `_`). BINARY fact,
  no threshold. Gate-worthy. (Contract-aware reach-in — callee not in declared
  `exposes` — is consumer-side, where declarations exist.)

Emit: `COUPLING.yaml` (sidecar, frozen-shape) via a new `runner coupling`
subcommand reading records.yaml. MAP.md optionally annotates from it later.

**Tests first** (`tests/test_coupling.py`): pure-function unit tests — a tiny
hand-built edge map exercises cycle detection (cycle present / absent / self-loop)
and reach-in (private callee across module / public callee / same-module private).
No fixtures, no engine run needed → proves the module is decoupled.

Verifiable check for Target 1: `uv run pytest tests/test_coupling.py` green; and
`runner coupling --records <records.yaml>` on essense-flow's own bin/lib emits a
COUPLING.yaml whose cycles/reach-ins I can substrate-verify by reading the cited
sites (dogfood = Target 7, folded in here).

## Target 2 — architect-alignment design-time gate

Add a criterion to the architect-alignment lens + `arch-alignment-check` CLI op:
each task spec declares clean `exposes`/`consumes`; no spec's `consumes` names
another spec's internals. Kills coupling before a line is written. (Binary: every
cross-module need maps to a declared `exposes`, or it fails.)

## Target 3 — verify contract-compliance

`/verify` extractor + item-verifier confirm the BUILT `exposes`/`consumes` match
what the spec promised. Closes the loop at audit time.

## Reassess after 1–3 ship

Targets 4 (/organize boundary smell), 5 (/dry-refactor decouple face),
6 (/skill-heal single-responsibility) revisited once the engine arc is proven.

## Ship cadence

Per-target minor bump via the manual cascade (plugin.json + package.json +
marketplace entry+metadata + mk-cc-all bundle + README + CLAUDE.md +
RELEASE-NOTES). Test-after-each. Commit direct-to-main; push only on user OK.
