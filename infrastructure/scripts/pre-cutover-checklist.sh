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
  if rg -q "ENABLE_MOCK_AUTH.*true" infrastructure/apphosting.migration.yaml.template 2>/dev/null; then
    if rg -q "value: \"false\"" infrastructure/apphosting.migration.yaml.template; then
      exit 0
    fi
    exit 1
  fi
  exit 0
'

run_step "Cutover plan document exists" test -f docs/PHASE_7_CUTOVER_PLAN.md

run_step "API inventory exists" test -f docs/list_APIs_.md

run_step "Dockerfile exists" test -f infrastructure/Dockerfile

if [[ "$FAIL" -ne 0 ]]; then
  echo "Pre-cutover checks FAILED. Do not deploy to production."
  exit 1
fi

echo "Automated pre-cutover checks passed."
echo ""
echo "Manual steps still required (see docs/PHASE_7_CUTOVER_PLAN.md):"
echo "  - Founder approval for cutover strategy and maintenance window"
echo "  - Preview URL deploy + Phase 6 manual checklist"
echo "  - Stripe/SendGrid webhook verification on preview"
echo "  - Rollback drill on preview channel"
