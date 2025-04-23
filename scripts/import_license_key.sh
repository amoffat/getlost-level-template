#!/bin/bash
set -euo pipefail

# Check if LICENSE_KEY was provided
if [ -z "$LICENSE_KEY" ]; then
    echo "Error: No license key provided"
    exit 1
fi

# git-crypt unlock

echo "License key successfully imported."
