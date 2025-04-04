#!/usr/bin/env bash
set -eux

npm ci
npm ci --prefix "$HOME/twinejs"
poetry install -P "$WORKSPACE_DIR/spindler"