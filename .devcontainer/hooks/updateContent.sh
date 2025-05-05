#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR=$(realpath /workspaces/*)

npm install
npm install --prefix "$HOME/twinejs"
poetry install -P "$WORKSPACE_DIR/_devenv/spindler"