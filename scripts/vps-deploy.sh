#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/zaroratbazar"
REPO_URL="${REPO_URL:-https://github.com/farrukh215-ship-it/OneAdd.git}"
BRANCH="${BRANCH:-master}"

echo "[1/6] Clone or update repository"
if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
git fetch --all
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[2/6] Ensure API env exists"
if [ ! -f services/api/.env ]; then
  cp services/api/.env.example services/api/.env
  echo "services/api/.env created from example. Please edit it before continuing."
  exit 1
fi

echo "[3/6] Build and start containers"
docker compose -f infra/docker-compose.deploy.yml down || true
docker compose -f infra/docker-compose.deploy.yml up -d --build

echo "[4/6] Wait for API container"
sleep 8

echo "[5/6] Run Prisma migrate + seed inside API container"
docker exec -i aikad-api sh -lc "pnpm db:migrate -- --name prod_init && pnpm db:seed"

echo "[6/6] Health checks"
curl -fsS http://localhost/api/health
echo
echo "Deploy complete."
