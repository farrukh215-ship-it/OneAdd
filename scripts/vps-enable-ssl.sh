#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/teragharmeraghar}"
LEGACY_APP_DIR="/opt/zaroratbazar"
if [ ! -d "$APP_DIR" ] && [ -d "$LEGACY_APP_DIR" ]; then
  APP_DIR="$LEGACY_APP_DIR"
fi

DOMAIN="${DOMAIN:-teragharmeraghar.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.teragharmeraghar.com}"
EMAIL="${EMAIL:-}"

if [ -z "$EMAIL" ]; then
  echo "Set EMAIL before running: EMAIL=you@example.com bash scripts/vps-enable-ssl.sh"
  exit 1
fi

cd "$APP_DIR"

echo "[1/5] Stop nginx container to free ports 80/443"
docker stop aikad-nginx || true

echo "[2/5] Request Let's Encrypt certificate"
certbot certonly --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  -d "$WWW_DOMAIN"

echo "[3/5] Start nginx container"
docker start aikad-nginx

echo "[4/5] Reload nginx inside container"
docker exec -i aikad-nginx nginx -t
docker exec -i aikad-nginx nginx -s reload

echo "[5/5] Verify HTTPS"
curl -I "https://$WWW_DOMAIN"
curl -I "https://$WWW_DOMAIN/api/health"

echo "SSL setup complete."
