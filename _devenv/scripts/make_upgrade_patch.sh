#!/bin/bash
set -euo pipefail

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR=$(realpath "$THIS_DIR/../..")

# Find the most recent commit with "#upgrade" in the commit message
UPGRADE_COMMIT=$(git log --grep="#upgrade" --max-count=1 --format="%H")

if [ -z "$UPGRADE_COMMIT" ]; then
  echo "No commit found with '#upgrade' tag in the message"
  echo "Falling back to the first commit..."
  UPGRADE_COMMIT=$(git rev-list --max-parents=0 HEAD)
fi

echo "Using commit: $UPGRADE_COMMIT"
echo "Generating diff against current state (excluding /level directory)..."

# Generate the diff, excluding the /level directory
git diff "$UPGRADE_COMMIT" -- . ':(exclude)level/' > "$REPO_DIR/upgrade.patch"