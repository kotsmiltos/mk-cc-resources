---
description: Ask the project knowledge base — what happened, what was decided, how we do things here. Searches by kind (episodic/semantic/procedural) x caste (session→project→owner) and tells you how to narrow when there is more.
---

Query this project's knowledge base with `$ARGUMENTS`.

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/kb.js" query $ARGUMENTS
```

If `$ARGUMENTS` is empty, run `node "${CLAUDE_PLUGIN_ROOT}/bin/kb.js" stat` instead and report
what the knowledge base holds, then ask what they want to know.

**Run the narrowing loop before you answer.** Every result ends with a `hint:` line. When it
reports held-back matches AND the owner's need is ambiguous, re-run with the facet the hint
suggests (`--kind`, `--caste`, `--theme`, `--source`) rather than answering off the first page.
Two or three narrowing passes are normal and cheap — the KB cannot reason about ambiguity on its
own, so this loop is where the disambiguation actually happens.

Useful flags: `--kind episodic|semantic|procedural` · `--caste session|thread|project|fleet|owner`
· `--wider` (that tier and every wider one) · `--theme <tag>` · `--since/--until <iso>` ·
`--limit <n>` · `--json`. Full reference: `node "${CLAUDE_PLUGIN_ROOT}/bin/kb.js" --help`.

**Reporting rules:**

- Cite the `path` of every entry you use. Provenance is the point — an unciteable memory is a
  rumour, and the owner must be able to open the file and check you.
- A zero-match result is information, not failure. It prints what *is* available under the
  filters; say "the KB has nothing on X, but it holds Y" rather than inventing an answer.
- If the output carries a `WARNING: source(s) failed to collect`, surface it. A knowledge base
  that quietly lost a source will confidently tell you it knows nothing about that source.
- Answer from what the KB returned. If it does not cover the question, say so and read the code
  or ask — do not fill the gap from memory and present it as recall.
