#!/usr/bin/env bash
set -eux

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ECOSYSTEM_FILE="$THIS_DIR/../ecosystem.config.cjs"
ls -la "$ECOSYSTEM_FILE"

echo "Starting PM2 in the background..."
npx pm2 start "$ECOSYSTEM_FILE"
npx pm2 save