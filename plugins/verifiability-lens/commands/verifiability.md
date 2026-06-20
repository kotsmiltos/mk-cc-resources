---
description: Classify a plan, claim, result, or recent work into verifiable (A) / unverifiable (B) / can't-tell (U), then surface only the important, actionable, fully-contextualized items. Manual trigger for the verifiability-lens.
---

Run the verifiability-lens over the target and report back ONLY what the user needs to see.

**Target:** `$ARGUMENTS` if provided (a plan, claim, result, file path, or pasted text). If empty,
target the most recent substantive work in this conversation (the latest plan, claim, or result).

**Steps:**

1. Dispatch the `verifiability-lens` agent (Agent tool, `subagent_type: verifiability-lens`) with a
   brief containing:
   - `unit_type` — your best fit (`plan | claim | completion-claim | finding | freeform | …`).
   - `content` — the target.
   - `context_refs` — any files the target touches (so the agent can substrate-verify).
   - `executor_capabilities` — what the downstream doer can run (note if shell/tests are available).
   - `recipient_profile` — load `plugins/verifiability-lens/defaults/recipient-profile.yaml` (or a
     project override if one exists); pass its dials.

2. From the agent's return, show the user the **`rollup`**, not the raw class list:
   - the `headline`,
   - the `escalations` (only important + actionable, each with *why it matters* + a recommended
     default they can accept + the bundled context),
   - a one-line note of what was **auto-resolved** (with the defaults taken) and how many items were
     **suppressed**.

3. Do NOT dump the full A/B/U list unless the user asks. The value is the absorption — surface the
   few decisions that need them, pre-chewed; absorb the rest.

The agent is read-only: it classifies and triages. It does not fix the work or run the checks it
names.
