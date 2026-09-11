# elicit

**Brainstorm a vision to completion.** You talk; this questions the gaps you leave, and
guides you through the parts you do not fully understand yet.

```
/elicit:elicit    # or just say "help me think this through" / "complete my vision"
```

## What it does

1. **Reads what is already settled first** — the project knowledge base (`kb`) and the
   `.steward/` living model. It will not ask you something your project already decided.
2. **Maps the gaps** as a visible, numbered queue — core idea, who it serves, the thrust,
   invariants, non-goals, growth axes, constraints, risks, open decisions.
3. **Asks one keystroke at a time** — arrow-key questions, recommended default first, every
   option carrying what it *implies*.
4. **Recurses on the deeper gap.** When your answer opens a bigger question, that one gets
   asked first — and everything it queued behind it is said out loud, never dropped.
5. **Teaches before it asks** when the choice involves a process you have not worked with:
   a few lines on how it actually works and what each way costs, sourced from the docs, not
   from vibes.
6. **Panels genuine forks** with [`prism`](../prism) instead of answering them for you.
7. **Lands the outcome as a steward inbox capture** — your words verbatim — which the
   `steward` agent integrates into `vision.md` / `questions.md` and shows you as a diff.

## What it never does

- Never edits `vision.md`, `questions.md` or any other model file. The steward agent is the
  only writer; this skill writes one inbox capture.
- Never invents your goals. A gap left open honestly beats a section filled plausibly.
- Never re-asks what the model or the knowledge base already answers.
- Never silently drops a queued question.

## Requirements

None. Every dependency degrades to one named line:

| Present | What you get |
|---------|--------------|
| `kb` | Orientation from recorded decisions, dead ends, conventions |
| `steward` (+ a `.steward/` model) | Durable landing: inbox capture → integrated vision, with a diff |
| `prism` | Genuine forks get a multi-perspective panel |
| none of them | Still works — the conversation is the surface, and the write lands in `.claude/elicit/` |

## Install

```
/plugin marketplace add kotsmiltos/mk-cc-resources
/plugin install elicit@mk-cc-resources
```

## Relationship to essense-flow's `/elicit`

Same gap-recursion engine, different target. `/essense-flow:elicit` closes a build-ready
`SPEC.md` inside the pipeline state machine; `/elicit:elicit` closes a project's DIRECTION
in the steward model, with no state machine, no `.pipeline/`, and no preconditions.
