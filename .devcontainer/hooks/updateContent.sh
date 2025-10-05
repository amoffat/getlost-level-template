#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR=$(realpath /workspaces/*)
INTERNAL_DIR="$WORKSPACE_DIR/.internal"

npm install --prefix "$INTERNAL_DIR"

uv self update
uv venv --allow-existing /home/node/venv
source /home/node/venv/bin/activate
uv pip install -e "$INTERNAL_DIR/spindler"
uv pip install -e "$INTERNAL_DIR/deployer"

uv tool install -e "$INTERNAL_DIR/deployer"
uv tool install -e "$INTERNAL_DIR/spindler"
uv tool install git+https://github.com/amoffat/translator@main