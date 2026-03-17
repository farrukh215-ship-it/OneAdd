#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/tgmg}"
BRANCH="${BRANCH:-tgmg-monorepo}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"

cd "$PROJECT_DIR"

echo "=== DEPLOY: FETCH/PULL ==="
git fetch origin
git pull origin "$BRANCH"

CURRENT_COMMIT="$(git rev-parse --short HEAD)"
echo "Current commit: $CURRENT_COMMIT"

if [[ -n "$EXPECTED_COMMIT" && "$CURRENT_COMMIT" != "$EXPECTED_COMMIT" ]]; then
  echo "Expected commit $EXPECTED_COMMIT but got $CURRENT_COMMIT"
  exit 1
fi

echo "=== DEPLOY: BUILD/UP ==="
docker compose build --no-cache api web admin
docker compose up -d postgres redis api web admin nginx

echo "=== DEPLOY: HEALTH CHECKS ==="
docker compose ps
./ops/vps-healthcheck.sh

echo "=== DEPLOY COMPLETE ==="

