# Copy Audit Inventory — Diagnosed Copy Crimes

**Author**: Upstream Copy Auditor
**Date**: 2026-05-31
**Status**: Completed (Diagnoses Locked)

This inventory lists every copy problem on the live site (`paperworking.co`) and public pre-login screens. These issues are graded by severity and mapped to recommended actions.

---

## 1. False Statistics & Unverifiable Claims

### Issue #1
- **Location**: Live Landing Page Hero (removed in latest codebase layout update but still live on production web server)
- **Current copy**: `"Over $2.4B in capital tracked. 12,000+ active deals. Trusted by institutional syndicators nationwide."`
- **Test failed**: Truth / Evidence
- **Severity**: P0 (legal/reputational risk)
- **Why this matters**: Unverifiable numeric claims expose a FinTech/B2B real estate startup to regulatory scrutiny and destroy credibility with professional investors.
- **Recommended action**: Remove immediately and replace with operator-experience-focused messaging.

### Issue #2
- **Location**: `src/app/page.tsx:171` (Bento Hero Pipeline Panel)
- **Current copy**: `"Visualizing $42M in aggregate deal flow."`
- **Test failed**: Truth / Evidence
- **Severity**: P0 (legal/reputational risk)
- **Why this matters**: Implies active transactional history on the system that is currently mock data.
- **Recommended action**: Replace with milestone-based description: `"Track deal milestones from offer to exit."`

### Issue #3
- **Location**: `src/app/about/page.tsx:127` (CTA Subtext)
- **Current copy**: `"Join thousands of investors who track every dollar..."`
- **Test failed**: Truth / Evidence
- **Severity**: P0 (legal/reputational risk)
- **Why this matters**: Unverified platform traction metrics trigger immediate operator skepticism.
- **Recommended action**: Rewrite to: `"Join real estate operators tracking deals from acquisition to exit."`

---

## 2. Jargon & Comprehension Failures

### Issue #4
- **Location**: `src/components/landing/HowItWorks.tsx:205` / `src/components/landing/PricingSection.tsx:652`
- **Current copy**: `"Stop bleeding margins to disorganized deals."`
- **Test failed**: Comprehension
- **Severity**: P1 (active conversion damage)
- **Why this matters**: Focuses on a user complaint rather than stating a clear product value proposition.
- **Recommended action**: Rewrite to focus on the operating system concept: `"Stop running six-figure flips out of five-column spreadsheets."`

### Issue #5
- **Location**: `src/components/landing/HowItWorks.tsx:23-48` (Phases Subtitles)
- **Current copy**: `"The Capital Gateway" (Phase 1), "The Compliance Vault" (Phase 2), "Margin Protection" (Phase 3), "Financial Reconciliation" (Phase 4)`
- **Test failed**: Comprehension
- **Severity**: P1 (active conversion damage)
- **Why this matters**: Creates unnecessary conceptual friction by wrapping basic stages in heavy marketing jargon.
- **Recommended action**: Replace with direct, action-oriented titles: `"Know the real numbers before you sign," "Never blow a contingency deadline," "Manage contractor draws by milestone," "CPA-Ready tax exports on closing."`

---

## 3. Phase Model Mismatches & Inconsistencies

### Issue #6
- **Location**: `src/components/landing/HowItWorks.tsx:29,45` and `src/app/page.tsx:188,203`
- **Current copy**: Phase 2 titled `"Purchase"` and Phase 4 titled `"Exit"`.
- **Test failed**: Consistency
- **Severity**: P1 (active conversion damage)
- **Why this matters**: Out of alignment with the REIL v2 phases (**Acquisition, Transaction, Rehab, Hold/Exit**) being built in the core metrics engine.
- **Recommended action**: Update titles to `"Transaction"` (Phase 2) and `"Hold/Exit"` (Phase 4) across all public marketing and authenticated surfaces.

---

## 4. Unverified Social Proof

### Issue #7
- **Location**: `src/components/landing/PricingSection.tsx:156-181` and `src/components/landing/TestimonialSlider.tsx:13-44`
- **Current copy**: Testimonials attributed to `"Marcus T."`, `"Samantha Cho"`, and `"David R."` citing specific project outcomes.
- **Test failed**: Evidence
- **Severity**: P0 (legal/reputational risk)
- **Why this matters**: Fabricated testimonials with fake names and numbers pose legal compliance issues.
- **Recommended action**: Replace all fictional quotes with explicit **Operator Case Studies** describing representative user scenarios.

---

## 5. CTA & Conversion Friction

### Issue #8
- **Location**: `src/components/landing/PricingSection.tsx:722`, `src/components/landing/HowItWorks.tsx:220` (CTA Footers)
- **Current copy**: `"14-day trial • Credit card required • No charge until day 15"`
- **Test failed**: CTA
- **Severity**: P1 (active conversion damage)
- **Why this matters**: Double friction statement (forcing credit card input at the start of a trial) deters signup.
- **Recommended action**: Replace with low-friction trial copy: `"Free for 14 days • No credit card required • Instant setup"` (and ensure checkout is deferred to in-app settings rather than auth block).

---

## 6. Dead Links & Navigation Path Failures

### Issue #9
- **Location**: Landing page headers, about page footers, and how-it-works page CTAs.
- **Current copy**: `href="/#pricing"` or `href="/#how-it-works"`
- **Test failed**: Dead Link
- **Severity**: P1 (active conversion damage)
- **Why this matters**: Users clicking on core marketing actions get dropped on broken anchors, ending their session.
- **Recommended action**: Reroute all header CTAs to `/register` and page links to their correct standalone routes (`/pricing`, `/how-it-works`).
