#!/bin/bash
set -euo pipefail

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR=$(realpath "$THIS_DIR/../..")
KEY_FILE="$REPO_DIR/assets.key"

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
