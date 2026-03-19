# safe-commit Release Notes

## v1.0.0 (2026-03-09)

### Initial Release

- Secret scanning via pattern matching (API keys, tokens, passwords, private keys)
- Identity verification — confirms git author matches expected config
- Commit hygiene checks — blocks merge conflict markers, hardcoded paths, sensitive files
- Scan script at `scripts/scan-secrets.sh`
- Reference patterns in `references/secret-patterns.md`
