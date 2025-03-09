#!/usr/bin/env bash
set -eux

# In a Github Codespace, using --host leads to a 502 bad gateway error
if [ -n "${CODESPACE_NAME:-}" ]; then
    vite_cmd="npx vite"
# In a local devcontainer, using --host is necessary to access the dev server
# from the browser
else
    vite_cmd="npx vite --host"
fi

npx pm2 start --name vite "$vite_cmd" --restart-delay=1000
npx pm2 start --name tiled 'tiled level/tiled/level.tiled-project' --stop-exit-codes 0