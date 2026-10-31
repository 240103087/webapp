#!/usr/bin/env bash
# Builds the Docker Compose stack on its own project and port, runs the integration and
# end-to-end tests against it, and removes it again with its data (#73).
#   npm run test:stack
set -euo pipefail
cd "$(dirname "$0")/.."

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-moveeasy-test}"
export APP_PORT="${APP_PORT:-8100}"
BUILD="${STACK_BUILD:---build}"   # STACK_BUILD=--no-build reuses an image built before

cleanup() {
  local code=$?
  if [ "$code" != 0 ]; then docker compose logs --no-color --tail 200 || true; fi
  if [ "${KEEP_STACK:-0}" != "1" ]; then docker compose down -v --remove-orphans; fi
}
trap cleanup EXIT

docker compose up -d $BUILD --wait --wait-timeout 300
E2E_BASE_URL="http://localhost:${APP_PORT}" E2E_STACK=1 npm run e2e
