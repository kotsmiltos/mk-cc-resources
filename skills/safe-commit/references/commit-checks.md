<commit_checks>

<check_tiers>

<tier level="BLOCK" description="Commit aborted">

| Check | Source | What It Catches |
|-------|--------|-----------------|
| Secret patterns (33 regex) | `scan-secrets.sh` content scan | AWS keys, GitHub/GitLab tokens, Slack tokens, Stripe keys, Google API keys, private key headers, DB URLs with passwords, generic API key/secret assignments, Bearer tokens, service-specific tokens (Heroku, SendGrid, Twilio, Mailgun, NPM) |
| Hardcoded local paths | `scan-secrets.sh` content scan | `/home/user/`, `/Users/user/`, `C:\Users\user\` — privacy/portability violations |
| Merge conflict markers | `scan-secrets.sh` content scan | 7+ consecutive `<`, `=`, or `>` characters |
| Sensitive file types (15 patterns) | `scan-secrets.sh` file-type check | `.env`, `.env.*`, `.pem`, `.key`, `.p12`, `.pfx`, `.jks`, `.keystore`, `credentials.json`, `credentials.yaml`, `id_rsa`, `id_ed25519`, `id_ecdsa`, `.htpasswd`, `token.json` |

</tier>

<tier level="WARN" description="Proceed with warning">

| Check | Source | What It Catches |
|-------|--------|-----------------|
| Main/master branch | `/safe-commit` command logic | Committing directly to main or master |
| Unstaged changes | `/safe-commit` command logic | Files that might be intended for this commit but aren't staged |

</tier>

</check_tiers>

<allowlist>

Place a `.safe-commit-allow` file in the repo root to suppress known false positives.

Format:
```
# Comments start with #

# Suppress ALL findings in a specific file
path/to/test-fixtures.py

# Suppress a specific pattern in a specific file (pattern:file)
AWS Access Key:tests/test_config.py
Hardcoded Home Directory Path:Dockerfile
```

Rules:
- One entry per line
- Lines starting with `#` are comments
- Empty lines are ignored
- File paths use substring matching — `test-fixtures.py` matches `src/test-fixtures.py`
- Pattern names use substring matching — `AWS Access Key` matches "AWS Access Key ID"
- The allowlist itself should be committed to the repo (it's not sensitive)
</allowlist>

<gitleaks_upgrade>

For repos handling sensitive credentials and needing maximum coverage (800+ patterns, base64 decoding), install gitleaks as a defense-in-depth layer.

<installation>

Direct binary (recommended for single user):
```bash
curl -sSL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_$(uname -s)_$(uname -m | sed 's/x86_64/x64/').tar.gz | tar xz -C ~/.local/bin/ gitleaks
chmod +x ~/.local/bin/gitleaks
gitleaks version
```

Via package manager:
```bash
# macOS
brew install gitleaks

# Ubuntu/Debian (may not be latest version)
apt install gitleaks
```
</installation>

<per_repo_hook>

```bash
# In your repo root:
cat > .git/hooks/pre-commit << 'HOOK'
#!/usr/bin/env bash
gitleaks git --staged --verbose --redact
HOOK
chmod +x .git/hooks/pre-commit
```
</per_repo_hook>

<pre_commit_framework>

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2  # check for latest version
    hooks:
      - id: gitleaks
```
</pre_commit_framework>

<global_hook>

```bash
git config --global core.hooksPath ~/.config/git/hooks
mkdir -p ~/.config/git/hooks

cat > ~/.config/git/hooks/pre-commit << 'HOOK'
#!/usr/bin/env bash
if command -v gitleaks &>/dev/null; then
    gitleaks git --staged --verbose --redact
fi
HOOK
chmod +x ~/.config/git/hooks/pre-commit
```
</global_hook>

<false_positive_suppression>

```toml
# .gitleaks.toml in repo root
[allowlist]
paths = [
    '''package-lock\.json''',
    '''go\.sum''',
    '''fixtures/''',
]

# Suppress specific findings by fingerprint
# Run: gitleaks git --staged --verbose to see fingerprints
[[allowlist.commits]]
hash = "abc123..."
```
</false_positive_suppression>

<stacking>
Both layers work together:
1. `/safe-commit` runs `scan-secrets.sh` (fast, ~30 patterns)
2. `git commit` triggers gitleaks pre-commit hook (thorough, 800+ patterns)
3. If either blocks, the commit is stopped

The `/safe-commit` command provides the rich UX (WHO/WHAT/WHERE, suggested fixes). Gitleaks provides the deterministic guarantee with broader coverage.

Source: [gitleaks GitHub repository](https://github.com/gitleaks/gitleaks) — Official documentation.
</stacking>

</gitleaks_upgrade>

</commit_checks>
