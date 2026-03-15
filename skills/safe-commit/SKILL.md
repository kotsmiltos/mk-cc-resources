---
name: safe-commit
description: Commit safety layer — secret scanning, identity verification, and commit hygiene enforcement. Blocks commits containing secrets, sensitive files, hardcoded paths, or merge conflict markers. Use when making any git commit.
---

<objective>
Enforce commit safety before every git commit. Verify the committer's identity, scan staged changes for secrets and sensitive files, and enforce commit hygiene rules. Block unsafe commits with clear explanations; proceed cleanly when safe.
</objective>

<quick_start>
When triggered (by `/safe-commit` or any commit workflow):
1. Show the resolved git author (`git config user.name` + `git config user.email`)
2. Run `scripts/scan-secrets.sh` against staged changes
3. If findings exist: BLOCK the commit, show each finding with file, line, redacted match, and fix suggestion
4. If clean: proceed with the commit
5. NEVER push to remote. NEVER add Co-Authored-By trailers.
</quick_start>

<constraints>

<identity>
- ALWAYS show the resolved git author before committing — the user MUST see exactly who is committing
- NEVER modify git config — read-only access to identity information
- The user's `includeIf` rules handle identity switching automatically
</identity>

<commit_hygiene>
- NEVER add a Co-Authored-By trailer to commits
- NEVER push to a remote — commits only; pushing is a separate, user-initiated action
- Suggest clear, descriptive commit messages — if the user provides one, use it as-is
- Prefer staging specific files over `git add -A` or `git add .` to avoid accidentally including sensitive files
</commit_hygiene>

</constraints>

<security_checklist>

Checks run in this order. BLOCK-level findings abort the commit.

<check level="BLOCK">
Sensitive file types staged for commit: `.env`, `.env.*`, `.pem`, `.key`, `.p12`, `.pfx`, `.jks`, `.keystore`, `credentials.json`, `credentials.yaml`, `id_rsa`, `id_ed25519`, `id_ecdsa`, `.htpasswd`, `token.json`
Action: add to .gitignore, use environment variables or a secrets manager instead.
</check>

<check level="BLOCK">
Secret patterns in staged content (33 regex patterns): AWS keys, GitHub/GitLab tokens, Slack tokens, Stripe keys, Google API keys, private key headers, database URLs with credentials, generic API key/secret assignments, Bearer tokens, service-specific tokens (Heroku, SendGrid, Twilio, Mailgun, NPM).
See references/secret-patterns.md for the full pattern catalog with false-positive risk ratings.
</check>

<check level="BLOCK">
Hardcoded local paths: `/home/user/...`, `/Users/user/...`, `C:\Users\user\...` — these leak personal setup details and break portability.
</check>

<check level="BLOCK">
Merge conflict markers in staged files (7+ consecutive `<`, `=`, or `>` characters).
</check>

<check level="WARN">
Committing directly to `main` or `master` — warn the user but do not block.
</check>

<check level="WARN">
Empty or single-word commit messages — warn and suggest improvement.
</check>

</security_checklist>

<error_handling>
- If `scan-secrets.sh` exits with code 2: not in a git repo or git unavailable — surface this error clearly to the user
- If the script is not executable or not found: fall back to manual pattern inspection of `git diff --staged` output against the patterns in references/secret-patterns.md
- If the scan finds issues, show each finding with: pattern name, file:line location, redacted match preview, and suggested fix
</error_handling>

<allowlist>
Known false positives can be suppressed with a `.safe-commit-allow` file in the repo root.

Format (one entry per line):
- `path/to/file.py` — suppress ALL findings in that file (substring match)
- `Pattern Name:path/to/file.py` — suppress a specific pattern in a specific file
- Lines starting with `#` are comments
- The allowlist itself should be committed to the repo (it's not sensitive)

See references/commit-checks.md for full allowlist documentation.
</allowlist>

<scripts_index>

| Script | Purpose | Usage |
|--------|---------|-------|
| scripts/scan-secrets.sh | Deterministic secret scanner for staged git changes | `bash scripts/scan-secrets.sh` — exit 0=clean, 1=findings, 2=error |

</scripts_index>

<reference_index>

| Reference | Purpose |
|-----------|---------|
| references/commit-checks.md | Check tiers (BLOCK/WARN), allowlist format, gitleaks upgrade guide |
| references/secret-patterns.md | Full pattern catalog with regex, examples, and false-positive risk ratings |

</reference_index>

<limitations>
Be transparent about what this scanner cannot catch:
- Base64-encoded secrets (without external tools like gitleaks)
- Secrets split across multiple lines or variables
- Secrets in binary files or LFS-tracked content
- Secrets in submodule content
- High-entropy strings that don't match a known pattern format

For maximum coverage, see the gitleaks upgrade guide in references/commit-checks.md.
</limitations>

<success_criteria>
- Git author identity shown to the user before committing
- `scan-secrets.sh` ran against staged changes (or manual inspection if script unavailable)
- All BLOCK-level findings surfaced with file, line, match preview, and fix suggestion — commit aborted
- All WARN-level conditions surfaced as warnings
- If clean: commit created with a clear, descriptive message
- No Co-Authored-By trailer added
- No push to remote attempted
- No git config modified
</success_criteria>
