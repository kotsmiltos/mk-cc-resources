<research_dimensions>

## The Dimensions Framework

When exploring any idea, decompose it into the relevant subset of these dimensions. Not every idea needs all of them — pick what matters.

### Dimension Catalog

**1. Feasibility**
*Can this actually work?*
- Technical constraints (what's physically/computationally possible)
- Resource requirements (time, money, expertise, infrastructure)
- Dependency risks (does this rely on things outside your control?)
- Maturity of underlying technology (bleeding edge vs battle-tested)
- Known blockers or dealbreakers

**2. User Experience**
*How would a real person interact with this?*
- Who are the users? What's their context, skill level, patience?
- What does the ideal interaction flow look like, step by step?
- What are the different modes of interaction? (e.g., quick vs detailed, keyboard vs voice)
- What would frustrate users? What would delight them?
- Accessibility considerations
- Error states — what happens when things go wrong from the user's perspective?

**3. Technical Landscape**
*What already exists in this space?*
- Existing tools, libraries, frameworks that do part or all of this
- Open source projects solving similar problems
- Commercial products in this space
- Standards and protocols relevant to the idea
- Community activity and maintenance status of key tools

**4. Implementation Approaches**
*How could you build this?*
- Different architectural approaches (with honest tradeoffs)
- Technology stack options
- Build vs buy vs integrate decisions
- Complexity estimates (not time — complexity)
- What would a minimal viable version look like?

**5. Design Decisions**
*What choices need to be made?*
- Key decision points where the approach could fork
- Tradeoffs at each decision point
- Decisions that are hard to reverse later (lock-in risks)
- Decisions that can be deferred safely
- What the user/builder needs to decide vs what has a clear best answer

**6. Integration**
*How does this fit with what already exists?*
- How this connects to the existing system/project/workflow
- API boundaries and data flow
- Compatibility concerns
- Migration path if replacing something existing
- What changes and what stays the same

**7. Prior Art & Lessons**
*Who has tried this before? What happened?*
- Existing implementations (open source, commercial, academic)
- What worked well in those implementations
- What didn't work and why
- Common pitfalls documented by others
- Community discussions, blog posts, post-mortems

**8. Edge Cases & Risks**
*What could go wrong?*
- Technical failure modes
- User experience failure modes
- Security considerations
- Performance under stress
- Maintenance burden over time
- What happens if a dependency dies or changes

### Dimension Selection Guide

**Always include:**
- Feasibility (unless the idea is obviously doable)
- At least one of: Technical Landscape OR Implementation Approaches

**Include when the idea involves user interaction:**
- User Experience

**Include when there are multiple ways to do it:**
- Design Decisions
- Implementation Approaches

**Include when building on existing systems:**
- Integration

**Include when the space isn't well-known:**
- Technical Landscape
- Prior Art & Lessons

**Include for anything going to production:**
- Edge Cases & Risks

### How to Research Each Dimension

| Dimension | Primary Tool | Secondary Tool | What to Look For |
|-----------|-------------|----------------|------------------|
| Feasibility | WebSearch + reasoning | Context7 for specific libs | Constraints, limits, requirements |
| User Experience | Reasoning + prior art search | WebSearch for UX patterns | Flows, friction points, delight |
| Technical Landscape | WebSearch + Context7 | GitHub search via Bash | Tools, libs, activity, maturity |
| Implementation Approaches | Context7 + reasoning | WebSearch for comparisons | Architectures, patterns, tradeoffs |
| Design Decisions | Reasoning from research | WebSearch for decision frameworks | Forks, tradeoffs, lock-in |
| Integration | Codebase search + Context7 | WebSearch for compatibility | APIs, data flow, migration |
| Prior Art & Lessons | WebSearch | GitHub search | What worked, what failed, why |
| Edge Cases & Risks | Reasoning from research | WebSearch for known issues | Failure modes, security, perf |

</research_dimensions>
