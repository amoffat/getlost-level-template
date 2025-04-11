#!/usr/bin/env bash
set -eux

npm install
npm install --prefix "$HOME/twinejs"
poetry install -P "$WORKSPACE_DIR/spindler"