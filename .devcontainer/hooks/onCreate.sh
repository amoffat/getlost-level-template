#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR=$(realpath /workspaces/*)

npm ci --prefix .internal/
npm ci --prefix "$HOME/twinejs"
poetry install -P "$WORKSPACE_DIR/.internal/spindler"