#!/bin/bash
set -euo pipefail

WORKSPACE_DIR=$(realpath /workspaces/*)
INTERNAL_DIR="$WORKSPACE_DIR/.internal"
LEVEL_DIR="$WORKSPACE_DIR/level"
KEY_FILE="$LEVEL_DIR/assets.key"

# Check if ASSETS_KEY was provided
if [ -z "$ASSETS_KEY" ]; then
    echo "Error: No assets key provided"
    exit 1
fi

echo "Importing assets key..."

echo "$ASSETS_KEY" > "$KEY_FILE"
if [[ -n "$(git status --porcelain)" ]]; then
    git stash push -q -m "+pre-unlock"
    git-crypt unlock <(cat "$KEY_FILE" | base64 -d)
    git stash pop -q || true
else
    git-crypt unlock <(cat "$KEY_FILE" | base64 -d)
fi

echo "Assets key successfully imported."
