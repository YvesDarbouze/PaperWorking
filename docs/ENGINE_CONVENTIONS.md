# PaperWorking Financial Engine Conventions & Invariant Reference

**Document Version:** 1.1.0  
**Engine Active Version:** `4` (`ENGINE_VERSION = 4`)  
**Engine Prepared Version:** `5` (`NEXT_ENGINE_VERSION = 5`)  
**Status:** Canonical Single Source of Truth  

---

## 1. Executive Summary & Golden Reference Invariants

This document establishes the single authoritative truth for all mathematical conventions across `@paperworking/financial-engine`, `@paperworking/database`, `@paperworking/api`, and `@paperworking/web`. All calculations, database assertions, and client-facing displays conform strictly to the specifications detailed herein.

### Canonical Demo Deal Single Truth
Input Specifications:
* **Purchase Price:** $520,000.00
* **Down Payment:** 25.0% ($130,000.00)
* **Loan Amount:** $390,000.00
* **Interest Rate:** 6.50% annual (nominal)
* **Amortization:** 30 years (360 months), standard amortizing
* **Gross Monthly Rent:** $4,800.00 ($57,600.00 base, $62,400.00 with RUBS/fees)
* **Gross Operating Income (GOI):** $59,280.00 (at 5.0% vacancy)
* **Operating Expenses:** $21,142.00 (Annual)
* **Net Operating Income (NOI):** $38,138.00 ($59,280.00 - $21,142.00)
* **Hold Period:** 5 years (60 months)
* **Terminal Value Method:** `appreciation_pct` (3.0%/year, price base)
* **Selling Costs:** 6.0%
* **Buyer Closing Costs:** $10,400.00 (2.0%)
* **Total Cash Invested ($t_0$ Outlay):** $205,400.00 ($130,000 down + $10,400 closing + $65,000 reserves/rehab)

### Engine-Emitted Golden Vector & Metrics (Run Once Verbatim)
```typescript
irrCashFlowVector: [-205400, 8557, 8557, 8557, 8557, 210128]
projectedIrrPct: 3.8
irrStatus: 'converged'
irrRoots: [{ ratePct: 3.8206055011968028, npvResidual: 0 }]
monthlyDebtService: 2465.07 (display: $2,465)
annualDebtService: 29581
annualCashFlow: 8557
estimatedExitValue: 602823
sellingCostsAmount: 36169
month60AmortizedBalance: 365083 (exact: 365082.52)
netSaleProceeds: 201571
terminalValueLabel: 'Exit @ 3.0%/yr on $520,000 purchase price'
appreciationBase: 'purchase_price'
capRateOnCost: 6.4 (exact: 6.405%)
cashOnCashReturnPct: 4.2 (exact: 4.166%)
dscr: 1.29 (exact: 1.2892)
ltvPct: 75.0
```

---

## 2. Monthly Payment & Debt Service Conventions

### 2.1 Monthly Payment Formula (Standard Amortization)
Monthly debt payment ($M$) is calculated using the standard institutional fixed-rate annuity amortization formula:
$$M = P \cdot \frac{r(1 + r)^n}{(1 + r)^n - 1}$$
Where:
* $P$ = Loan Principal Balance ($390,000.00)
* $r$ = Monthly interest rate = $\frac{\text{Annual Nominal Rate}}{12} = \frac{0.065}{12} = 0.005416666...$
* $n$ = Total amortization months = $30 \times 12 = 360$

Calculation:
$$(1 + r)^{360} = (1.005416666...)^{360} \approx 6.99179835$$
$$\frac{r(1 + r)^{360}}{(1 + r)^{360} - 1} = \frac{0.005416666... \times 6.99179835}{5.99179835} \approx 0.0063206802$$
$$M = 390,000 \times 0.0063206802 = 2465.06529... \approx \mathbf{\$2,465.0653}$$

### 2.2 Monthly Cent-Rounding Specification
* Institutional accounting rounds monthly payment to the nearest integer cent:
  $$\text{Monthly Payment} = \text{round}_2(M) = \mathbf{\$2,465.07}$$
* Display presentation rounds to whole dollars for visual clarity:
  $$\text{Display Payment} = \text{round}_0(M) = \mathbf{\$2,465}$$

### 2.3 Annual Debt Service Derivation
* Annual Debt Service is derived from the actual 12-month amortizing cash schedule rather than 12 times a whole-dollar display rounded figure:
  $$\text{Annual Debt Service} = \text{round}_0(2465.0653 \times 12) = \text{round}_0(29580.78) = \mathbf{\$29,581}$$
* **Reconciliation Note:** The legacy approximation $\$2,465 \times 12 = \$29,580$ is deprecated and superseded. The single truth is **$29,581**.

### 2.4 Annual Net Operating Cash Flow
$$\text{Annual Cash Flow} = \text{NOI} - \text{Annual Debt Service} = \$38,138 - \$29,581 = \mathbf{\$8,557}$$
* **Reconciliation Note:** The legacy reference $\$8,558$ derived from $\$29,580$ debt service is superseded. The single truth is **$8,557**.

---

## 3. Month-by-Month Balance Recursion

Loan balance recursion is tracked on an exact monthly ledger:
$$I_m = \text{round}_2(B_{m-1} \times r)$$
$$P_m = \text{round}_2(M - I_m)$$
$$B_m = B_{m-1} - P_m$$

### Schedule Milestones (Canonical Deal: $P = \$390,000$, Rate = 6.5%, Term = 360)
* **Month 1:** Interest = $2,112.50, Principal = $352.57, Balance = $389,647.43
* **Month 12 (End of Year 1):** Loan Balance = **$385,640.82**
* **Month 24 (End of Year 2):** Loan Balance = **$380,989.70**
* **Month 36 (End of Year 3):** Loan Balance = **$376,027.09**
* **Month 48 (End of Year 4):** Loan Balance = **$370,732.11**
* **Month 60 (End of Year 5 / Exit):** Loan Balance = **$365,082.48** (pure recursion) / **$365,082.52** (schedule engine) $\rightarrow$ Integer Round: **$365,083**

---

## 4. Terminal Valuation, Selling Costs & Net Exit Proceeds

### 4.1 Appreciation Base (Finding 2 Resolution — User-Selectable)
Per founder underwriting governance, terminal value computed via appreciation is user-selectable between **Purchase Price Base** (`appreciation_base: 'purchase_price'`, default with `source: "default"`) and **ARV Base** (`appreciation_base: 'arv'`). The conservative default prevents unearned leverage compounding on post-acquisition rehab capital. The terminal value label always explicitly qualifies the base:
* When `purchase_price`: `Exit @ 3.0%/yr on $520,000 purchase price`
  $$\text{Exit Value} = \text{round}_0(\text{Purchase Price} \times (1 + g)^h) = \text{round}_0(\$520,000 \times 1.03^5) = \mathbf{\$602,823}$$
* When `arv`: `Exit @ 3.0%/yr on $680,000 ARV`
  $$\text{Exit Value} = \text{round}_0(\text{ARV} \times (1 + g)^h) = \text{round}_0(\$680,000 \times 1.03^5) = \mathbf{\$788,306}$$

### 4.2 Selling Costs Rounding
$$\text{Selling Costs} = \text{round}_0(\text{Exit Value} \times \text{Selling Costs Pct})$$
$$\text{Selling Costs} = \text{round}_0(\$602,823 \times 0.06) = \text{round}_0(\$36,169.38) = \mathbf{\$36,169}$$

### 4.3 Net Sale Proceeds
$$\text{Net Sale Proceeds} = \text{Exit Value} - \text{Selling Costs} - \text{Month-60 Balance}$$
$$\text{Net Sale Proceeds} = \$602,823 - \$36,169 - \$365,083 = \mathbf{\$201,571}$$
* **Year 5 Total Equity Cash Flow:**
  $$\text{Year 5 Total} = \text{Operating Cash Flow} (\$8,557) + \text{Net Proceeds} (\$201,571) = \mathbf{\$210,128}$$

---

## 5. IRR Solver Specifications & Tolerance

### 5.1 Formulation
Equity Internal Rate of Return ($r$) satisfies the Net Present Value equation:
$$\text{NPV}(r) = \sum_{t=0}^N \frac{C_t}{(1 + r)^t} = 0$$
Where $C_0 = -\$205,400$, $C_1 = \$8,557$, $C_2 = \$8,557$, $C_3 = \$8,557$, $C_4 = \$8,557$, $C_5 = \$210,128$.

### 5.2 Two-Phase Hardened Solver
1. **Phase 1 (Interval Scanning):** 200-point uniform grid scan across $[-0.99, +10.0]$ with step size $0.05495$. All sign-change brackets $[r_a, r_b]$ where $\text{sgn}(\text{NPV}(r_a)) \neq \text{sgn}(\text{NPV}(r_b))$ are isolated.
2. **Phase 2 (Hybrid Newton-Bisection):**
   * Maximum iterations per bracket: 100
   * Step safeguard: If Newton step falls outside $[r_{\text{low}}, r_{\text{high}}]$, fallback to pure bisection.
   * Step convergence: $|r_{k+1} - r_k| < 1\text{e-}10$
   * Residual convergence tolerance: $|\text{NPV}(r)| < 1\text{e-}7$
   * Multi-root classification: If multiple roots found, emit `irrStatus: 'multiple_roots'` and `projectedIrrPct: null`.
   * No sign-change classification: Emit `irrStatus: 'no_sign_change'` and `projectedIrrPct: null`.

### 5.3 Canonical Solution Verbatim
* Exact Root: $r = 0.038206055011968028$ ($3.8206055\%$)
* Emitted Projected IRR: **3.8%**
* Emitted Status: `converged`
* Emitted Residual: $0.0$ ($< 1\text{e-}15$)

---

## 6. Display Rounding Matrix Per Metric

| Metric Key | Metric Name | Internal Precision | Display Precision | Unit / Suffix |
| :--- | :--- | :--- | :--- | :--- |
| `projectedIrrPct` | Projected Equity IRR | Double precision float | 1 decimal place (`3.8%`) | `%` |
| `capRateOnCost` | Cap Rate on Cost | Double precision float | 1 decimal place (`6.4%`) | `%` |
| `cashOnCashReturnPct` | Cash on Cash Return | Double precision float | 1 decimal place (`4.2%`) | `%` |
| `dscr` | Debt Service Coverage | Double precision float | 2 decimal places (`1.29×`) | `×` |
| `ltvPct` | Loan to Value | Double precision float | 1 decimal place (`75.0%`) | `%` |
| `grossRentMultiplier` | Gross Rent Multiplier | Double precision float | 1 decimal place (`8.3×`) | `×` |
| `maximumAllowableOffer`| MAO (70% Rule) | Exact integer | Currency whole dollar (`$383,300`) | `$` |
| `loanConstantPct` | Annual Loan Constant | Double precision float | 3 decimal places (`7.585%`) | `%` |
| `netOperatingIncome` | Net Operating Income | Exact integer | Currency whole dollar (`$38,138`) | `$` |
| `annualDebtService` | Annual Debt Service | Exact integer | Currency whole dollar (`$29,581`) | `$` |
| `estimatedExitValue` | Estimated Exit Value | Exact integer | Currency whole dollar (`$602,823`) | `$` |
| `netSaleProceeds` | Net Exit Proceeds | Exact integer | Currency whole dollar (`$201,571`) | `$` |
