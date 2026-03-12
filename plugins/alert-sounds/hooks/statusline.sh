#!/usr/bin/env bash
# Status line script for alert-sounds plugin.
# Reads the alert state file and shows a colored indicator.
#
# Colors:
#   stop       → green  — task finished
#   permission → red    — needs approval
#   idle       → yellow — waiting for input
#   (none)     → dim    — working normally
#   muted      → adds [MUTED] suffix

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.json"
STATE_FILE="${TMPDIR:-/tmp}/claude-alert-state"

# Read stdin (Claude sends JSON session data — we consume it to avoid blocking)
cat > /dev/null

STATE=""
if [ -f "$STATE_FILE" ]; then
    STATE=$(cat "$STATE_FILE" 2>/dev/null)
fi

# Check mute status from config.json (simple grep — no jq dependency)
MUTED=""
if grep -q '"muted" *: *true' "$CONFIG_FILE" 2>/dev/null; then
    MUTED=" [MUTED]"
fi

# ANSI color codes
GREEN='\033[1;32m'
RED='\033[1;31m'
YELLOW='\033[1;33m'
DIM='\033[2m'
RESET='\033[0m'

case "$STATE" in
    stop)
        printf "${GREEN}● DONE${RESET} — ready for input${MUTED}"
        ;;
    permission)
        printf "${RED}● PERMISSION${RESET} — approval needed${MUTED}"
        ;;
    idle)
        printf "${YELLOW}● WAITING${RESET} — idle, needs attention${MUTED}"
        ;;
    *)
        if [ -n "$MUTED" ]; then
            printf "${DIM}●${RESET}${MUTED}"
        else
            printf "${DIM}●${RESET}"
        fi
        ;;
esac
