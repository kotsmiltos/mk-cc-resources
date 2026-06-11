# Rebuild ledger index — Phase 0 output (2026-06-11)

> Quality bar for all rebuild artifacts: verify by reading actual source lines, not summaries;
> preserve specifics; every gap solvable by careful work; descendant artifacts carry these same standards.

Decision corpus mined from `C:\Users\mkots\essense-flow-re-imagined` for the 7-phase essense-flow rebuild.
Locked decisions: see memory `essense-flow-vision-and-rebuild` (artifacts-authoritative state, schema
single-source, librarian unknowns-ledger, M-2 existing-substrate-only, codenames inlined, public audience).

## Files

| File | Covers | Feeds |
|------|--------|-------|
| `ledger-dd.md` | DD-2..DD-21 (10 IDs) | Phases 1, 3, 4 |
| `ledger-meta.md` | M-1..M-6, L-7/L-8, L1/L2/L4, INST-13, NFR-1/8, BS-4, D-M1-6, CMC-* (24 entries) | Phases 1, 3, 4 |
| `ledger-rounds.md` | D-Sprint10-*, D-Rd9..12-* (39 IDs) + T-* one-liners (16) | Phase 4 (+1, 2) |
| `ledger-intent.md` | Original vision, 10-failure-mode catalog, unrealized vision, substance-mirror state | All phases |

## Load-bearing discoveries

1. **Canonical decision bodies are NOT in `redesign/06-decisions.md`** for most IDs. DD-15..DD-21 live in
   `tmp-spike-CLOSURE/.pipeline/elicitation/SPEC.md:354-414`; D-Rd*/D-Sprint* live in
   `tmp-spike-CLOSURE/.pipeline/architecture/decisions.yaml` (5599 lines). 06-decisions.md only cites them.
2. **ID collision:** SPEC.md post-ship addendum (lines 467-494) reuses DD-15..DD-18 for *different* decisions.
   Any rebuild citation must disambiguate which DD-15..18 it means.
3. **Substance mirror is drifted-by-design and pins are vacuous** — FROZEN-SHA sentinels ship with
   `frozen_at_iso: null, shas: {}`; audit skip-passes. Mirror is NOT runtime-load-bearing (all bin/ refs are
   comments; `evalDispatchPredicate` does no I/O). Real deps: test T-ENF-4 (README anchor) + quoted rule
   phrases in `transitions.yaml:363-384` + agent defs. README.md:15 claim "reads them at runtime" is FALSE.
   → Phase 4 may replace the mirror; must fix README claim + T-ENF-4 + transitions quotes together.
4. **M-2 original intent** (preserve in Phase 3 narrowing): 4 claim categories — engine output strings,
   library error classes, library API behavior, tool-scanner rules — covering project substrate AND
   vendored/3rd-party libs, with version pinning + downgrade-to-guided fallback. Narrowing to
   existing-substrate-only ⇒ vendored-lib + version claims MUST reroute to unknowns[], not vanish.
   (Motivating incident: round-4 js-yaml RangeError-vs-YAMLException config-dependent deviation.)
5. **The corpus itself already demanded this rebuild:** D-Rd10-15 = portability/no-codenames;
   D-Rd12-2 = hand-maintained validator key list drifted from defaults (the schema single-source motivator);
   D-Rd10-16 + D-Rd11-6 3-source counter parity checker = the negative exhibit derive-don't-copy replaces.
6. **Unrealized vision** (ledger-intent.md): S11 ship-as-1.0.0 abandoned; freeze ceremony never run;
   drift-audit harness not shipped; ~26 open SURPRISES. Phase 6 decides each: realize or formally drop.

## Disposition totals (keep / fold / drop)

- DD family: 6 keep, 3 fold, 1 drop
- Meta family: ~13 keep, ~10 fold, 1 drop (CMC-1 = placeholder, keep shape only)
- Rounds family: 17 keep, 18 fold, 4 drop/citation-only
- T-* task IDs: all citation-only → delete from shipped files in Phase 4 (historical justification, no live rule)

Fold targets cluster into: schema single-source (Phase 1), unknowns[] ledger lifecycle (Phase 3),
single-canonical-helper, doc-authority, exemption-with-expiry (Phase 4 principles doc).
