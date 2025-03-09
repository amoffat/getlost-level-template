#!/usr/bin/env bash

# In Codespaces, for some reason SHELL isn't set and chokidar fails
export SHELL=/bin/bash
chokidar \
    'level/**/*' \
    'engine_version.txt' \
    --ignore 'level/assemblyscript/main*' \
    --ignore 'level/tiled/*.tiled-session' \
    -c 'touch vite.config.ts'