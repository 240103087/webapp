#!/usr/bin/env bash
# Runs on the EC2 instance as root (#74, #75): at first boot, and from CI through SSM.
#   deploy.sh [git ref or commit]   (default: main)
# Checks out the ref, rebuilds the image and restarts the stack. Data volumes are kept.
set -euo pipefail

# Everything is inside main(), so bash has read the whole script before `git reset` replaces it.
main() {
  local app_dir="${APP_DIR:-/opt/moveeasy}" ref="${1:-main}"
  export HOME="${HOME:-/root}"
  cd "$app_dir"

  git fetch --depth 1 origin "$ref"
  git reset --hard FETCH_HEAD
  echo "Deploying $(git rev-parse --short HEAD)"

  local compose=(docker compose -f docker-compose.yaml -f deploy/docker-compose.prod.yaml)
  "${compose[@]}" build app
  "${compose[@]}" up -d --remove-orphans --wait --wait-timeout 600
  docker image prune -f >/dev/null
  "${compose[@]}" ps
}

main "$@"
