# Walkthrough: Agent 7 — Storage, Files & Receipt Management

## Summary of Accomplishments

Agent 7 constructed the storage quota management engine (0.5 GB account default evenly partitioned across active projects), multipart file upload API with extension validation, 6-category document taxonomy, Document Vault UI, receipt-to-expense linking workflow, and 3-year IRS tax document deletion protection lock.

---

## 1. Storage Quota System (`/src/lib/storage/quota.ts`)

- **0.5 GB Account Default (536,870,912 bytes)**:
  - Divided evenly: `quota_per_project = total_account_quota / active_project_count`.
  - Recalculated on project creation and deletion.
- **Upload Quota Enforcement (`validateUploadQuota`)**:
  - Rejects uploads if `file_size > remaining_project_quota`.
- **Usage Statistics (`getStorageUsageStats`)**:
  - Returns `usedBytes`, `totalQuotaBytes`, `percentageUsed`, and `quotaPerProjectBytes` for UI display.

---

## 2. File Upload API (`/src/app/api/upload/route.ts`)

- `POST /api/upload`: Handles multipart/form-data.
- **Extension & MIME Validation**: Permits `.pdf`, `.jpg`, `.jpeg`, `.png`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`.
- **Path Storage Taxonomy**: Maps files to `/{user_id}/{project_id}/{category}/{filename}`.
- Returns `{ success: true, file_id, url, storagePath, size, category, uploaded_at }`.

---

## 3. Document Taxonomy (`/src/lib/storage/categories.ts`)

- **6 Categories**:
  1. `acquisition`: `proof_of_funds`, `offer_letters`, `contracts`.
  2. `purchase`: `loan_docs`, `title_docs`, `inspection_reports`, `closing_disclosure`.
  3. `hold`: `rehab_receipts`, `rental_lease`, `insurance_docs`, `utility_bills`.
  4. `exit`: `marketing_receipts`, `sale_contract`, `closing_docs`.
  5. `tax`: `generated_forms`, `receipts`, `1099s_received`.
  6. `general`: `other`.

---

## 4. Document Vault UI (`/src/components/storage/DocumentVault.tsx` & `/src/app/project/[id]/documents/page.tsx`)

- Category tabs filter files.
- File table displays file name, category, size in MB, receipt link status badge, and action buttons (download, delete/archive).
- Real-time quota usage status bar.

---

## 5. Receipt-to-Expense Linking (`/src/lib/storage/receipts.ts`)

- Detects receipts uploaded in `hold` or `tax` categories.
- Surfaces prompt to link receipt to an unlinked project expense.
- **Badge Indicators**:
  - Linked: `"✓ Linked to [Expense Description] ($[Amount])"`.
  - Unlinked: `"⚠ Unlinked — link to expense for tax compliance"`.

---

## 6. IRS Tax Document Deletion Lock (`validateTaxDocumentDeletion`)

- Tax-generated documents (Form 1040-ES, Schedule E, Form 4562, 1099s) are LOCKED for 3 years (`3 * 365 * 24 * 60 * 60 * 1000` ms).
- Deletion attempts block action with compliance lock alert: `"IRS compliance lock: Tax document cannot be deleted for 3 years. [X] days remaining in retention window."`

---

## Deliverables & Files Created

| File Path | Purpose |
|---|---|
| [`src/lib/storage/quota.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/storage/quota.ts) | Storage quota allocation engine, upload size validator, usage stats calculator, and 3-year tax deletion protection |
| [`src/lib/storage/categories.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/storage/categories.ts) | 6-category document taxonomy definitions and auto-tagging resolvers |
| [`src/lib/storage/receipts.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/storage/receipts.ts) | Receipt-to-expense linking engine and compliance badge resolvers |
| [`src/app/api/upload/route.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/upload/route.ts) | File upload API route supporting multipart/form-data, extension checks, quota validation, and path mapping |
| [`src/components/storage/DocumentVault.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/storage/DocumentVault.tsx) | Document Vault component with folder view, quota status bar, 3-year deletion lock, and receipt linking modal |
| [`src/app/project/[id]/documents/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/project/[id]/documents/page.tsx) | Project Documents page hosting DocumentVault component |
| [`src/lib/storage/__tests__/quota.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/storage/__tests__/quota.test.ts) | Jest unit test suite covering quota division, upload size limits, usage stats, and 3-year tax retention lock |
| [`e2e/file-upload.spec.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/e2e/file-upload.spec.ts) | Playwright E2E test verifying file upload API, Document Vault, receipt linking, and 3-year tax retention lock |
| [`docs/walkthroughs/AGENT-07-storage.md`](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/walkthroughs/AGENT-07-storage.md) | Agent 7 walkthrough evidence document |

---

## Verification Evidence

```bash
# 1. TypeScript Type Check
$ npx tsc --noEmit --skipLibCheck
Exit Code: 0 (Clean)

# 2. Jest Unit Tests
$ npx jest src/lib/storage/__tests__/quota.test.ts
PASS src/lib/storage/__tests__/quota.test.ts
  Agent 7: Storage Quota & Retention System Unit Tests
    ✓ 1. calculateProjectQuota divides 0.5 GB total account quota evenly across active projects (2 ms)
    ✓ 2. validateUploadQuota permits upload when file size is within remaining quota (1 ms)
    ✓ 3. validateUploadQuota rejects upload when file size exceeds remaining project quota
    ✓ 4. getStorageUsageStats computes percentage used and usage metrics accurately
    ✓ 5. validateTaxDocumentDeletion blocks deletion of tax documents under 3 years old (2 ms)
    ✓ 6. validateTaxDocumentDeletion allows deletion of non-tax documents or tax documents >= 3 years old

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Time:        0.285 s

# 3. Playwright E2E Test Suite
$ npx playwright test e2e/file-upload.spec.ts
Running 1 test using 1 worker
  ✓  1 [chromium] › e2e/file-upload.spec.ts:38:7 › Agent 7: Storage, Files & Receipt Management E2E › Renders Document Vault, links receipt to expense, and enforces tax document retention lock (3.2s)
1 passed (3.9s)
```
