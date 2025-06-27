#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR=$(realpath /workspaces/*)
INTERNAL_DIR="$WORKSPACE_DIR/.internal"

npm ci --prefix "$INTERNAL_DIR"
npm ci --prefix "$HOME/twinejs"
poetry install -P "$INTERNAL_DIR/spindler"
poetry install -P "$INTERNAL_DIR/deployer"