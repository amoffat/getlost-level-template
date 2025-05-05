#!/usr/bin/env bash
set -euo pipefail

npx --prefix .internal/ pm2 resurrect

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR=$(realpath /workspaces/*)
KEY_FILE="$WORKSPACE_DIR/assets.key"

if [[ -n "${ASSETS_KEY:-}" ]]; then
    echo "$ASSETS_KEY" > "$KEY_FILE"
fi

if [[ -f "$KEY_FILE" ]]; then
    echo "🔓  Unlocking licensed assets using $KEY_FILE..."
    if [[ -n "$(git status --porcelain)" ]]; then
        git stash push -q -m "+pre-unlock"
        git-crypt unlock <(cat "$KEY_FILE" | base64 -d)
        git stash pop -q || true
    else
        git-crypt unlock <(cat "$KEY_FILE" | base64 -d)
    fi
else
    echo "⚠️  No ASSETS_KEY secret or assets.key ($KEY_FILE) file found. Licensed assets remain locked."
fi