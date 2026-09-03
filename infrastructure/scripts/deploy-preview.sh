#!/usr/bin/env bash
# Build migration Docker image locally (preview deploy prep).
# Production Firebase deploy checklist — see docs/PRODUCTION_LAUNCH_CHECKLIST.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

IMAGE="${1:-paperworking-migrate:local}"

echo "==> Pre-cutover automated checks"
bash infrastructure/scripts/pre-cutover-checklist.sh

echo "==> Docker build: $IMAGE"
docker build -f infrastructure/Dockerfile -t "$IMAGE" .

echo ""
echo "Smoke run:"
echo "  docker run -p 8080:8080 -e PORT=8080 $IMAGE"
echo "  open http://localhost:8080"
echo ""
echo "Firebase App Hosting: copy infrastructure/apphosting.migration.yaml.template"
echo "Deploy to PREVIEW channel only until FOUNDER_APPROVAL.md is signed."
