#!/usr/bin/env bash
set -euo pipefail

HOST_HEADER="${HOST_HEADER:-teragharmeraghar.com}"

echo "=== LOCAL ORIGIN CHECK ==="
curl -sS -I http://127.0.0.1/healthz
echo
curl -k -sS -I https://127.0.0.1 -H "Host: ${HOST_HEADER}"
echo
curl -k -sS -I https://127.0.0.1/api/health -H "Host: ${HOST_HEADER}"
echo

echo "=== CONTAINER HEALTH ==="
docker compose ps
echo
docker compose logs web --tail=40
echo
docker compose logs api --tail=40
echo
docker compose logs nginx --tail=40
