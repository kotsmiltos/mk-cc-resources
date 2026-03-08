#!/usr/bin/env bash
# Status line script for alert-sounds plugin.
# Reads the alert state file and shows a colored indicator.
#
# Colors:
#   stop       → green  — task finished
#   permission → red    — needs approval
#   idle       → yellow — waiting for input
#   (none)     → dim    — working normally

STATE_FILE="${TMPDIR:-/tmp}/claude-alert-state"

# Read stdin (Claude sends JSON session data — we consume it to avoid blocking)
cat > /dev/null

STATE=""
if [ -f "$STATE_FILE" ]; then
    STATE=$(cat "$STATE_FILE" 2>/dev/null)
fi

# ANSI color codes
GREEN='\033[1;32m'
RED='\033[1;31m'
YELLOW='\033[1;33m'
DIM='\033[2m'
RESET='\033[0m'

case "$STATE" in
    stop)
        printf "${GREEN}● DONE${RESET} — ready for input"
        ;;
    permission)
        printf "${RED}● PERMISSION${RESET} — approval needed"
        ;;
    idle)
        printf "${YELLOW}● WAITING${RESET} — idle, needs attention"
        ;;
    *)
        printf "${DIM}●${RESET}"
        ;;
esac
