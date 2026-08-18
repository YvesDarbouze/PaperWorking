# IRS Publication 946 MACRS Depreciation Rules

**Date**: August 18, 2026  
**Author**: AGENT P-5 (Legal & Financial Accuracy Audit)  
**Target Platform**: PaperWorking Real Estate Platform  

---

## Executive Overview

Depreciation is the single largest tax deduction for real estate investors. PaperWorking implements MACRS (Modified Accelerated Cost Recovery System) depreciation rules in strict accordance with **IRS Publication 946**.

---

## 1. Asset Classes & Recovery Periods

| Property Type | Recovery Period | Convention | Method |
| :--- | :--- | :--- | :--- |
| **Residential Rental Property** | **27.5 Years** | Mid-Month | Straight-Line (SL) |
| **Nonresidential Commercial** | **39.0 Years** | Mid-Month | Straight-Line (SL) |
| **Land** | **N/A (Indefinite)** | N/A | Non-Depreciable |
| **Land Improvements** | **15.0 Years** | Half-Year / Mid-Qtr | 150% Declining Balance / SL |
| **Apportioned Personal Property** | **5.0 Years** | Half-Year / Mid-Qtr | 200% Declining Balance |

---

## 2. Land Separation Rule

- **Non-Depreciable Land**: Land value MUST be subtracted from total property acquisition price prior to computing depreciation.
- **Default Allocation**: When county tax assessment breakdown is unavailable, default fallback allocation is **80% Building / 20% Land**.
- **Formula**:
  $$\text{Depreciable Basis} = \text{Purchase Price} + \text{Closing Costs} - \text{Land Value}$$

---

## 3. Mid-Month Convention & First-Year Depreciation

- Under the **Mid-Month Convention**, property placed in service during any month is treated as placed in service in the middle of that month.
- **First-Year Formula**:
  $$\text{First Year Depreciation} = \text{Annual Depreciation} \times \left(\frac{12.5 - \text{Month Placed in Service}}{12}\right)$$

---

## 4. De Minimis Safe Harbor ($2,500 Rule)

- Under **Treas. Reg. § 1.263(a)-1(f)**, taxpayers without an Applicable Financial Statement (AFS) may expense tangible property acquisitions up to **$2,500 per invoice or item**.
- Items <= $2,500 are expensed in the current tax year on Schedule E Line 15 (Repairs) or Line 16 (Supplies) rather than capitalized.
