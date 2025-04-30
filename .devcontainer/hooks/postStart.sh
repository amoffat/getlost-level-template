#!/usr/bin/env bash
set -euo pipefail

npx pm2 resurrect

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LICENSE_FILE="$THIS_DIR/license.key"

if [[ -n "${LICENSE_KEY:-}" ]]; then
    echo "🔓  Unlocking licensed assets using LICENSE_KEY environment variable..."
    echo "$LICENSE_KEY" > "$KEY_FILE"
    git-crypt unlock <("$LICENSE_KEY" | base64 -d)
elif [[ -f "$LICENSE_FILE" ]]; then
    echo "🔓  Unlocking licensed assets using license.key file..."
    git-crypt unlock "$LICENSE_FILE"
else
    echo "⚠️  No LICENSE_KEY secret or license.key file found. Licensed assets remain locked."
fi