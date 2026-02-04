#!/usr/bin/env bash
set -euo pipefail

# ホスト向けの簡易デプロイスクリプト。リポジトリが /srv/guild-mng-bot にある前提。
cd /srv/guild-mng-bot

echo "Logging into GHCR..."
if [ -n "${GHCR_TOKEN-}" ] && [ -n "${GHCR_USERNAME-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

echo "Pulling images and restarting containers..."
docker compose pull || true
docker compose up -d --remove-orphans

echo "Deploy complete."