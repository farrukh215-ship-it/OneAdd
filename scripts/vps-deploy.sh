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
FIREBASE_KEY_FILE="${FIREBASE_KEY_FILE:-$APP_DIR/keys/firebase-admin.json}"

set_kv() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf "%s=%s\n" "$key" "$value" >> "$file"
  fi
}

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

echo "[4/9] Validate Firebase key + enforce env defaults"
if [ ! -f "$FIREBASE_KEY_FILE" ]; then
  echo "Missing Firebase key at: $FIREBASE_KEY_FILE"
  echo "Upload service-account JSON here and re-run:"
  echo "  mkdir -p \"$APP_DIR/keys\""
  echo "  # from your local PC use scp to upload as firebase-admin.json"
  exit 1
fi

chmod 700 "$APP_DIR/keys"
chmod 600 "$FIREBASE_KEY_FILE"
mkdir -p "$APP_DIR/uploads"

set_kv "services/api/.env" "PUSH_PROVIDER" "fcm"
set_kv "services/api/.env" "FIREBASE_SERVICE_ACCOUNT_PATH" "/app/keys/firebase-admin.json"
set_kv "$ENV_FILE" "FIREBASE_SERVICE_ACCOUNT_PATH" "/app/keys/firebase-admin.json"
set_kv "$ENV_FILE" "CORS_ORIGIN" "https://teragharmeraghar.com,https://www.teragharmeraghar.com"

echo "[5/9] Build and start containers"
docker compose -f infra/docker-compose.deploy.yml down || true
docker compose --env-file "$ENV_FILE" -f infra/docker-compose.deploy.yml up -d --build

echo "[6/9] Wait for API container"
sleep 8

echo "[7/9] Run Prisma migrate + seed inside API container"
docker exec -i aikad-api sh -lc "pnpm db:migrate:deploy && pnpm db:seed"

echo "[8/9] Verify Firebase mount + runtime env"
docker exec -i aikad-api sh -lc "ls -la /app/keys/firebase-admin.json"
docker exec -i aikad-api sh -lc "printenv | grep -E 'PUSH_PROVIDER|FIREBASE_SERVICE_ACCOUNT_PATH|FCM_PROJECT_ID|FCM_CLIENT_EMAIL'"

echo "[9/9] Health checks"
curl -fsS http://localhost:3001/health
echo
curl -fsSI -H "Host: www.teragharmeraghar.com" http://127.0.0.1/ | head -n 1
echo
echo "Deploy complete."
