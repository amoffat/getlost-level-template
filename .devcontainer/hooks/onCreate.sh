#!/usr/bin/env bash
set -eux

npm ci
npm ci --prefix "$HOME/twinejs"