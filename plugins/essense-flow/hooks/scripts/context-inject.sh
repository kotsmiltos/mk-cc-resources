#!/usr/bin/env bash
# Thin bash dispatcher for context injection hook (D5).
# Delegates to Node for testability.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/context-inject.js" 2>/dev/null
