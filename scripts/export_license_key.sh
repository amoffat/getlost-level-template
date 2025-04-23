#!/bin/bash
set -euo pipefail

echo "Share this key securely with your team:"
echo
git-crypt export-key - | base64 -w 0
echo
echo