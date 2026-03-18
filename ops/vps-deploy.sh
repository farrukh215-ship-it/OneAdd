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

echo "=== DEPLOY: MIGRATIONS ==="
docker compose up -d postgres redis
docker compose run --rm api sh -lc "cd /app/apps/api && pnpm exec prisma migrate deploy"
docker compose run --rm api sh -lc "cd /app/apps/api && pnpm exec prisma db seed"
docker compose exec -T postgres psql -U "${POSTGRES_USER:-tgmg_user}" -d "${POSTGRES_DB:-tgmg}" -f /opt/tgmg/ops/sql/validate-schema.sql

echo "=== DEPLOY: START SERVICES ==="
docker compose up -d api web admin nginx

wait_for_service() {
  local service="$1"
  local max_attempts="${2:-45}"
  local sleep_seconds="${3:-4}"
  local cid

  cid="$(docker compose ps -q "$service")"
  if [[ -z "$cid" ]]; then
    echo "Service $service container not found"
    return 1
  fi

  local status=""
  for attempt in $(seq 1 "$max_attempts"); do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || true)"
    if [[ "$status" == "healthy" || "$status" == "running" ]]; then
      echo "Service $service is $status"
      return 0
    fi
    echo "Waiting for $service (attempt ${attempt}/${max_attempts}) current=${status:-unknown}"
    sleep "$sleep_seconds"
  done

  echo "Service $service failed readiness check. Last status=${status:-unknown}"
  docker compose logs "$service" --tail=120 || true
  return 1
}

echo "=== DEPLOY: HEALTH CHECKS ==="
docker compose ps
wait_for_service api
wait_for_service web
wait_for_service nginx
bash ./ops/vps-healthcheck.sh

echo "=== DEPLOY COMPLETE ==="
