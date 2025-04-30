#!/bin/bash
set -euo pipefail

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR=$(realpath "$THIS_DIR/..")
KEY_FILE="$REPO_DIR/license.key"

# Check if LICENSE_KEY was provided
if [ -z "$LICENSE_KEY" ]; then
    echo "Error: No license key provided"
    exit 1
fi

echo "Importing license key..."

echo "$LICENSE_KEY" > "$KEY_FILE"
git-crypt unlock <(cat "$KEY_FILE" | base64 -d)

echo "License key successfully imported."
