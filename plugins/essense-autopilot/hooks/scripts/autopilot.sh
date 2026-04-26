#!/usr/bin/env bash
# Stop hook wrapper — invokes the Node script with stdin passthrough.
# Bash wrapper exists for cross-platform shebang compatibility.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/autopilot.js"
