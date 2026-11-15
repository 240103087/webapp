#!/usr/bin/env bash
# Waits until <url>/api/health answers 200 with "version": "<version>" (#101, #102).
# A Render free service can take a few minutes: it pulls the image, starts, and may wake from sleep.
#   scripts/wait-for-version.sh https://moveeasy-dev.onrender.com 20261115-130501-abc1234 [timeout-seconds]
set -euo pipefail
url="${1:?url}"; version="${2:?version}"; timeout="${3:-900}"
deadline=$(( $(date +%s) + timeout ))
while :; do
  body=$(curl -s --max-time 20 "$url/api/health" || true)
  running=$(printf '%s' "$body" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
  echo "$(date -u +%H:%M:%S) $url/api/health -> ${running:-no answer}"
  if [ "$running" = "$version" ]; then
    echo "$url runs $version"
    exit 0
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "::error::$url did not report version $version within ${timeout}s"
    exit 1
  fi
  sleep 15
done
