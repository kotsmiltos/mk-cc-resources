#!/usr/bin/env bash
# Thin bash dispatcher for session orientation hook (D5).
# Delegates to Node for testability.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/session-orient.js" 2>/dev/null
