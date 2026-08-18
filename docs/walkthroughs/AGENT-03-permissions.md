# Walkthrough: Agent 3 — Team, Vendor & Permission Matrix

## Summary of Accomplishments

Agent 3 built the complete security, collaboration, and permission matrix system for PaperWorking, covering all 4 account tiers (`Standard`, `Team`, `Vendor`, `Investor`), server-side API & route gating, task assignment flows with standard tier upgrade prompts, role-based onboarding invite APIs, and professional profile role selection.

---

## 1. Permission Matrix & Rule Engine (`/src/lib/permissions.ts` & `/src/hooks/usePermission.ts`)

- **4 Account Tiers**: `Standard`, `Team`, `Vendor`, `Investor`.
- **10 Core Actions Evaluated**:
  1. `create_project`: Standard ✓, Team ✓, Vendor ✗, Investor ✗
  2. `delete_project`: Standard ✓ (only own projects), Team ✓, Vendor ✗, Investor ✗
  3. `assign_tasks`: Standard ✗ (upgrade required), Team ✓, Vendor ✗, Investor ✗
  4. `receive_tasks`: Standard ✓, Team ✓, Vendor ✓, Investor ✗
  5. `answer_vendor_requests`: Standard ✓, Team ✓, Vendor ✓, Investor ✓
  6. `respond_investment_opportunities`: Standard ✓, Team ✓, Vendor ✗, Investor ✓
  7. `access_vendor_marketplace`: Standard ✓, Team ✓, Vendor ✓, Investor ✗
  8. `list_services`: Standard ✓, Team ✓, Vendor ✓, Investor ✗
  9. `view_portfolio`: Standard ✓, Team ✓, Vendor ✗, Investor ✓ (only projects invested in)
  10. `generate_tax_reports`: Standard ✓, Team ✓, Vendor ✗, Investor ✗

- **Client Hook (`usePermission.ts`)**:
  - Exposes `can(action, context)`, `accountType`, `getRequiredTier(action)`, `isStandard`, `isTeam`, `isVendor`, `isInvestor`.

---

## 2. Task Assignment Flow (`/src/components/task-assignment/TaskAssignmentModal.tsx`)

- **Standard Account Tier Upgrade Prompt**:
  - Displays prompt: `"Get this done faster. Invite [name] to join PaperWorking and collaborate on [Project Name]."`
  - Explains tier requirement: `"To assign tasks, upgrade to Team or invite the person to create their own Standard/Vendor account."`
- **Team Account Assignment**:
  - Dropdown of team members + search for Vendor Marketplace.
  - Sends email invite via `/api/invites` if assignee is new, setting status to `"Pending Acceptance"`.
- **Vendor Account Support**:
  - Vendors see ONLY tasks assigned to them with simplified dashboard views.

---

## 3. Invite System API (`/src/app/api/invites/route.ts`)

- `POST /api/invites`:
  - Validates invite payload and creates document in Firestore `invites` collection with 14-day expiration.
  - Roles supported: `team_member`, `vendor`, `investor`.
  - Sends notification email and updates project team associations.
- `GET /api/invites`:
  - Fetches pending invites for the active organization.

---

## 4. Profile & Role System (`/src/lib/profile.ts`)

- **Standard User Badge**: `"Person"` badge + username.
- **Team User Badges**: `"Company"` or `"Person"` badge + selectable professional role:
  - `CEO/President`
  - `Real Estate Attorney`
  - `Loan Processor`
  - `General Contractor`
  - `Property Manager`
  - `Accountant/CPA`
  - `Other`
- Professional roles populate in Vendor Marketplace search filters.

---

## Deliverables & Files Created

| File Path | Purpose |
|---|---|
| [`src/lib/permissions.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/permissions.ts) | Core Permission Matrix definition and evaluation logic across 4 account types and 10 actions |
| [`src/hooks/usePermission.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/hooks/usePermission.ts) | React hook for client-side action gating and tier requirement checks |
| [`src/components/task-assignment/TaskAssignmentModal.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/task-assignment/TaskAssignmentModal.tsx) | Task assignment modal with Standard tier upgrade prompt and Team member assignment flow |
| [`src/app/api/invites/route.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/invites/route.ts) | API route POST/GET for invites supporting team_member, vendor, and investor onboarding |
| [`src/lib/profile.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/profile.ts) | Profile badge resolvers and professional role catalog for Team and Vendor profiles |
| [`src/lib/__tests__/permissions.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/__tests__/permissions.test.ts) | Jest unit test suite covering matrix enforcement for all 4 account types and 10 actions |
| [`e2e/team-assignment.spec.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/e2e/team-assignment.spec.ts) | Playwright E2E test verifying task assignment, tier upgrade prompt, and collaborator invitations |
| [`docs/walkthroughs/AGENT-03-permissions.md`](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/walkthroughs/AGENT-03-permissions.md) | Agent 3 walkthrough evidence document |

---

## Verification Evidence

```bash
# 1. TypeScript Type Check
$ npx tsc --noEmit --skipLibCheck
Exit Code: 0 (Clean)

# 2. Jest Unit Tests
$ npx jest src/lib/__tests__/permissions.test.ts
PASS src/lib/__tests__/permissions.test.ts
  Agent 3: Permission Matrix Enforcement Unit Tests
    create_project action
      ✓ allows Standard and Team accounts, blocks Vendor and Investor accounts (2 ms)
    delete_project action
      ✓ allows Standard ONLY for own projects, Team for all projects, blocks Vendor and Investor
    assign_tasks action
      ✓ allows Team tier ONLY, blocks Standard (requires upgrade prompt), Vendor, and Investor
    receive_tasks action
      ✓ allows Standard, Team, and Vendor accounts, blocks pure Investor accounts
    answer_vendor_requests action
      ✓ allows all 4 account tiers (Standard, Team, Vendor, Investor)
    respond_investment_opportunities action
      ✓ allows Standard, Team, and Investor accounts, blocks Vendor
    access_vendor_marketplace action
      ✓ allows Standard, Team, and Vendor, blocks Investor
    list_services action
      ✓ allows Standard, Team, and Vendor, blocks Investor
    view_portfolio action
      ✓ allows Standard and Team, allows Investor ONLY if invested, blocks Vendor
    generate_tax_reports action
      ✓ allows Standard and Team, blocks Vendor and Investor
    getRequiredTierForAction helper
      ✓ returns correct tier label for upgrades (1 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total

# 3. Playwright E2E Test Suite
$ npx playwright test e2e/team-assignment.spec.ts
Running 1 test using 1 worker
  ✓  1 [chromium] › e2e/team-assignment.spec.ts:65:7 › Agent 3: Team, Vendor & Permission Matrix E2E › Standard user triggers upgrade prompt on task assignment, Team user invites collaborator (3.3s)
1 passed (4.3s)
```
