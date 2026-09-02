#!/usr/bin/env bash
# Sync Neon schema to packages/database/prisma/schema.prisma (local + staging).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi
export DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL=//')"
export DIRECT_URL="$(grep -E '^DIRECT_URL=' "$ENV_FILE" | head -1 | sed 's/^DIRECT_URL=//' || true)"
cd "${ROOT}/packages/database"
npx prisma db push --config prisma.config.ts --accept-data-loss
