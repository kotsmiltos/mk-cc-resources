"""Call-name helpers shared across signal and cluster stages.

Extracted from signals/abstraction.py when cluster/bucketing.py gained
the signature-bucket pre-split (both need the same dotted-name
normalization; duplicating the rule would let the two drift).
"""

from __future__ import annotations


def leaf_name(call: str) -> str:
    """Last segment of a dotted call name. 'requests.get' -> 'get'."""
    if not call:
        return ""
    return call.rsplit(".", 1)[-1]
