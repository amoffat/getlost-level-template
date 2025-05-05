#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR=$(realpath /workspaces/*)

npm ci --prefix _devenv/
npm ci --prefix "$HOME/twinejs"
poetry install -P "$WORKSPACE_DIR/_devenv/spindler"