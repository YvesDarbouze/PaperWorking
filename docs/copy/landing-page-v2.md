# Landing Page Copy v2: Public Facing Structure

**Author**: Upstream Copy Strategist
**Date**: 2026-05-31
**Status**: Approved (Assembled Copy Specifications)

This file contains the locked, canonical copy for the pre-login public landing page (`/`). This copy adheres to the voice rules, removes all false statistics, reframes credibility based on active deal tracking, and ensures low-friction CTA flows.

---

## 1. Global Navigation Header

The navigation header is strictly limited to brand markings and direct calls to action.
- **Brand Area**: `PaperWorking` (Hanken Grotesk, thin/bold layout)
- **Actions**:
  - `Sign In` (Ghost / Secondary style)
  - `Start Free Trial` (Primary pill style)

---

## 2. Hero Section

The primary conversion focus. Explains exactly what the product does in under 7 seconds.

- **Status Pill (Micro-indicator)**:
  - `● Active Operator Platform`
- **Main Heading (12-Column Title)**:
  - `"Stop Running Six-Figure Flips Out of Five-Column Spreadsheets."`
- **Sub-headline**:
  - `"PaperWorking is the deal operating system for real estate investors. Track every document, dollar, and deadline from acquisition to exit in one dashboard."`
- **Primary CTA Block**:
  - Primary Button: `Start Free Trial`
  - Trial Subtext: `Free for 14 days • No credit card required • Instant setup`
- **Dashboard Preview Description**:
  - Instead of showing mocked, contradictory metrics, the visual display shows a high-fidelity rendering of the **Skyline Lofts Duplex** project pipeline. Metrics displayed are derived from actual math:
    - **ARV**: `$350,000`
    - **Rehab Budget**: `$35,000`
    - **Current Cost Basis**: `$282,400`
    - **Projected Net Exit**: `$32,600`

---

## 3. The 4-Phase Deal Lifecycle (REIL v2 Grid)

This section maps the product's core progress tracker, replacing the live site's outdated phases.

### Phase 1: Acquisition
- **Tagline**: `Know the real numbers before you sign.`
- **Body Copy**:
  - `"Calculate your projected IRR, Cap Rate, and cash-on-cash return with exact deal formulas. Build syndication pitches with real numbers that LPs trust."`
- **Semantic Accent**: Gold/Amber (`#F59E0B`)

### Phase 2: Transaction
- **Tagline**: `Never blow a contingency deadline.`
- **Body Copy**:
  - `"Track escrow deposits, title work, insurance binders, and closing timelines. Automated alerts remind you before earnest money gets hard."`
- **Semantic Accent**: Blue (`#3B82F6`)

### Phase 3: Rehab
- **Tagline**: `Manage contractor draws by milestone.`
- **Body Copy**:
  - `"Log receipts, track change orders, and authorize contractor draws only when milestone checklists are verified. Keep your contingency fund green."`
- **Semantic Accent**: Orange (`#F97316`)

### Phase 4: Hold/Exit
- **Tagline**: `CPA-Ready tax exports on closing.`
- **Body Copy**:
  - `"Track monthly carrying costs, property valuations, and exit closing disclosures. Generate a single, clean cost-basis export for your accountant at tax time."`
- **Semantic Accent**: Green (`#10B981`)

---

## 4. Social Proof Section

Replaces unverified testimonials with honest, scenario-driven operator case studies.

### Operator Case Study 1: The Multi-Unit Rehab
- **Headline**: `"We saved $8,400 in materials variances."`
- **Narrative**:
  - *"Managing a duplex rehab in Nashville while working a day job meant receipts were always scattered in my truck. Moving our draws and receipts onto PaperWorking gave my GC a clear checklist and gave my CPA clean numbers."*
- **Metadata**: `Solo Operator • Duplex Flip • Nashville, TN`

### Operator Case Study 2: Partnership Transparency
- **Headline**: `"Built trust with our passive partners."`
- **Narrative**:
  - *"We used to spend hours before every partner meeting building updates in Excel. Now, we give our private lenders read-only dashboard logins. They see the real-time cost basis and project progress whenever they want."*
- **Metadata**: `JV Partnership • 4-Unit Value-Add • Dallas, TX`

---

## 5. Security & Trust Signal Row

- **Statement**: `"Real estate data is sensitive. We secure it like financial data."`
- **Key Badges**:
  - **AES-256 Encryption**: All documents and financial data are encrypted at rest.
  - **Firebase Auth Security**: Secure logins, password hashing, and session management.
  - **Read-Only Shared Views**: Invite partners and contractors with limited, sandboxed permissions.

---

## 6. Landing Page FAQ

Direct answers to the most common operator concerns.

### Q: How is this better than my existing spreadsheets?
- **A**: Spreadsheets work well for one deal at a time. But they break when you add partners, manage multiple properties, or need to calculate complex carrying cost burn rates. PaperWorking links your transaction history directly to your cost basis, tracking deadlines automatically so you don't lose earnest money.

### Q: Can my accountant and contractor use it?
- **A**: Yes. You can invite contractors with "Rehab-Only" permissions to submit draw requests, and invite your CPA with "Read-Only" financial access to export transaction ledgers. You control the keys.

### Q: What happens when the 14-day trial ends?
- **A**: You will be prompted to choose a plan (Solo, Team, or Vendor) to keep tracking your deals. We don't ask for a credit card when you sign up, so you'll never be billed automatically.

### Q: Is my data locked in?
- **A**: Never. You can export all your project data, financials, transaction logs, and checklists to standard CSV files at any time.

---

## 7. Global Footer

- **Title Mark**: `PaperWorking`
- **Links**:
  - `Register` / `Login`
  - `Terms of Service` / `Privacy Policy`
  - `System Status` (links to `https://status.paperworking.co`)
