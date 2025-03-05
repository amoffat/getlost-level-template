#!/usr/bin/env bash
set -eux

PUBLIC_PORT=5173

while ! gh codespace ports -c $CODESPACE_NAME | grep -q "$PUBLIC_PORT"; do
  sleep 1
done

# One day we'll be able to do this declaratively
# https://github.com/orgs/community/discussions/4068
gh codespace ports visibility "$PUBLIC_PORT:public" -c $CODESPACE_NAME
