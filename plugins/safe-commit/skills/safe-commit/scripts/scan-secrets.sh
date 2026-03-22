#!/usr/bin/env bash
# scan-secrets.sh — Deterministic secret scanner for staged git changes.
# Scans `git diff --staged` output against high-confidence regex patterns.
# Exit 0 = clean, Exit 1 = findings, Exit 2 = usage error.
#
# Architecture: two-pass for speed.
#   Pass 1: awk extracts added lines with file:line metadata into a temp file.
#   Pass 2: one grep per pattern against the temp file (~30 grep calls total).
# This is O(patterns) subprocesses, not O(lines * patterns).

set -euo pipefail

# --- Configuration ---

# Files to skip entirely (lock files, generated content, binaries)
SKIP_FILES='package-lock[.]json|yarn[.]lock|pnpm-lock[.]yaml|Pipfile[.]lock|poetry[.]lock|composer[.]lock|Gemfile[.]lock|Cargo[.]lock|go[.]sum|[.]min[.]js$|[.]min[.]css$|[.]map$|[.]pb[.]go$|[.]generated[.]|[.]snap$'

# --- Secret Patterns ---
# Format: "PATTERN_NAME|||REGEX"
# Only high-confidence patterns with low false-positive rates.

SECRET_PATTERNS=(
    # AWS
    "AWS Access Key ID|||AKIA[0-9A-Z]{16}"
    "AWS Secret Access Key|||(aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*[\"']?[A-Za-z0-9/+=]{40}"

    # GitHub
    "GitHub Personal Access Token (classic)|||ghp_[A-Za-z0-9_]{36,}"
    "GitHub OAuth Access Token|||gho_[A-Za-z0-9_]{36,}"
    "GitHub User-to-Server Token|||ghu_[A-Za-z0-9_]{36,}"
    "GitHub Server-to-Server Token|||ghs_[A-Za-z0-9_]{36,}"
    "GitHub Refresh Token|||ghr_[A-Za-z0-9_]{36,}"
    "GitHub Fine-Grained PAT|||github_pat_[A-Za-z0-9_]{22,}"

    # GitLab
    "GitLab Personal Access Token|||glpat-[A-Za-z0-9\-_]{20,}"
    "GitLab Pipeline Token|||glptt-[A-Za-z0-9\-_]{20,}"

    # Slack
    "Slack Bot Token|||xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24,}"
    "Slack User Token|||xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}"
    "Slack Webhook URL|||hooks\.slack\.com/services/T[A-Z0-9]{8,}/B[A-Z0-9]{8,}/[A-Za-z0-9]{24,}"

    # Stripe
    "Stripe Secret Key|||sk_live_[A-Za-z0-9]{24,}"
    "Stripe Restricted Key|||rk_live_[A-Za-z0-9]{24,}"

    # Google
    "Google API Key|||AIza[0-9A-Za-z\-_]{35}"
    "Google OAuth Client Secret|||GOCSPX-[A-Za-z0-9\-_]{28,}"

    # Private Keys
    "Private Key Header|||-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY"

    # Database URLs with credentials
    "Database URL with Password|||(mongodb|postgres|postgresql|mysql|redis|amqp)://[^:]+:[^@]+@[^/\s]+"

    # Generic High-Confidence Patterns
    "Generic API Key Assignment|||(api_key|apikey|api-key|API_KEY|APIKEY)\s*[=:]\s*['\"][A-Za-z0-9_\-]{20,}['\"]"
    "Generic Secret Assignment|||(secret|SECRET|password|PASSWORD|passwd|PASSWD)\s*[=:]\s*['\"][^\s'\"]{8,}['\"]"
    "Bearer Token in Code|||['\"]Bearer\s+[A-Za-z0-9\-._~+/]+=*['\"]"

    # Specific Service Tokens
    "Heroku API Key|||(HEROKU_API_KEY|heroku_api_key)\s*[=:]\s*[A-Za-z0-9\-]{36,}"
    "SendGrid API Key|||SG\.[A-Za-z0-9\-_]{22,}\.[A-Za-z0-9\-_]{43,}"
    "Twilio Account SID|||AC[a-f0-9]{32}"
    "Twilio Auth Token|||(twilio_auth_token|TWILIO_AUTH_TOKEN)\s*[=:]\s*[a-f0-9]{32}"
    "Mailgun API Key|||key-[A-Za-z0-9]{32}"
    "NPM Access Token|||npm_[A-Za-z0-9]{36}"

    # Hardcoded Local Paths (privacy / portability risk)
    "Hardcoded Home Directory Path|||/(home|Users)/[a-zA-Z][a-zA-Z0-9._-]+/"
    "Hardcoded Windows User Path|||[A-Za-z]:[\\\\\/]{1,2}Users[\\\\\/]{1,2}[a-zA-Z][a-zA-Z0-9._-]+[\\\\\/]"

    # Merge Conflict Markers
    # In TMPFILE format (file\tline\tcontent), ^ matches line start not content start
    # So we match 7+ consecutive markers anywhere — very unlikely outside real conflicts
    "Merge Conflict Marker|||[<>=]{7}"
)

# --- Sensitive File Patterns ---
# Format: "FILENAME_REGEX|||DESCRIPTION"
# Matches against staged filenames (not content).

SENSITIVE_FILE_PATTERNS=(
    '\.env$|||Dotenv File (.env)'
    '\.env\.[a-z]+$|||Dotenv File (.env.*)'
    '\.pem$|||PEM Certificate/Key File'
    '\.key$|||Private Key File'
    '\.p12$|||PKCS#12 Key Store'
    '\.pfx$|||PKCS#12 Key Store'
    '\.jks$|||Java Key Store'
    '\.keystore$|||Key Store File'
    'credentials\.json$|||Credentials File'
    'credentials\.yaml$|||Credentials File'
    'id_rsa$|||SSH Private Key'
    'id_ed25519$|||SSH Private Key'
    'id_ecdsa$|||SSH Private Key'
    '\.htpasswd$|||HTTP Password File'
    'token\.json$|||Token File'
)

# --- Main ---

# Get staged diff
DIFF="$(git diff --staged 2>/dev/null)" || {
    echo "ERROR: Not in a git repository or git not available." >&2
    exit 2
}

# --- File Type Check: runs first, even on empty-content files ---
# A staged .env with no content still needs to be caught.

finding_count=0
findings=""

STAGED_FILES=$(git diff --staged --name-only 2>/dev/null) || true
if [ -n "$STAGED_FILES" ]; then
    while IFS= read -r staged_file; do
        for pattern_entry in "${SENSITIVE_FILE_PATTERNS[@]}"; do
            file_regex="${pattern_entry%%|||*}"
            file_desc="${pattern_entry##*|||}"
            if echo "$staged_file" | grep -qE "$file_regex" 2>/dev/null; then
                findings="${findings}!! Sensitive File Staged: ${file_desc}
   Location: ${staged_file}
   Action:   Add to .gitignore and use environment variables or a secrets manager instead.

"
                ((finding_count++)) || true
            fi
        done
    done <<< "$STAGED_FILES"
fi

# If no diff content (e.g. empty files only), report file-type findings and exit
if [ -z "$DIFF" ]; then
    if [ "$finding_count" -gt 0 ]; then
        echo "SCAN: ${finding_count} finding(s)"
        echo ""
        echo "$findings"
        exit 1
    fi
    echo "SCAN: no staged changes"
    exit 0
fi

# --- Pass 1: Extract added lines with file:line metadata ---
# Output format per line: FILE\tLINENUM\tCONTENT
# Uses awk for a single pass over the diff.

EXTRACTED=$(echo "$DIFF" | awk -v skip_pat="$SKIP_FILES" '
    /^diff --git/ {
        # Reset for new file
        current_file = ""
        skip = 0
    }
    /^\+\+\+ b\// {
        current_file = substr($0, 7)  # strip "+++ b/"
        if (current_file ~ skip_pat) {
            skip = 1
        } else {
            skip = 0
        }
        next
    }
    /^@@ / {
        # Parse new-file line number from hunk header: @@ -old,count +new,count @@
        match($0, /\+([0-9]+)/, arr)
        if (arr[1] != "") {
            line_num = arr[1]
        }
        next
    }
    {
        if (skip || current_file == "") next

        if (substr($0, 1, 1) == "+") {
            # Added line — record it
            content = substr($0, 2)  # strip leading +
            printf "%s\t%d\t%s\n", current_file, line_num, content
            line_num++
        } else if (substr($0, 1, 1) == " ") {
            # Context line — just advance line counter
            line_num++
        }
        # Removed lines (starting with -) do not advance new-file line counter
    }
')

# If no added lines to scan, report file-type findings (if any) and exit
if [ -z "$EXTRACTED" ]; then
    if [ "$finding_count" -gt 0 ]; then
        echo "SCAN: ${finding_count} finding(s)"
        echo ""
        echo "$findings"
        exit 1
    fi
    echo "SCAN: clean"
    exit 0
fi

# Write extracted lines to a temp file for grep scanning
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
echo "$EXTRACTED" > "$TMPFILE"

# --- Pass 2: Scan each pattern against extracted lines ---

for pattern_entry in "${SECRET_PATTERNS[@]}"; do
    pattern_name="${pattern_entry%%|||*}"
    regex="${pattern_entry##*|||}"

    # grep the content column (field 3+) for the pattern
    # We use the full line but the pattern will match against content
    matches=$(grep -nE "$regex" "$TMPFILE" 2>/dev/null) || true

    if [ -n "$matches" ]; then
        while IFS= read -r match_line; do
            # Each line in TMPFILE is: FILE\tLINENUM\tCONTENT
            # grep -n prepends its own line number: N:FILE\tLINENUM\tCONTENT
            # Strip grep's line number prefix
            entry="${match_line#*:}"
            file=$(echo "$entry" | cut -f1)
            linenum=$(echo "$entry" | cut -f2)
            content=$(echo "$entry" | cut -f3-)

            # Extract the matched portion for redaction
            matched=$(echo "$content" | grep -oE "$regex" 2>/dev/null | head -1) || true

            # Redact: show first 4 and last 4 chars, mask middle
            if [ "${#matched}" -gt 12 ]; then
                redacted="${matched:0:4}****${matched: -4}"
            elif [ "${#matched}" -gt 8 ]; then
                redacted="${matched:0:3}****${matched: -3}"
            else
                redacted="****"
            fi

            findings="${findings}!! ${pattern_name}
   Location: ${file}:${linenum}
   Match:    ${redacted}

"
            ((finding_count++)) || true
        done <<< "$matches"
    fi
done

# --- Allowlist Filtering ---
# .safe-commit-allow in repo root suppresses known false positives.
# Format: one entry per line. Each entry is either:
#   - A file path (suppresses all findings in that file)
#   - A "pattern:path" pair (suppresses specific pattern in specific file)
#   - A line starting with # is a comment

ALLOWLIST_FILE="$(git rev-parse --show-toplevel 2>/dev/null)/.safe-commit-allow"
if [ -f "$ALLOWLIST_FILE" ] && [ "$finding_count" -gt 0 ]; then
    allow_entries=()

    # Read findings line by line (each finding is multi-line, separated by blank lines)
    # Re-process: check each finding against allowlist
    while IFS= read -r allow_entry; do
        # Skip comments and empty lines
        [[ "$allow_entry" =~ ^#.*$ ]] && continue
        [[ -z "$allow_entry" ]] && continue
        allow_entries+=("$allow_entry")
    done < "$ALLOWLIST_FILE"

    # Re-scan: rebuild findings excluding allowlisted ones
    # We stored findings as "!! pattern_name\n   Location: file:line\n   Match: ...\n"
    # Parse them back out and filter
    if [ "${#allow_entries[@]}" -gt 0 ]; then
        old_findings="$findings"
        findings=""
        finding_count=0

        # Split old_findings into individual finding blocks
        while IFS= read -r line; do
            if [[ "$line" == "!! "* ]]; then
                current_pattern="${line#!! }"
                current_finding="$line"
            elif [[ "$line" == "   Location: "* ]]; then
                current_location="${line#   Location: }"
                current_file="${current_location%%:*}"
                current_finding="${current_finding}
${line}"
            elif [[ "$line" == "   Match: "* ]] || [[ "$line" == "   Action: "* ]]; then
                current_finding="${current_finding}
${line}"
            elif [[ -z "$line" ]] && [[ -n "$current_finding" ]]; then
                # End of finding block — check against allowlist
                suppressed=false
                for allow in "${allow_entries[@]}"; do
                    # Check if allowlist entry matches file path or pattern:file
                    if [[ "$allow" == *":"* ]]; then
                        # pattern:file format
                        allow_pattern="${allow%%:*}"
                        allow_file="${allow#*:}"
                        if [[ "$current_pattern" == *"$allow_pattern"* ]] && [[ "$current_file" == *"$allow_file"* ]]; then
                            suppressed=true
                            break
                        fi
                    else
                        # Just a file path — suppress all findings in that file
                        if [[ "$current_file" == *"$allow"* ]]; then
                            suppressed=true
                            break
                        fi
                    fi
                done

                if [ "$suppressed" = false ]; then
                    findings="${findings}${current_finding}

"
                    ((finding_count++)) || true
                fi
                current_finding=""
                current_pattern=""
                current_file=""
            fi
        done <<< "$old_findings"
    fi
fi

# --- Output ---

if [ "$finding_count" -eq 0 ]; then
    echo "SCAN: clean"
    exit 0
fi

echo "SCAN: ${finding_count} finding(s)"
echo ""
echo "$findings"
exit 1
