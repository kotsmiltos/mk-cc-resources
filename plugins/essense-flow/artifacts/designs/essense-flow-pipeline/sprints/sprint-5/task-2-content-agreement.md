> **type:** task-spec
> **sprint:** 5
> **status:** planned
> **depends_on:** None
> **estimated_size:** S

# Task 2: Fix contentAgreement Short-Text Bias

## Goal
Fix `contentAgreement()` in `lib/synthesis.js` so single-word entities don't trivially agree with everything, and empty text doesn't agree with all content. Currently `Math.min` as the denominator means a single shared keyword yields 100% overlap.

## Pseudocode

```
FUNCTION contentAgreement(a, b):
  1. Extract significant words for both texts
  2. If either set has fewer than MIN_WORDS_FOR_COMPARISON (3) words:
     return false (insufficient data to determine agreement)
  3. Compute intersection
  4. Use Math.max(wordsA.size, wordsB.size) as denominator (not Math.min)
  5. Return intersection.size / denominator >= OVERLAP_THRESHOLD
```

## Files Touched

| File | Action | What Changes |
|------|--------|-------------|
| `lib/synthesis.js` | MODIFY | Update `contentAgreement` denominator and add minimum word floor |
| `tests/synthesis.test.js` | MODIFY | Add tests for short-text and empty-text cases |

## Acceptance Criteria

- [ ] Empty text does NOT agree with non-empty text
- [ ] Single-word text does NOT agree with multi-word text
- [ ] Two texts with 3+ significant words and >60% overlap still agree
- [ ] Existing tests pass (no regression in normal agreement detection)
