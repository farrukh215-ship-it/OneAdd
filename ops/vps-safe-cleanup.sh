#!/usr/bin/env bash
set -euo pipefail

echo "=== BEFORE CLEANUP ==="
df -h
echo
docker system df -v || true
echo

echo "=== OS SAFE CLEANUP ==="
apt-get clean
apt-get autoremove -y
journalctl --vacuum-time=7d || true

rm -rf /tmp/*
rm -rf /var/tmp/*

find /var/log -type f -name "*.gz" -delete || true
find /var/log -type f -name "*.1" -delete || true
find /var/log -type f -name "*.log" -size +100M -exec truncate -s 0 {} \; || true

echo "=== DOCKER SAFE CLEANUP (NO VOLUMES) ==="
docker builder prune -af || true
docker image prune -af || true
docker container prune -f || true
docker network prune -f || true

echo "=== PACKAGE CACHE CLEANUP ==="
rm -rf /root/.npm/_cacache/* || true
rm -rf /root/.cache/pnpm/* || true
rm -rf /root/.local/share/pnpm/store/* || true

echo
echo "=== AFTER CLEANUP ==="
df -h
echo
docker system df -v || true

