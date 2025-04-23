#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_REPO="amoffat/getlost-level-template"
THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ECOSYSTEM_FILE="$THIS_DIR/../ecosystem.config.cjs"

echo "Starting PM2 in the background..."
npx pm2 start "$ECOSYSTEM_FILE"
npx pm2 save

# https://github.com/devcontainers/features/issues/453
rm ~/.docker/config.json

# Get the current repository remote URL
CUR_REPO_URL=$(git config --get remote.origin.url || echo "")

# Only initialize git-crypt if this is not the template repository
if [[ "$CUR_REPO_URL" != *$TEMPLATE_REPO* ]]; then
    # Only initialize git-crypt once
    if [ ! -d ".git/git-crypt" ]; then
        echo "git-crypt not initialized. Initializing..."
        git-crypt init
        echo "Initialized git-crypt. Don't forget to export a key and set up your secrets!"
    else
        echo "git-crypt already initialized."
    fi
else
    echo "Template repository detected. Skipping git-crypt initialization."
fi
