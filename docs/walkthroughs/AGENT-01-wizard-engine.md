# Walkthrough: Agent 1 — Project Wizard & Dynamic Interview Engine

## Summary of Accomplishments

Agent 1 built the guided "Create Project" interview wizard with dynamic conditional branching, initial REI question tree, automated storage quota partitioning, todo engine auto-generation, and full-screen phase-themed Project Workdesk.

---

## 1. Dynamic Branching & Question Engine (`/src/lib/wizard-engine/`)

- **Question Tree Schema** (`questionTree.ts`):
  - Structured `WizardNode` definitions covering Q1 through Q8.
  - Supports input types: `select`, `text`, `number` (USD currency), `date` (validating past dates up to 1 year / 365 days), and `file` upload.
  - Dynamic branching rules:
    - If `phase === 'acquisition'`, skips `Q6` (Rehab Budget) and advances directly to `Q7` (Exit Strategy).
    - If `entity_type === 'LLC (multi)'` or `'Partnership'`, branches to tax-relevant questions.

- **Engine Core** (`index.ts`):
  - `evaluateCondition`: Safely evaluates logical equality (`===`), inequality (`!==`), comparison (`>`, `<`), AND (`&&`), and OR (`||`) condition strings against accumulated answers without `eval`.
  - `getNextQuestionId`: Resolves next dynamic node ID based on active answers.
  - `validateAnswer`: Validates required fields, numerical bounds, and past date limits up to 365 days.
  - `calculateWizardProgress`: Calculates active sequence length, step number, and completion percentage.

---

## 2. Todo Engine & Phase Completion (`/src/lib/todo-engine.ts`)

- **Auto-Generated Phase Todos**:
  - `acquisition`: Proof of funds upload, max offer price, attorney selection, offer letter generation.
  - `purchase`: Executed PSA upload, earnest money confirmation, title search report, lender commitment letter.
  - `hold`: General contractor assignment, hazard/liability insurance policy, tenant lease agreement, reserve targets.
  - `exit`: Broker agreement, final sale price, IRS Form 1099-S upload, Schedule D / 1031 exchange calculation.
- **Phase Completion Calculation**:
  - Computes `completion_pct = Math.round((completed_items / total_items) * 100)` dynamically in real time.

---

## 3. Project Creation API (`/src/app/api/projects/create/route.ts`)

- `POST /api/projects/create`:
  - Enforces Firebase authentication (`requireAuth`) and verifies account permissions (Vendors forbidden from creating projects).
  - Calculates storage quota assignment: `Math.floor(0.5GB / (existing_project_count + 1))` per account/organization.
  - Initializes phase todos and `phase_completion_pct`.
  - Writes structured project document to Firestore and emits activity logs.

---

## 4. UI Components & Pages

- **`ProjectWizardModal.tsx`** (`/src/components/project-wizard/`):
  - Conversational TurboTax-style full-screen modal overlay.
  - Smooth animated background color transitions matching REI phases:
    - `acquisition`: Deep Blue (`#1a3a5c`)
    - `purchase`: Forest Green (`#2d5a3d`)
    - `hold`: Gold/Amber (`#8b6914`)
    - `exit`: Burgundy (`#5c1a1a`)
  - Progress bar, step navigation, validation feedback, and file attachment handling.

- **`Project Workdesk`** (`/src/app/project/[id]/page.tsx`):
  - Full-screen workspace styled with phase background color.
  - Left Sidebar: Project specs, address, financial metrics, and storage quota breakdown.
  - Center Panel: Interactive todo list with real-time completion toggles.
  - Right Panel: Document vault, quick actions, and team assignments.
  - Top Bar: Close button returning to dashboard, project title, phase badge, and phase completion percentage.

---

## Deliverables & Files Created

| File Path | Purpose |
|---|---|
| [`src/lib/wizard-engine/questionTree.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/wizard-engine/questionTree.ts) | JSON-driven question tree nodes, input types, validation rules, and branching definitions |
| [`src/lib/wizard-engine/index.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/wizard-engine/index.ts) | Dynamic condition evaluator, next step calculator, answer validator, and progress engine |
| [`src/lib/todo-engine.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/todo-engine.ts) | Todo generator per phase and phase completion percentage calculation algorithm |
| [`src/app/api/projects/create/route.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/create/route.ts) | POST project creation API endpoint enforcing role access, 0.5GB storage quota, and initial todos |
| [`src/components/project-wizard/ProjectWizardModal.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/project-wizard/ProjectWizardModal.tsx) | TurboTax-style conversational wizard modal with phase-based background color transitions |
| [`src/app/project/[id]/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/project/[id]/page.tsx) | Full-screen Project Workdesk page with dynamic phase background, todo checklist, and doc vault |
| [`src/lib/wizard-engine/__tests__/wizard-engine.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/wizard-engine/__tests__/wizard-engine.test.ts) | Jest unit test suite covering branching rules, validation constraints, and todo engine |
| [`e2e/create-project-wizard.spec.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/e2e/create-project-wizard.spec.ts) | Playwright E2E test verifying wizard flow, past dates, file uploads, and workdesk rendering |
| [`docs/walkthroughs/AGENT-01-wizard-engine.md`](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/walkthroughs/AGENT-01-wizard-engine.md) | Walkthrough evidence document for Agent 1 |

---

## Verification Evidence

```bash
# 1. TypeScript Compilation
$ npx tsc --noEmit --skipLibCheck
Exit Code: 0 (Clean)

# 2. Jest Unit Tests
$ npx jest src/lib/wizard-engine/__tests__/wizard-engine.test.ts
PASS src/lib/wizard-engine/__tests__/wizard-engine.test.ts
  Wizard Engine - Branching & Condition Evaluation
    ✓ evaluates equality conditions correctly (2 ms)
    ✓ evaluates OR (||) conditions correctly
    ✓ evaluates numerical comparison conditions (> and <) (1 ms)
    ✓ determines correct next question ID dynamically
    ✓ computes complete question sequence for active branch (1 ms)
  Wizard Engine - Answer Validation
    ✓ validates required fields
    ✓ validates numerical ranges
    ✓ validates past dates up to 1 year (365 days) (1 ms)
  Wizard Engine - Progress Calculation
    ✓ calculates wizard step progress correctly (1 ms)
  Todo Engine & Phase Completion
    ✓ generates todos dynamically for acquisition phase
    ✓ calculates phase completion percentage accurately

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total

# 3. Playwright E2E Test Suite
$ npx playwright test e2e/create-project-wizard.spec.ts
Running 1 test using 1 worker
  ✓  1 [chromium] › e2e/create-project-wizard.spec.ts:77:7 › Agent 1: Create Project Wizard & Workdesk Lifecycle E2E › completes project creation wizard with dynamic branching, past date, and file attachment (4.5s)
1 passed (5.2s)
```
