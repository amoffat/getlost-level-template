#!/usr/bin/env bash
set -euo pipefail

npx pm2 resurrect

if [[ -n "${LICENSE_KEY:-}" ]]; then
    echo "🔓  Unlocking licensed assets with git-crypt..."
    echo "$LICENSE_KEY" | base64 -d > /tmp/git-crypt-key.bin
    git-crypt unlock /tmp/git-crypt-key.bin
    rm /tmp/git-crypt-key.bin
else
    echo "⚠️  No LICENSE_KEY secret found. Licensed assets remain locked."
    echo "    Ask a maintainer for access."
fi