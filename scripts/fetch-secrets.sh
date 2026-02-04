#!/usr/bin/env bash
set -euo pipefail

# fetch-secrets.sh
# ホスト管理の場所から /srv/guild-mng-bot/.env を生成する簡易ヘルパー。
# OCI Vault や HashiCorp Vault 等、利用するシークレットバックエンドに合わせて適宜改変してください。

TARGET_ENV=/srv/guild-mng-bot/.env

echo "Attempting to generate ${TARGET_ENV}..."

if [ -f /etc/guild-mng-bot/env ]; then
  echo "Using /etc/guild-mng-bot/env"
  cp /etc/guild-mng-bot/env "$TARGET_ENV"
  chmod 600 "$TARGET_ENV"
  echo "Wrote $TARGET_ENV from /etc/guild-mng-bot/env"
  exit 0
fi

if command -v oci >/dev/null 2>&1 && [ -n "${OCI_SECRET_OCID-}" ]; then
  echo "Fetching secrets from OCI Vault (OCI_SECRET_OCID set)..."
  tmpfile=$(mktemp)
  oci vault secret get --secret-id "$OCI_SECRET_OCID" --raw-output > "$tmpfile"
  # The secret should be a single value like DISCORD_TOKEN; adapt as needed
  echo "DISCORD_TOKEN=$(cat $tmpfile)" > "$TARGET_ENV"
  chmod 600 "$TARGET_ENV"
  rm -f "$tmpfile"
  echo "Wrote $TARGET_ENV from OCI Vault"
  exit 0
fi

echo "No known secret source found. Please create /etc/guild-mng-bot/env or set OCI_SECRET_OCID."
exit 1