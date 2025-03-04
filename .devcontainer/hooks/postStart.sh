#!/usr/bin/env bash
set -eux

npx pm2 start --name vite "npm run dev" --restart-delay=1000
npx pm2 start --name tiled 'tiled level/tiled/level.tiled-project' --stop-exit-codes 0

# One day we'll be able to do this declaratively
# https://github.com/orgs/community/discussions/4068
# We sleep to give the server time to start up :|
(sleep 3 && gh codespace ports visibility 5173:public -c $CODESPACE_NAME) &