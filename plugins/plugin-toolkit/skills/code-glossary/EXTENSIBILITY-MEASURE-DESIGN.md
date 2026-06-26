# Extensibility measure — design spec (solution B)

The keystone of the "modularity drift" fix. essense-flow *states* modularity as a
value but never *measures* it, so the human is the only open-closed gate and
corrections never propagate. This makes extensibility a CHECKED FACT, not prose —
the same arc the glossary already proves: an engine *computes the violation*
(duplication → DRY; coupling → decoupled; **dispatch enumeration → open-closed**)
and downstream phases *consume pre-computed evidence* instead of re-hunting.

## The question it answers (the user's real test)

> "Add one new instance of an axis → how many existing sites must I edit?"

`0` edit-sites = **open** (add a unit that binds a contract; touch nothing existing).
`N>0` = **closed**, with the `N` sites named `file:line`.

## Standing directives honored

- **No arbitrary numbers.** The result is a COUNT (a measurement — reported, never
  gated, like coupling's afferent/efferent) plus a BINARY gate (declared-open axis
  ∧ ≥1 dispatch site exists). No magic threshold anywhere.
- **The thing built is itself decoupled** — a PURE module (`extensibility.py`) with
  no I/O and no engine-stage imports, testable with hand-built inputs. Practices
  what it enforces.
- **Default-closed false-flag guard** (mirrors architect-alignment criterion 9 and
  coupling.py's conservatism): a site is flagged ONLY against a DECLARED or
  INTRINSIC axis. No axis → no flag.

## Substrate anchors (verified at file:line this session)

- Tree-sitter exposes every node the scan needs: `switch_statement` (TS+C#),
  `switch_expression` (C# pattern match), `if_statement` + `binary_expression`
  ladders, enum declarations. Confirmed in
  `indexer/treesitter_parser.py` (`_COUNTED_STATEMENTS_TS` L62, `_COUNTED_STATEMENTS_CS`
  L92 both list `switch_statement`).
- Reusable parse infra: `get_parser`, `grammar_for`, `_iter_functions`, `_walk`,
  `_node_text`, `_field_text` (`treesitter_parser.py`), `iter_source_files`
  (`indexer/walk.py`), `LITERAL_NODE_TYPES` (`treesitter_parser.py:189`).
- The statement-level-scanner precedent is `indexer/block_scanner.py` — its own
  source walk, its own artifact, its own pass, a load-bearing false-positive guard.
  The dispatch scanner copies this shape.
- The pure-module + runner-subcommand template is `coupling.py` +
  `runner.py:_cmd_coupling` (L754). `runner extensibility` mirrors it exactly:
  load inputs → `build_*_model` → emit YAML sidecar → `--fail-on-violation` exit 1.
- `records.py:VariantAxisEntry` (L101) already models "what varies" per cluster
  (`parameter` + `instance_values` + `inferred_type`; its docstring example is a
  `BuildId enum`). The measure is the dual: given the axis, count the dispatch.

## What the scan detects — "a dispatch site keyed on an axis"

Every site that ENUMERATES the instances of an axis — i.e. must be touched when a
new instance is added:

1. `switch` / `match` on the axis discriminant — `switch_statement` /
   `switch_expression`.
2. if-else-if ladder comparing the discriminant against axis instances — a chain of
   `if_statement` whose conditions are `binary_expression` equality tests against
   axis-instance literals.
3. dict / map dispatch — a map/object literal whose KEYS are axis instances.
4. the instance-set declaration itself (the `enum`) — the one canonical, unavoidable
   edit when you add an instance.

## How a site binds to an axis — case-label membership, NO type inference

The deterministic signal (mirrors coupling's name-matching; no type resolver
needed, so it works language-agnostically and never guesses):

> A site's case-labels / compared-literals / dict-keys **overlap an axis's instance
> set by ≥2 members** → the site is a dispatch on that axis.

The `≥2` overlap is **structural, not a magic threshold**: one shared label is
ambiguous (any code may name one enum member); two-or-more members of the *same*
declared closed set appearing as the branch labels of one construct is the
unmistakable signature of exhaustive enumeration over that set. (The enum
declaration itself is bound by identity — it IS the axis.)

## Where the axis set comes from

- **Declared** — the `growth_axes` ledger from solution A: each axis carries a
  `type_name` and its instance set (and `open: true|false`). Primary source.
- **Intrinsic fallback** — any closed instance-set the language author *declared*:
  C# `enum`, TS string-literal-union type / `enum`, Python `enum.Enum` subclass /
  `Literal[...]`, each with ≥2 members. Same posture as coupling.py treating a
  Python leading `_` as intrinsically private. The scanner harvests these directly
  from the AST.
- No declared and no intrinsic axis → **no flag.** A `switch` on an arbitrary int
  never fires.

## Gate policy (decided with user, 2026-06-26)

- **Declared-OPEN axis + ≥1 dispatch site = BINARY violation → gate-worthy
  (blocks).** You declared it open; any exhaustive switch breaks that promise.
  Mirrors criterion 9.
- **Intrinsic-only axis (enum, not declared open) → COUNT reported, ADVISORY.** We
  do not *know* the human wanted it open, so we measure and surface, never block.

## Module shape (decoupled — practices what it enforces)

```
extensibility.py            PURE. DispatchSite, Axis, AxisFinding,
                            ExtensibilityModel, build_extensibility_model(
                                dispatch_sites, axes) -> ExtensibilityModel.
                            No I/O, no tree-sitter import. Unit-tested with
                            hand-built lists (parity with test_coupling.py).

indexer/dispatch_scanner.py IMPURE. Walks source via the existing tree-sitter
                            infra; harvests intrinsic axes (enum decls) and emits
                            DispatchSite records (switch / ladder / dict / decl).
                            The block_scanner precedent.

runner extensibility        Subcommand. Loads declared axes (ledger arg, optional)
                            + scans source for intrinsic axes + dispatch sites,
                            calls build_extensibility_model, emits EXTENSIBILITY.yaml,
                            --fail-on-violation exit 1 on a declared-open violation.
```

### Pure model contract

`build_extensibility_model(dispatch_sites, axes)`:
- correlates each `DispatchSite` to an `Axis` by ≥2-instance overlap (decl sites by
  identity);
- per axis: `edit_sites` = the bound dispatch sites + the declaration site →
  the answer to "add-one-instance edits";
- `has_violations` = any DECLARED-OPEN axis with ≥1 dispatch site (binary).

`EXTENSIBILITY.yaml` shape mirrors `COUPLING.yaml`: `schema_version`, `generator`,
`metadata`, `summary` (`has_violations`, per-axis counts), and per-axis `edit_sites`
each with `file`, `line`, `kind`, `function`.

## Verifiable check (the design is wrong if this fails)

Applied to the retro's JobClass case, the engine mechanically reproduces the human
finding — **"add a JobClass = 4 edits / 2 files incl. a duplicated switch"** with a
`file:line` per site:

- `enum JobClass { Worker, Soldier, Scout }` — file A (edit 1, the declaration)
- `switch (job.Class) { case Worker… case Soldier… }` — file A (edit 2)
- duplicated `switch (job.Class) …` — file B (edit 3); shape-hash twins → also a DRY
  correlate
- a 4th enumerating site (a dict/array parallel to the enum) — file B (edit 4)

Built as `tests/fixtures/extensibility/jobclass/` + an end-to-end test that runs
`runner extensibility` and asserts exactly these 4 sites across 2 files.

## Consumers (the coupling→review arc — pre-computed evidence, not re-hunted)

- **review** — a new `extensibility` lens, dispatched when `EXTENSIBILITY.yaml`
  exists (the `dry-violation`-when-`GLOSSARY.yaml`-exists precedent). Substrate-
  verifies the cited sites. Declared-open violations → critical (block); intrinsic
  counts → advisory finding.
- **verify** — an extensibility-compliance item per declared open axis: confirm the
  built code has 0 dispatch sites (open) or surface the N sites as drift.

## Solution C — corrections → sweeps (architect-time AND review-time; decided with user)

B's per-axis `edit_sites` list IS the sweep. A confirmed decoupling fix on axis X
→ re-run the measure; every remaining site on every declared axis must be 0.
Generalizes the review-time `rule-completeness` sweep (which sweeps `applies_to`
rules) to architect-time design corrections — closing the smoking gun (PayloadType
fixed round 6; identical coupling survived in JobClass + Larva).

## Solution A — front-door axis extraction (feeds the declared axis set)

`/elicit` + `/research` extract axes-of-variation into the `growth_axes` ledger
(what varies / what else is an instance / what must stay open), surfaced at a gate
(`unknowns[]` / `AskUserQuestion`) so the human declares open axes once. Feeds
criterion 9 (today default-closed without it) and the measure's declared-axis set.

## Ship cadence

Per-target minor bump via the manual cascade (plugin.json + package metadata +
marketplace entry + mk-cc-all bundle + README + CLAUDE.md + RELEASE-NOTES).
Test-after-each. Commit direct-to-main; push only on user OK.
