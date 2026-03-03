#!/usr/bin/env bash
set -euo pipefail

DEFAULT_APP_DIR="/opt/teragharmeraghar"
LEGACY_APP_DIR="/opt/zaroratbazar"
if [ -d "$LEGACY_APP_DIR/.git" ] && [ ! -d "$DEFAULT_APP_DIR/.git" ]; then
  APP_DIR="$LEGACY_APP_DIR"
else
  APP_DIR="${APP_DIR:-$DEFAULT_APP_DIR}"
fi
REPO_URL="${REPO_URL:-https://github.com/farrukh215-ship-it/OneAdd.git}"
BRANCH="${BRANCH:-master}"
ENV_FILE="${ENV_FILE:-infra/.env.production}"

echo "[1/7] Clone or update repository"
if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
git fetch --all
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[2/7] Ensure API env exists"
if [ ! -f services/api/.env ]; then
  cp services/api/.env.example services/api/.env
  echo "services/api/.env created from example. Please edit it before continuing."
  exit 1
fi

echo "[3/7] Ensure deploy env exists"
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "infra/.env.production.example" ]; then
    cp "infra/.env.production.example" "$ENV_FILE"
    echo "$ENV_FILE created from example. Please edit it before continuing."
  else
    echo "$ENV_FILE missing. Create it with Firebase web build args and CORS values."
  fi
  exit 1
fi

echo "[4/7] Build and start containers"
docker compose -f infra/docker-compose.deploy.yml down || true
docker compose --env-file "$ENV_FILE" -f infra/docker-compose.deploy.yml up -d --build

echo "[5/7] Wait for API container"
sleep 8

echo "[6/7] Run Prisma migrate + seed inside API container"
docker exec -i aikad-api sh -lc "pnpm db:migrate:deploy && pnpm db:seed"

echo "[7/7] Health checks"
curl -fsS http://localhost:3001/health
echo
curl -fsSI -H "Host: www.teragharmeraghar.com" http://127.0.0.1/ | head -n 1
echo
echo "Deploy complete."
