---
description: Classify a plan, claim, result, or recent work into verifiable (A) / unverifiable (B) / can't-tell (U), then surface only the important, actionable, fully-contextualized items. Manual trigger for the verifiability-lens.
---

Run the verifiability-lens over the target and report back ONLY what the user needs to see.

**Target:** `$ARGUMENTS` if provided (a plan, claim, result, file path, or pasted text). If empty,
target the most recent substantive work in this conversation (the latest plan, claim, or result).

**Steps:**

1. Dispatch the `verifiability-lens` agent (Agent tool, `subagent_type: verifiability-lens:verifiability-lens`
   — the plugin-scoped id; the bare name does not resolve, measured 3 of 3 failures on 2026-09-11)
   with a brief carrying these sections, each under its own heading, exactly as named:
   - `OWNER WORDS` — the user's own words for this request, copied verbatim, never paraphrased.
     They are the reviewer's reference for what was wanted.
   - `PLAN ITEMS` — the numbered items of the plan the user agreed to, if there was one.
   - `WHAT CHANGED` — the files and claims this request changed.
   - `RUNS` — what ran AFTER the last change, each with pass / fail.
   - `TEST CHANGES` — every test change in this request (from the diff of the test files):
     inverted assertions, skipped / ignored / disabled tests, removed assertions, loosened bounds
     or tolerances, changes to tests that carry the user's words — each as old → new. The reviewer
     has no shell, so it can only quote what this list gives it.

   Write `none` under a section that is empty; never leave one out silently. Then the usual fields:
   - `unit_type` — your best fit (`plan | claim | completion-claim | finding | freeform | …`).
   - `content` — the target.
   - `intended_scope` — what this task set out to do (secondary to `OWNER WORDS`).
   - `context_refs` — any files the target touches (so the agent can substrate-verify).
   - `executor_capabilities` — what the downstream doer can run (note if shell/tests are available).
   - `recipient_profile` — the project's `.claude/verifiability-lens/profile.yaml` if it exists,
     else the plugin's shipped `defaults/recipient-profile.yaml`; pass its dials (including
     `stance`, default `strict`).

   The agent runs three checks and actively verifies (it has web + docs + read tools): (1)
   verifiability A/B/U, (2) completeness against the user's words / no arbitrary stop, (3) quality
   bar — tested, requirements met, best achievable. Any test that was inverted, skipped, removed or
   loosened comes back as an escalation whose default is to restore it.

2. From the agent's report (it arrives through its hand-back), show the user:
   - its `FOR HIM:` section as written — the five plain lists (Done / Not done / Claimed without a
     check / Tests changed / What may confuse you),
   - the `escalations` (only important + actionable, each with *why it matters* + a recommended
     default they can accept + the bundled context),
   - a one-line note of what was **auto-resolved** and how many items were **suppressed**.

3. Do NOT dump the full A/B/U list unless the user asks. The value is the absorption — surface the
   few decisions that need them, pre-chewed; absorb the rest.

The agent is read-only: it classifies and triages. It does not fix the work or run the checks it
names.
