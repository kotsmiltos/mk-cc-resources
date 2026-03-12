<secret_patterns>

Patterns used by `scan-secrets.sh` for deterministic secret detection. Each pattern targets a specific, well-documented secret format with high confidence and low false-positive rates.

<category name="Cloud Provider Keys">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| AWS Access Key ID | `AKIA[0-9A-Z]{16}` | `AKIAIOSFODNN7EXAMPLE` | Very low — AKIA prefix is unique to AWS |
| AWS Secret Access Key | `(aws_secret_access_key\|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*[A-Za-z0-9/+=]{40}` | `aws_secret_access_key = wJalr...` | Low — requires variable name + 40-char value |
| Google API Key | `AIza[0-9A-Za-z\-_]{35}` | `AIzaSyA1234567890abcdefghij...` | Low — AIza prefix is unique to Google |
| Google OAuth Secret | `GOCSPX-[A-Za-z0-9\-_]{28,}` | `GOCSPX-abc123...` | Very low — prefix is unique |

</category>

<category name="Code Hosting Tokens">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| GitHub PAT (classic) | `ghp_[A-Za-z0-9_]{36,}` | `ghp_xxxxxxxxxxxx...` | Very low — prefix is unique |
| GitHub OAuth | `gho_[A-Za-z0-9_]{36,}` | `gho_xxxxxxxxxxxx...` | Very low |
| GitHub User-to-Server | `ghu_[A-Za-z0-9_]{36,}` | `ghu_xxxxxxxxxxxx...` | Very low |
| GitHub Server-to-Server | `ghs_[A-Za-z0-9_]{36,}` | `ghs_xxxxxxxxxxxx...` | Very low |
| GitHub Refresh | `ghr_[A-Za-z0-9_]{36,}` | `ghr_xxxxxxxxxxxx...` | Very low |
| GitHub Fine-Grained PAT | `github_pat_[A-Za-z0-9_]{22,}` | `github_pat_xxxx...` | Very low |
| GitLab PAT | `glpat-[A-Za-z0-9\-_]{20,}` | `glpat-xxxxxxxxxxxx...` | Very low |
| GitLab Pipeline | `glptt-[A-Za-z0-9\-_]{20,}` | `glptt-xxxxxxxxxxxx...` | Very low |
| NPM Access Token | `npm_[A-Za-z0-9]{36}` | `npm_xxxxxxxxxxxx...` | Very low |

</category>

<category name="Communication Platform Tokens">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| Slack Bot Token | `xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24,}` | `xoxb-1234567890-1234567890-abc...` | Very low — structured prefix |
| Slack User Token | `xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}` | `xoxp-123...-123...-123...-abc...` | Very low |
| Slack Webhook | `hooks\.slack\.com/services/T[A-Z0-9]{8,}/B[A-Z0-9]{8,}/[A-Za-z0-9]{24,}` | `hooks.slack.com/services/T.../B.../...` | Very low |

</category>

<category name="Payment Tokens">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| Stripe Secret Key | `sk_live_[A-Za-z0-9]{24,}` | `sk_live_xxxxxxxxxxxx...` | Very low — prefix is unique |
| Stripe Restricted Key | `rk_live_[A-Za-z0-9]{24,}` | `rk_live_xxxxxxxxxxxx...` | Very low |

</category>

<category name="Cryptographic Material">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| Private Key Header | `-----BEGIN (RSA \|EC \|DSA \|OPENSSH \|PGP )?PRIVATE KEY` | `-----BEGIN RSA PRIVATE KEY-----` | Very low — exact header match |

</category>

<category name="Database and Service URLs">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| DB URL with Password | `(mongodb\|postgres\|...)://[^:]+:[^@]+@[^/\s]+` | `postgres://user:pass@host/db` | Low — requires protocol + user:pass@host |

</category>

<category name="Generic High-Confidence">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| API Key Assignment | `(api_key\|apikey\|...)=\|:...['\"]value['\"]` | `api_key = "sk-abc123..."` | Moderate — relies on variable name |
| Secret Assignment | `(secret\|password\|...)=\|:...['\"]value['\"]` | `password = "hunter2"` | Moderate — relies on variable name |
| Bearer Token | `['\"]Bearer\s+token...['\"]` | `"Bearer eyJhbG..."` | Low — specific format |
| Heroku API Key | `HEROKU_API_KEY=...` | `HEROKU_API_KEY=abc123-...` | Low — specific variable name |
| SendGrid API Key | `SG\.[A-Za-z0-9...]{22,}\.[A-Za-z0-9...]{43,}` | `SG.xxxxxxxxxx.xxxxxxxxxx` | Very low — unique format |
| Twilio Account SID | `AC[a-f0-9]{32}` | `AC<32 hex chars>` | Low — AC prefix + exactly 32 hex chars |
| Twilio Auth Token | `TWILIO_AUTH_TOKEN=...[a-f0-9]{32}` | `TWILIO_AUTH_TOKEN=abc123...` | Low — specific variable name |
| Mailgun API Key | `key-[A-Za-z0-9]{32}` | `key-xxxxxxxxxxxx...` | Moderate — short prefix |

</category>

<category name="Hardcoded Local Paths">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| Linux/macOS Home Dir | `/(home\|Users)/[a-zA-Z][a-zA-Z0-9._-]+/` | `/home/username/project/` | Low — real user home dirs |
| Windows User Dir | `[A-Za-z]:[\\\/]{1,2}Users[\\\/]{1,2}[a-zA-Z]...` | `C:\Users\admin\Desktop\` | Low — Windows user path format |

Why these matter: Hardcoded local paths expose usernames, directory structures, and machine-specific details. They also break portability when someone else clones the repo. Use relative paths, environment variables, or configuration files instead.

Known false positives: Docker paths like `/home/app/` in Dockerfiles, CI paths in workflow files. Suppress via the allowlist mechanism.
</category>

<category name="Commit Hygiene">

| Pattern | Regex | Example Match | False Positive Risk |
|---------|-------|---------------|---------------------|
| Merge Conflict Marker | `[<>=]{7}` | `<<<<<<< HEAD` | Very low — 7 identical chars is distinctive |

</category>

<skipped_files>
Lock files and generated content are automatically skipped to avoid false positives from hashes and encoded content:
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `Pipfile.lock`, `poetry.lock`, `composer.lock`, `Gemfile.lock`, `Cargo.lock`, `go.sum`
- `*.min.js`, `*.min.css`, `*.map`
- `*.pb.go`, `*.generated.*`, `*.snap`
</skipped_files>

<known_limitations>
- Base64-encoded secrets: A base64-encoded AWS key evades regex matching. Use gitleaks with `--max-decode-depth` for repos handling sensitive credentials.
- Split secrets: `key = "AKIA" + "IOSF" + "ODNN7EXAMPLE"` is invisible to all pattern matchers.
- Binary files: Not scanned. Secrets embedded in `.xlsx`, `.sqlite`, or compiled artifacts are invisible.
- LFS content: Only pointer files appear in staged diffs; actual content is not scanned.
- Entropy-based detection: This scanner does not use entropy analysis. High-entropy random strings that don't match a known pattern format will not be flagged.
</known_limitations>

</secret_patterns>
