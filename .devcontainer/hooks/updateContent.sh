#!/usr/bin/env bash
set -eux

WORKSPACE_DIR=$(realpath /workspaces/*)

npm install
npm install --prefix "$HOME/twinejs"
poetry install -P "$WORKSPACE_DIR/spindler"