#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR=$(realpath /workspaces/*)
INTERNAL_DIR="$WORKSPACE_DIR/.internal"

npm install --prefix "$INTERNAL_DIR"
npm install --prefix "$HOME/twinejs"
poetry install -P "$INTERNAL_DIR/spindler"