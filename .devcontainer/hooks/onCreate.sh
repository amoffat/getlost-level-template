#!/usr/bin/env bash
set -eux

WORKSPACE_DIR=$(realpath /workspaces/*)

npm ci
npm ci --prefix "$HOME/twinejs"
poetry install -P "$WORKSPACE_DIR/spindler"