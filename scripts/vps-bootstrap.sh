#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] System update"
apt update
apt upgrade -y

echo "[2/4] Base packages"
apt install -y git curl ca-certificates gnupg

echo "[3/4] Docker install"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable docker
systemctl start docker

echo "[4/4] Docker verify"
docker --version
docker compose version || true

echo "Bootstrap complete."
