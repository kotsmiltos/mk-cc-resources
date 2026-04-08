<template>

Use this structure for cross-cutting patterns — reusable implementation patterns that apply across modules. Each pattern includes concrete, copy-pasteable code (not abstract descriptions). Patterns are assembled into agent briefs for every module listed in `applies_to`. They enforce consistency without requiring agents to coordinate.

Save to: `architecture/patterns/[pattern-name].md` (relative to scope root)

```markdown
> **type:** pattern
> **name:** [pattern-name]
> **applies_to:** all
> **created_at:** level-0

<!-- name: kebab-case slug matching the filename.
     applies_to: "all" or a comma-separated list of specific module names.
     When "all", every module brief includes this pattern.
     When listing specific modules, only those modules receive it.
     created_at: the decomposition level where this pattern was established. -->

# Pattern: [Human-Readable Name]

## When To Use

<!-- Concrete trigger — not "when appropriate" but a specific condition
     an implementation agent can evaluate mechanically.
     Write this as an if-statement: "When [condition], apply this pattern." -->

Apply this pattern when:
- [Concrete trigger 1 — e.g., "a module needs to read configuration from disk"]
- [Concrete trigger 2 — e.g., "a function accepts user-provided input that hasn't been validated"]

Exceptions — skip this pattern when:
- [Exception 1 — e.g., "the configuration is compile-time constants defined in the module itself"]

## The Pattern

<!-- CONCRETE CODE. Copy-pasteable. Not pseudocode, not a description —
     actual code in the project's primary language that an agent can
     use as a starting point. Include type annotations, error handling,
     and comments explaining non-obvious choices. -->

```[language]
# [Brief description of what this code demonstrates]

[Concrete, working code example with:
  - Type annotations
  - Error handling (not bare except / catch-all)
  - Named constants (no magic numbers or strings)
  - Comments on the WHY for non-obvious lines]
```

## Variations

<!-- Module-specific adaptations. Not every module uses the pattern identically.
     Show how the base pattern changes for specific contexts.
     If no variations exist, write "None — all modules use the base pattern as-is." -->

### [module-name] variation

[What differs and why:]

```[language]
# [How this module adapts the base pattern]
[Adapted code]
```

## Positive Constraints

<!-- Frame as what TO DO, not what to avoid. Implementation agents follow
     these as rules when applying this pattern. Each constraint is specific
     enough to verify in a code review.

     Use these verbs: USE, FOLLOW, ALWAYS, ENSURE, REQUIRE.
     Use SECURITY: prefix for security-critical exceptions to the positive framing.

     Write "USE Y instead of X" or "ALWAYS prefer Y over X."
     The SECURITY: prefix is the only place negative framing is permitted. -->

- **USE** [specific approach] for [specific situation].
- **ALWAYS** [specific behavior] when [specific condition].
- **FOLLOW** [specific convention] in [specific context].
- **ENSURE** [specific property] by [specific mechanism].
- **SECURITY:** [specific prohibition] — [why this is a security risk].
```

</template>

<conventions>
- **Concrete code is mandatory.** The pattern section must contain copy-pasteable code, not prose descriptions or pseudocode. If the code example doesn't compile/run conceptually, the pattern is too vague. Use the project's primary language.
- **Positive constraint framing.** Every constraint tells agents what TO DO. "Don't use raw SQL" becomes "USE parameterized queries for all database access." The only exception is security constraints, which may use prohibitive framing with the `SECURITY:` prefix.
- **applies_to drives brief assembly.** When the orchestrator builds a module brief, it includes only patterns where `applies_to` lists that module (or is set to "all"). Keep this field accurate — a pattern that says "all" but really only applies to two modules creates noise.
- **Variations are scoped.** Each variation section names the specific module and explains what differs. This prevents agents from guessing how to adapt the base pattern.
- **When To Use is an if-statement.** The trigger must be evaluable by an agent reading code — not subjective ("when it feels right") but mechanical ("when a function accepts user input that hasn't been validated"). Include exceptions explicitly.
- **One pattern per file.** If a "pattern" has multiple unrelated rules, split it into separate files. Each file should be coherent — an agent reads it and understands one concept completely.
- **Patterns are not decisions.** A pattern says "here's how to do X." A decision says "we chose X over Y." If you're recording a choice, use a decision record instead. Patterns reference decisions that motivated them (e.g., "Per D003, all config uses YAML").
</conventions>
