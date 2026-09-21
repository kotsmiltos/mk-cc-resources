#!/usr/bin/env bash
# Seed the case cwd from fixtures/, then lay the marketplace's LIVE knowledge base over it — the
# real history (captures, extracted, digests) that a fresh fixture cannot fake. The kb lives at
# the repo root, four levels up from this case dir; it is gitignored there and is never copied
# into the repo by this script. The eval runs this in the throwaway cwd; BASH_SOURCE is the case dir.
set -e
here="$(dirname "${BASH_SOURCE[0]}")"
cp -r "$here/fixtures/." .
mkdir -p .claude/kb
cp -r "$here/../../../../.claude/kb/." .claude/kb/
rm -f .claude/kb/trace.jsonl
