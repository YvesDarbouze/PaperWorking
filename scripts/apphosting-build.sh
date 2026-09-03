#!/usr/bin/env bash
# Ordered monorepo build for Firebase App Hosting / local CI.
# Avoids `npm --workspace=` which App Hosting can fail with "No workspaces found".
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

need() {
  if [[ ! -f "$1" ]]; then
    echo "ERROR: missing $1 (App Hosting root directory must be the monorepo repo root, not apps/web)" >&2
    exit 1
  fi
}

need package.json
need packages/shared/package.json
need packages/validation/package.json
need packages/financial-engine/package.json
need packages/authz/package.json
need packages/identity/package.json
need packages/database/package.json
need packages/services/package.json
need apps/api/package.json
need apps/web/package.json

echo "[apphosting-build] installing workspace dependencies"
# App Hosting breaks `npm --workspaces` ("No workspaces found") and root npm ci skips workspace deps.
for dir in \
  packages/shared \
  packages/validation \
  packages/financial-engine \
  packages/authz \
  packages/identity \
  packages/database \
  packages/services \
  apps/api \
  apps/web; do
  echo "[apphosting-build] npm install in ${dir}"
  npm install --prefix "${dir}" --no-fund --no-audit
done

echo "[apphosting-build] building packages/shared"
npm --prefix packages/shared run build

echo "[apphosting-build] building packages/validation"
npm --prefix packages/validation run build

echo "[apphosting-build] building packages/financial-engine"
npm --prefix packages/financial-engine run build

echo "[apphosting-build] building packages/authz"
npm --prefix packages/authz run build

echo "[apphosting-build] building packages/identity"
npm --prefix packages/identity run build

echo "[apphosting-build] building packages/database"
npm --prefix packages/database run build

echo "[apphosting-build] building packages/services"
npm --prefix packages/services run build

echo "[apphosting-build] building apps/api"
npm --prefix apps/api run build

echo "[apphosting-build] building apps/web"
npm --prefix apps/web run build

echo "[apphosting-build] done"
