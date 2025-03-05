#!/usr/bin/env bash
set -eux

npx pm2 start --name vite "npm run dev" --restart-delay=1000
npx pm2 start --name tiled 'tiled level/tiled/level.tiled-project' --stop-exit-codes 0