"""One-shot sanity check: vocab vs Scalable Crowd labels.

NOT a regular test (not picked up by pytest config — different filename).
Run manually with:

    uv run python tests/sanity_check_vocab_vs_scalable_crowd.py

Loads each label from the v1 dogfood label-counts.txt and runs it
through normalize_label. Reports pass/fail counts + which verbs are
missing from the shipped vocab.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from code_glossary.vocab import (
    UNCLEAR_VERB,
    extract_verb,
    is_valid_verb,
    load_vocab,
    normalize_label,
)


LABEL_COUNTS_PATH = Path(
    r"D:/Diploma/Unity/Scalable Crowd/artifacts/glossary-tmp/label-counts.txt"
)


def main() -> int:
    if not LABEL_COUNTS_PATH.exists():
        print(f"label-counts.txt not found at {LABEL_COUNTS_PATH}", file=sys.stderr)
        return 1

    vocab = load_vocab()
    print(f"loaded vocab v{vocab.version} with {len(vocab.verbs)} verbs")

    labels: list[tuple[int, str]] = []
    for raw in LABEL_COUNTS_PATH.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw:
            continue
        parts = raw.split(maxsplit=1)
        if len(parts) != 2:
            continue
        count_str, label = parts
        try:
            count = int(count_str)
        except ValueError:
            continue
        labels.append((count, label))

    print(f"loaded {len(labels)} labels from {LABEL_COUNTS_PATH.name}")
    print()

    passed: list[tuple[int, str]] = []
    failed_token_count: list[tuple[int, str, int]] = []
    failed_unknown_verb: list[tuple[int, str, str]] = []
    failed_other: list[tuple[int, str, str]] = []
    missing_verbs: Counter[str] = Counter()

    for count, label in labels:
        try:
            normalize_label(label, vocab)
            passed.append((count, label))
        except ValueError as e:
            msg = str(e)
            if "exceeds 4 kebab tokens" in msg:
                token_count = len(label.split("-"))
                failed_token_count.append((count, label, token_count))
            elif "not in vocabulary" in msg:
                verb = extract_verb(label) or ""
                failed_unknown_verb.append((count, label, verb))
                missing_verbs[verb] += count
            else:
                failed_other.append((count, label, msg))

    total_label_count = sum(c for c, _ in labels)
    pass_label_count = sum(c for c, _ in passed)

    print("--- summary ---")
    print(f"unique labels  : {len(labels)}")
    print(f"total instances: {total_label_count}")
    print()
    print(f"passed (unique)            : {len(passed)} ({100*len(passed)/len(labels):.1f}%)")
    print(f"passed (weighted by count) : {pass_label_count} ({100*pass_label_count/total_label_count:.1f}%)")
    print()
    print(f"failed (exceeds 4 tokens)  : {len(failed_token_count)} unique labels")
    print(f"failed (unknown verb)      : {len(failed_unknown_verb)} unique labels")
    print(f"failed (other)             : {len(failed_other)} unique labels")
    print()

    if missing_verbs:
        print("--- top 20 missing verbs (weighted by instance count) ---")
        for verb, weight in missing_verbs.most_common(20):
            print(f"  {weight:5d}  {verb}")
        print()

    if failed_token_count:
        print("--- top 10 over-long labels (>4 tokens), by count ---")
        for count, label, tc in sorted(failed_token_count, reverse=True)[:10]:
            print(f"  {count:3d}  ({tc} tokens)  {label}")
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
