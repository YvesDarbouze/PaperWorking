#!/usr/bin/env bash
# Pre-cutover verification gate — run from monorepo root before any prod deploy.
# Exit code 0 = all automated checks passed. Manual checklist still required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> PaperWorking Migration — Pre-Cutover Checklist"
echo "    Root: $ROOT"
echo ""

FAIL=0

run_step() {
  local label="$1"
  shift
  echo "── $label"
  if "$@"; then
    echo "   OK"
  else
    echo "   FAILED"
    FAIL=1
  fi
  echo ""
}

run_step "npm run verify" npm run verify

run_step "Integration tests" npm run verify:integration

run_step "Production mock-auth guard" bash -c '
  ! rg -q "ENABLE_""MOCK_AUTH" apps/web/ apps/api/ 2>/dev/null
'

run_step "Production launch checklist exists" test -f docs/PRODUCTION_LAUNCH_CHECKLIST.md

run_step "API inventory exists" test -f docs/list_APIs_.md

run_step "Dockerfile exists" test -f infrastructure/Dockerfile

if [[ "$FAIL" -ne 0 ]]; then
  echo "Pre-cutover checks FAILED. Do not deploy to production."
  exit 1
fi

echo "Automated pre-cutover checks passed."
echo ""
echo "Manual steps still required (see docs/PRODUCTION_LAUNCH_CHECKLIST.md):"
echo "  - Founder approval for cutover strategy and maintenance window"
echo "  - Preview URL deploy + Phase 6 manual checklist"
echo "  - Stripe/SendGrid webhook verification on preview"
echo "  - Rollback drill on preview channel"
