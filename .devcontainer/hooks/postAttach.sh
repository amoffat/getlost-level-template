#!/usr/bin/env bash
set -euo pipefail

PUBLIC_PORT=5173

# Check if running in a GitHub Codespace
if [ -n "${CODESPACE_NAME:-}" ]; then
  # Only run these commands in GitHub Codespace
  while ! gh codespace ports -c $CODESPACE_NAME | grep -q "$PUBLIC_PORT"; do
    sleep 1
  done

  # One day we'll be able to do this declaratively
  # https://github.com/orgs/community/discussions/4068
  gh codespace ports visibility "$PUBLIC_PORT:public" -c $CODESPACE_NAME
else
  echo "Not running in a GitHub Codespace - skipping port visibility configuration"
fi