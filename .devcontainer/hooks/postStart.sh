#!/usr/bin/env bash
set -eux

# One day we'll be able to do this declaratively
# https://github.com/orgs/community/discussions/4068
gh codespace ports visibility 5173:public -c $CODESPACE_NAME

npx pm2 start --name 'tiled level/tiled/level.tiled-project'
npx pm2 start --name "npm run dev"