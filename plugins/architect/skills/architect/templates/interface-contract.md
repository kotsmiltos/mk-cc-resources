<template>

Use this structure for interface contracts — one file per module pair. Contracts define what crosses module boundaries: function signatures, data formats, error types, and guarantees. Both sides of the interface are documented. Contracts are assembled into agent briefs so each module knows exactly what it must provide and consume.

Save to: `architecture/contracts/[module-a]--[module-b].md` (relative to scope root, double-dash separator)

```markdown
> **type:** interface-contract
> **between:** [module-a, module-b]
> **version:** 1
> **created_at:** level-0
> **last_modified:** level-0

<!-- between: alphabetical order by convention (api--storage, not storage--api).
     version: starts at 1, increments on any amendment. Never resets.
     created_at: the decomposition level where this contract was first written.
     last_modified: updated whenever the contract is amended. -->

# Contract: [module-a] ↔ [module-b]

<!-- This contract defines the interface between two modules.
     Both modules receive this file in their agent brief.
     Any change to this contract requires updating BOTH module briefs. -->

## [module-a] provides to [module-b]

<!-- Function signatures, endpoints, or data that module-a exposes for module-b's use.
     Include type annotations, parameter descriptions, and guarantees (preconditions,
     postconditions, invariants). If module-a provides nothing to module-b, write "None —
     this is a unidirectional contract (module-b provides to module-a only)." -->

### [function/endpoint name]

- **Signature:** `function_name(param: Type) -> ReturnType`
- **Precondition:** [What must be true before calling — e.g., "param is a non-empty string"]
- **Postcondition:** [What is guaranteed after — e.g., "returns a valid Config or raises ConfigError"]
- **Invariant:** [What never changes — e.g., "idempotent: calling twice with same input produces same result"]

## [module-b] provides to [module-a]

<!-- Same structure as above. If module-b provides nothing to module-a, write "None —
     this is a unidirectional contract (module-a provides to module-b only)." -->

### [function/endpoint name]

- **Signature:** `function_name(param: Type) -> ReturnType`
- **Precondition:** [What must be true before calling]
- **Postcondition:** [What is guaranteed after]
- **Invariant:** [What never changes]

## Data Formats

<!-- Shared types, schemas, or data structures that cross this interface.
     Define them here — not in either module. Both modules import from here conceptually.
     Use concrete type definitions, not prose descriptions. -->

### [TypeName]

```
{
  "field_a": "string — description and constraints",
  "field_b": "number — description, range: [0, 100]",
  "field_c": "TypeName | null — when null: [meaning]"
}
```

## Error Handling

<!-- Every error type that can cross this interface. Each module must handle
     errors from the other side — no silent swallowing.
     List the error, who raises it, and what the receiver must do. -->

| Error | Raised By | When | Receiver Must |
|-------|-----------|------|---------------|
| [ErrorTypeName] | [module-a] | [Specific trigger condition] | [Required handling — retry, fallback, propagate, abort] |
| [ErrorTypeName] | [module-b] | [Specific trigger condition] | [Required handling] |
```

</template>

<conventions>
- **File naming uses double-dash.** `module-a--module-b.md` — alphabetical order. This makes contracts findable and prevents duplicate files for the same pair.
- **Version is append-only.** Never decrement. When amending a contract, increment version AND update `last_modified`. The version history is tracked in the scope INDEX.md or commit log.
- **Unidirectional contracts are valid.** If module-a provides to module-b but not vice versa, the reverse section says "None" with an explanation. Do not omit the section — its presence confirms the unidirectionality was intentional, not an oversight.
- **Guarantees use Design by Contract terminology.** Preconditions (caller's responsibility), postconditions (callee's guarantee), invariants (always true). If you can't state these, the interface isn't well-defined enough.
- **Data Formats are the shared vocabulary.** Both modules must agree on these types. When a type changes, both module briefs must be regenerated. This is the primary coupling point.
- **Error handling is mandatory.** Every error that can cross the boundary must be listed with explicit handling instructions. "Handle appropriately" is not an instruction — name the strategy (retry, fallback, propagate, abort).
- **Consumer-Driven Contracts principle.** The consuming module's needs drive the contract. If module-b needs a new field from module-a, the contract is amended to reflect that — the provider adapts to the consumer's requirements, not the other way around.
</conventions>
