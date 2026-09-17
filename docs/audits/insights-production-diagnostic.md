# Insights Page Production Diagnostic (Read-Only Audit)

**Date:** September 4, 2026  
**Target:** Production environment at `https://paperworking.co/dashboard/insights`  
**Audit Scope:** Read-only forensic analysis of production deployment provenance, data pipeline execution, component compilation, and design-system button constitution.

---

## 1. Deployment Provenance

| Metric / Field | Deployed Production (`paperworking.co`) | Local Monorepo (`PaperWorking_v1`) |
| :--- | :--- | :--- |
| **Repository** | `https://github.com/YvesDarbouze/PaperWorking.git` | `https://github.com/YvesDarbouze/PaperWorking_v1.git` |
| **Active Branch** | `main` | `Yves-update-UI-dashboard` |
| **Commit SHA** | `9c9efe98b476b460a6acd0a97525a6c0f2dac644` | `57afaaab0494187e0205ec0003cfa38dd13b5f6b` (+ uncommitted K1–K6.5/M1–M2.1 working tree) |
| **Build ID / Image** | `us-east4-docker.pkg.dev/paperworking-97055/firebaseapphosting-images/paperworker:build-2026-09-02-001` | Local development / Jest / Playwright test harness |
| **Cloud Build Job** | `76a77abe-24a1-4615-96f0-d122ebd59240` (Cloud Build `us-east4`) | N/A (Local workspace) |
| **Hosting Platform** | Google Cloud Run via **Firebase App Hosting** (`paperworker`, region `us-east4`) | Local Node runtime |
| **Deploy Timestamp** | `2026-09-02T23:07:08.806047Z` (Wednesday Sep 2, 2026 ~19:07 EDT) | Working tree modified live |
| **Build SHA Endpoint** | Missing (`/api/health` returns status without commit SHA) | Missing |

### Does production contain the K2–K6.5 code?
> **NO.**  
> Production is completely detached from the K-track. It is running an entirely different GitHub repository (`YvesDarbouze/PaperWorking`) deployed from commit `9c9efe98` on Sep 2, 2026. Furthermore, inside `PaperWorking_v1`, the K1–K6.5 financial engine and modal enhancements exist only in the local uncommitted working tree and have never been committed to git or deployed to Firebase App Hosting.

---

## 2. Root-Cause Statement: Why "No KPI data yet."?

The empty production page is caused by a combination of **Deployment Drift (running legacy code)** and **Deliberate Data-Absence-by-Design in non-mock mode**.

### Forensic Code Evidence

In the deployed bundle (`static/chunks/app/(dashboard)/dashboard/insights/page-bda0ba22f84a8ec5.js`), the compiled component originates from [`origin/main:apps/web/components/insights/PortfolioInsightsPanel.tsx#L95-L125`](file:///Users/yvesdarbouze/Documents/PaperWorking/apps/web/components/insights/PortfolioInsightsPanel.tsx#L95-L125):

```typescript
// origin/main:apps/web/components/insights/PortfolioInsightsPanel.tsx
useEffect(() => {
  let cancelled = false;
  async function load() {
    try {
      if (mockMode) {
        const dash = loadInsightsDashboardMockOnly();
        // Sets sample projects, kpiSections, trendSeries, comparisonSeed...
      } else {
        // PRODUCTION PATH (mockMode is false):
        const list = await loadProjects();
        const mapped = (Array.isArray(list) ? list : []).map(...);
        setProjects(mapped);
        setSelectedProjectId(mapped[0]?.id ?? '');
        
        // 🚨 HARDCODED ERASURE OF ALL METRICS DATA:
        setKpiSections([]);
        setTrendSeries({});
        setComparisonSeed([]);
      }

      const data = await getPortfolioInsightsFromBff();
      if (!cancelled && data.categories) setCategories(data.categories);
    } catch {
      if (!cancelled && !mockMode) {
        setKpiSections([]);
        setTrendSeries({});
        setComparisonSeed([]);
      }
    } finally {
      if (!cancelled) setLoadingCats(false);
    }
  }
  void load();
}, [mockMode]);
```

### Why the Page Renders Empty:
1. **Empty KPI Cards**: On line 390 of the deployed `PortfolioInsightsPanel.tsx`:
   ```tsx
   <div className="space-y-8" data-testid="kpi-sections">
     {kpiSections.length === 0 ? (
       <p className="py-8 text-center text-sm text-white/45">
         {loadingCats ? 'Loading KPIs…' : 'No KPI data yet.'}
       </p>
     ) : (
       kpiSections.map((section) => ...)
     )}
   </div>
   ```
   Because `setKpiSections([])` is explicitly called when `mockMode` is false, `kpiSections.length` is guaranteed to be `0`. Once `loadingCats` becomes false, it unconditionally displays:
   **`"No KPI data yet."`**
2. **Empty Trends Charts**: `setTrendSeries({})` clears the dictionary. In the Trends cards, `trendSeries[opt.id] ?? []` resolves to `[]`, leaving the bar chart container with 0 bars.
3. **Empty Project Comparison**: `setComparisonSeed([])` clears comparison data, resulting in 0 data points in `ProjectComparisonChart`.
4. **Absence of K-Track Components**:
   - Analysis of the production bundle confirms:
     - `KpiDetailModal`: **ABSENT** (`false` in bundle; legacy `kpi-drawer` aside dialog is present instead).
     - Phase-based KPI accordion (`INVESTOR_KPI_SECTIONS`): **ABSENT** from live rendering.
     - `kpi-csv.ts` / in-modal export: **ABSENT** from production bundle.

### Portfolio Aggregate Behavior vs. Spec

| Scenario | Deployed Production Behavior | Intended K-Track Specification |
| :--- | :--- | :--- |
| **(a) Zero Projects** | Shows header with "Export to CSV", "Playbook", empty KPI section ("No KPI data yet."), empty Trends cards, empty Comparison card. | Full-screen designed empty state (`min-h-[70vh]`) with analytical icon, headline `"No KPI data yet."`, body explaining underwriting requirement, and `+ New Project` primary CTA. |
| **(b) One Project (Complete Inputs)** | Shows `"Viewing insights for: Portfolio Aggregate"`, but KPI cards remain `"No KPI data yet."` because `kpiSections` was erased to `[]`. | Mathematical rollup across all 33 KPIs (Phase 1 Intake 8, Phase 2 Underwriting 10, Phase 3 Debt 8, Phase 4 Exit 7) computed live by `financial-engine` (`derivePortfolioMetrics`). |
| **(c) One Project (Incomplete Inputs)** | Same as above — completely unrendered. | Cards render with `INSUFFICIENT_INPUTS` / warning badges; clicking any card opens `KpiDetailModal` identifying exactly which inputs are missing. |

---

## 3. Button & Control Audit of Live Production

Every control on `https://paperworking.co/dashboard/insights` was audited against the PaperWorking Button Constitution:

| Control Element | Live Production Implementation | Button Constitution Violation | Status / Action Needed |
| :--- | :--- | :--- | :--- |
| **Header "Export to CSV"** | `<button type="button" className="... bg-slate-800 hover:bg-slate-700 ...">` | **Dead Control / Off-Token**. Uses dark slate background classes instead of `--bg-surface` / `--border-subtle`. Crucially, **has NO `onClick` handler**; clicking does nothing. | Spec requires `<Button variant="secondary" size="md">` triggering `handleBulkExportCsv`. |
| **Header "Playbook"** | `<a href="/support/metrics" className="rounded-xl border border-white/10 px-4 py-2 ...">` | **Raw Ghost Link**. Unstyled `<a>` tag mimicking a button without standard padding, focus-ring, or token styling. | Spec requires `<Button href="/support/metrics" variant="secondary" size="sm">`. |
| **"Compare" Label** | `<span className="text-xs text-white/45">Compare</span>` | **Phantom Static Label**. Displays as non-interactive text next to the period toggle; does not toggle anything. | Remove or convert to interactive mode if intended. |
| **Month / Quarter / Year** | `<button type="button" aria-pressed={trendPeriod === tp}>` | **Hidden-Effect Segmented Toggle**. Functional in React state, but only mutates `TREND_PERIOD_LABELS[trendPeriod]` in section headers that are hidden because `kpiSections` is empty. | Needs connection to live time-series engine. |
| **Trends Dropdowns** (NOI, Cash Flow, Occupancy) | `<select className="... bg-white/5 ...">` | **Dead Interaction**. Dropdowns change state, but series is hardcoded to `{}` so no visual charts update. | Needs live 24-month historical projection data. |
| **Sort: Default Button** | `<button type="button">Sort: {sortOrder}</button>` | **Dead Interaction**. Toggles sort order state on `comparisonSeed`, but `comparisonSeed` is empty `[]`. | Needs real multi-project comparison points. |
| **Single-Primary Rule** | Entire page contains 0 primary buttons. | **Zero-Primary Violation**. The Button Constitution mandates exactly one prominent primary CTA (`variant="primary"` with `--accent: #00DD94`) per view. | Empty state must feature primary `+ New Project`; populated state must maintain hierarchy. |

---

## 4. Findings List

### [CRITICAL] F-I1: Production Deployment Drift (Wrong Repository & Architecture)
- **Description**: `https://paperworking.co` is deployed by Firebase App Hosting from the legacy `YvesDarbouze/PaperWorking` repository (`main@9c9efe98`), completely bypassing `PaperWorking_v1`.
- **Impact**: All work delivered across K1–K6.5 and M1–M2.1 is absent from production.
- **Remediation**: Phase 7 Cutover execution (switch Firebase App Hosting backend root or GitHub connection to `PaperWorking_v1`).

### [CRITICAL] F-I2: Deliberate Non-Mock Data Erasure in Deployed Code
- **Description**: The deployed `PortfolioInsightsPanel.tsx` explicitly calls `setKpiSections([])`, `setTrendSeries({})`, and `setComparisonSeed([])` when `mockMode` is false.
- **File & Line**: `origin/main:apps/web/components/insights/PortfolioInsightsPanel.tsx#L121-L124`
- **Impact**: Even if the backend has live projects and underwriting data, the client-side code forces the UI into an empty state ("No KPI data yet.").

### [HIGH] F-I3: Button Constitution Violations & Dead Header Actions
- **Description**: The deployed header "Export to CSV" is an off-token (`bg-slate-800`) `<button>` with no attached `onClick` handler. "Playbook" is an unstyled `<Link>` ghost element. The page has 0 primary buttons.
- **Impact**: User sees prominent controls that do nothing when clicked.

### [HIGH] F-I4: Uncommitted Monorepo Development State
- **Description**: In the local `PaperWorking_v1` monorepo, K1 through K6.5 and M1 through M2.1 modifications reside solely in the working directory as modified and untracked files on branch `Yves-update-UI-dashboard`. They have never been committed to git or pushed to `origin`.
- **Impact**: Risk of accidental work loss or divergence if not committed and tracked.

### [MEDIUM] F-I5: Missing Build & Deploy Observability Endpoint
- **Description**: Production `/api/health` returns database and external service pings, but lacks `buildSha`, `commitTimestamp`, or git branch metadata.
- **Impact**: Verifying whether a build is live currently requires inspecting minified JavaScript chunk strings.

### [LOW] F-I6: Non-Functional Secondary Controls (Trends & Comparison)
- **Description**: Period toggles, Trends metric pickers, and comparison sort buttons manipulate local state but have no rendered target data in non-mock mode.

---

## 5. Recommended Fix Sequence

### Track A: Human / Founder Deploy & Repository Actions
1. **Commit Local Working Tree**:
   - Create a clean commit on `PaperWorking_v1` capturing K1–K6.5 (Waterfall engine, 33/33 KPI verification, KpiDetailModal, CSV export) and M1–M2.1 (Google Maps & Places integration, durable geocodeCache).
   - Push branch `Yves-update-UI-dashboard` to `origin/Yves-update-UI-dashboard` on GitHub.
2. **Execute Phase 7 Cutover to Monorepo**:
   - Follow [`docs/PHASE_7_CUTOVER_PLAN.md`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/docs/PHASE_7_CUTOVER_PLAN.md).
   - Update Firebase App Hosting backend `paperworker` settings in Google Cloud Console (`paperworking-97055`) to deploy from repository `YvesDarbouze/PaperWorking_v1` instead of legacy `YvesDarbouze/PaperWorking`.
   - Alternatively, build and deploy the container image using `infrastructure/Dockerfile` to Cloud Run as documented in Phase 7.

### Track B: Code Actions for Prompt I2 (Insights Production Remediation)
1. **Add Build Provenance to `/api/health`**:
   - Bake `NEXT_PUBLIC_BUILD_SHA` and `BUILD_TIME` into `apps/web/app/api/health/route.ts` and `apps/web/next.config.ts`.
2. **Clean Up Insights Header & Button Constitution**:
   - Ensure the single primary rule is strictly observed.
   - Enforce canonical `Button` component usage across all header actions (`variant="secondary"` for bulk CSV export, `variant="secondary"` for Playbook link).
   - Remove or functionalize the phantom "Compare" label.
3. **Verify Empty State vs. Live Data Path**:
   - Ensure `PortfolioInsightsPanel` displays the designed empty state with a single primary `+ New Project` button when 0 projects exist.
   - When projects exist, ensure `live-insights.ts` seamlessly derives the 33 KPIs from `@paperworking/financial-engine` without relying on mock mode flags.
