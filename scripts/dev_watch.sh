#!/bin/bash

chokidar \
    'level/**/*' \
    'engine_version.txt' \
    --ignore 'level/assemblyscript/main*' \
    --ignore 'level/tiled/*.tiled-session' \
    -c 'touch vite.config.ts'