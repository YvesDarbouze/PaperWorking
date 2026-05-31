# Copy Audit: Live Site (paperworking.co) Copy Crimes & Fixes

**Author**: Upstream Copy Strategist
**Date**: 2026-05-31
**Status**: Approved (Pending Implementation)

This document contains a comprehensive copy audit of the current live site (`paperworking.co`). It highlights narrative discrepancies, false credibility claims, illegal marketing terminology, and capability errors, providing immediate, actionable corrections.

---

## 1. False Credibility Claims & Over-Hyped Metrics

### Crime: Fabricated Scaling Numbers
- **The Text**: *"Over $2.4B in capital tracked. 12,000+ active deals. Trusted by institutional syndicators nationwide."*
- **The Issue**: These numbers are fabricated and not backed by actual platform transaction history. This erodes trust on first impression with professional real estate investors (REIs) who can easily smell fake numbers.
- **The Fix**: Remove all unverified numerical claims. Shift validation to founder experience, concrete features, and honest stage-readiness claims:
  - *New Hero Sub-headline*: "The deal management operating system built by active operators, for active operators. Manage every document, dollar, and deadline in one dashboard."
  - *New Progress Metrics*: Focus on concrete platform capabilities (e.g., "4 Phases of REIL v2 tracking", "CPA-Ready CSV exports", "5-Role access control").

### Crime: Unverified Testimonials
- **The Text**: Testimonials attributed to *Marcus T. (Dallas, TX)* and *Samantha Cho (Seattle, WA)* quoting specific, mathematically perfect returns: *"Nashville duplex — $142k exit, 37.4% ROC. 28% materials variance managed in-platform."*
- **The Issue**: These testimonials have no verifiable provenance and read like they were written by an LLM.
- **The Fix**: Remove the fake names and specific false statistics. Replace them with designated *Illustrative Case Studies* based on realistic operator profiles (e.g., "The Nashville Duplex Rehab Scenario"), or utilize authentic quotes from early test operators labeled as such without fabricated names/numbers.

---

## 2. Positioning Negations: Fluff vs. Specificity

Real estate operators are inherently skeptical of tech-bro language. They respond to direct, practitioner-level specificity.

| Live Site Fluff (Banned) | The Copy Crime | Practitioner Replacement (Required) | Rationale |
|---|---|---|---|
| *"Streamline your workflow"* | Vague, generic SaaS jargon. | *"Stop chasing contractors for draw receipts."* | Concretely states the real-world friction. |
| *"Robust financial reporting"* | Overused; doesn't mean anything. | *"CPA-Ready spreadsheet exports."* | Defines the specific end-result. |
| *"Holistic deal lifecycle management"* | Abstract, academic, and soft. | *"Track every dollar from initial offer to final sale."* | Plain-spoken description of the system's scope. |
| *"Empower your team to seamlessly navigate"* | Low-converting filler text. | *"Give your CPA, contractor, and partners their own read/write logins."* | Explicitly describes the role-based access rules. |
| *"Cutting-edge AI valuation"* | False capability. | *"Log manual valuation updates as local market comps shift."* | True to the current product capabilities. |

---

## 3. Capability Errors: False Capabilities vs. Codebase Truth

We must never market features that do not exist or are not supported by the core backend engine.

- **False Claim**: *"Predict exit profits using our automated machine learning engine."*
  - **Codebase Truth**: The profit calculation is derived from standard financial formulas (IRR, Cap Rate, cash-on-cash return, ROI) based on manual operator inputs. There is no predictive ML engine.
  - **Correction**: *"Instantly calculate your projected IRR, cash-on-cash return, and exit profits using manual or automated deal inputs."*
- **False Claim**: *"Pay contractors instantly with next-day direct deposit via the platform."*
  - **Codebase Truth**: The platform logs contractor milestones and approves draws, but does not support integrated bank-to-bank payments or ACH routing directly.
  - **Correction**: *"Approve milestones, log payment history, and generate draw requests to pay contractors on your schedule."*
- **False Claim**: *"Automatic real-time property tax sync."*
  - **Codebase Truth**: Property taxes and expenses are entered manually in the Hold Cost periods or financials object.
  - **Correction**: *"Keep your carrying costs accurate with per-period property tax, insurance, and utility logs."*

---

## 4. Phase Nomenclature & Color Mismatches

The live site references outdated phase names and fails to match the color tokens defined in the Next.js layouts.

- **Mismatch**: The landing page lists "Find & Fund" (Phase 1) and "Purchase" (Phase 2).
  - **Correction**: Shift nomenclature to **REIL v2 Standard**:
    1. **Acquisition** (Amber/Gold `#F59E0B`)
    2. **Transaction** (Blue `#3B82F6`)
    3. **Rehab** (Orange `#F97316`)
    4. **Hold/Exit** (Green `#10B981`)
- **Color Inconsistencies**: Ensure color codes align with [DesignSystem.md](file:///Users/yvesdarbouze/Documents/PaperWorking/DesignSystem.md) across all documentation and page assemblies.

---

## 5. Compliance Check: The 7-Second Comprehension Test

If a visitor cannot tell what the platform does, who it is for, and how to start within 7 seconds of landing, the copy has failed.

1. **What is it?**: A deal management operating system for active real estate operators.
2. **Who is it for?**: Fix-and-flippers, small REI partnerships, and syndication leads.
3. **What is the first step?**: Start a 14-day free trial (no credit card required).
