#!/usr/bin/env bash
set -eux

npx pm2 start vite
npx pm2 start tiled