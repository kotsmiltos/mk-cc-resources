<milestone_design>

## What Makes a Good Milestone

A milestone is a single rung on the ladder. It must be:

### Small Enough
- Buildable in one focused session (S = one component/feature, M = a few connected components, L = a subsystem)
- If you can't estimate what files you'd create/modify, it's too vague — break it down
- If you're writing more than ~300-500 lines of new code, consider splitting

### Verifiable
- Has clear "done when" criteria that can be tested
- You can run it, see it, interact with it, or confirm its output
- Bad: "Set up the architecture" (how do you test an architecture?)
- Good: "Build the trade execution module — done when a mock trade can be placed and confirmed via the API"

### Self-Contained
- Makes sense on its own, even if the full project isn't done
- Doesn't leave broken state — after completing, the project still works
- Each milestone is a valid stopping point (even if there's more to build)

### Visible
- The user can see/feel the progress
- Pure refactors or invisible backend work should be bundled with something user-visible when possible

## Decomposition Patterns

### For UI-heavy projects
1. Core UI shell (layout, navigation)
2. Primary feature screens (one milestone per major screen/flow)
3. Data integration (connect to real or mock APIs)
4. Secondary features
5. Polish (animations, responsive, error states)

### For backend/logic-heavy projects
1. Core data model + basic I/O
2. Primary business logic (one milestone per major capability)
3. Integration layer (APIs, databases, external services)
4. Monitoring / observability
5. Edge case handling and hardening

### For full-stack projects
1. Vertical slice — one complete feature end-to-end (UI + logic + data)
2. Expand horizontally — add features following the same pattern
3. Cross-cutting concerns (auth, logging, error handling)
4. Polish and refinement

### For tool/CLI projects
1. Core command(s) with basic functionality
2. Input handling and validation
3. Output formatting
4. Configuration and persistence
5. Edge cases and error handling

## Ordering Rules

1. **Dependencies first.** If B needs A, build A first.
2. **Highest-value first.** Among independent milestones, build the one the user cares most about.
3. **Foundation before features.** Data models and core abstractions before the things that use them.
4. **Core before polish.** Get it working, then make it pretty.
5. **User-visible before invisible.** Bundle internal work with something the user can see.

## When to Split a Milestone

Split if:
- You realize mid-build it's doing two distinct things
- The "done when" criteria have multiple unrelated conditions
- You can't test the early parts without finishing the later parts
- It's been going for a while and you're nowhere near done

## When to Merge Milestones

Merge if:
- Two milestones are so small they'd be trivial individually
- One milestone is purely internal and the next makes it visible
- They share so much context that doing them separately wastes setup time

## Sample Data Strategy

For each milestone, ask: "How do I test this for real?"

- **API integrations:** Create mock responses or use sandbox APIs
- **Data processing:** Generate representative sample datasets
- **UI features:** Create fixture data that exercises all states (empty, normal, overflow, error)
- **Trading/financial:** Create simulated market data with known patterns
- **User flows:** Create test scenarios with step-by-step expected outcomes

Sample data is an artifact — save it in the project's test/fixtures directory. It gets reused and extended across milestones.

</milestone_design>
