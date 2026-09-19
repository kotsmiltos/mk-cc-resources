#!/usr/bin/env bash
# Seed the case cwd from fixtures/ (the eval runs this in the throwaway cwd; BASH_SOURCE is the case dir).
set -e
cp -r "$(dirname "${BASH_SOURCE[0]}")/fixtures/." .
