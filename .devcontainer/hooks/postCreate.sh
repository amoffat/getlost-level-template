#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_REPO="amoffat/getlost-level-template"
THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ECOSYSTEM_FILE="$THIS_DIR/../ecosystem.config.cjs"
CUR_REPO_URL=$(git config --get remote.origin.url || echo "")
WORKSPACE_DIR=$(realpath /workspaces/*)
INTERNAL_DIR="$WORKSPACE_DIR/.internal"

echo "Starting PM2 in the background..."
npx --prefix "$INTERNAL_DIR" pm2 start "$ECOSYSTEM_FILE"
npx --prefix "$INTERNAL_DIR" pm2 save

# https://github.com/devcontainers/features/issues/453
# rm ~/.docker/config.json

# Only initialize git-crypt if this is not the template repository
if [[ "$CUR_REPO_URL" != *$TEMPLATE_REPO* ]]; then
    # Only initialize git-crypt once
    if [ ! -d ".git/git-crypt" ]; then
        echo "Initializing git-crypt..."
        git-crypt init

        if git-crypt status -e | grep -q 'encrypted'; then
            echo "Repo was already encrypted, discarding irrelevant key..."
            # This locks the repo (but nothing was added to the index, so
            # nothing is encrypted with our generated key), and discards the
            # generated key.
            git-crypt lock -f
        else
            echo "Exporting generated key..."
            git-crypt export-key - | base64 -w 0 > assets.key
        fi
    else
        echo "git-crypt already initialized."
    fi
else
    echo "Template repository detected. Skipping git-crypt initialization."
fi
