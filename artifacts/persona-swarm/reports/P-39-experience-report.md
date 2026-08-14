# Persona Experience Report — Nathaniel Cross (P-39)

## 1. Agent Overview
- **Persona ID:** P-39
- **Full Name:** Nathaniel Cross
- **Email:** agent39.nathaniel.cross@paperworking-test.dev
- **Entity / LLC:** Crossbeam Real Estate Partners LLC
- **Category:** pe_fund
- **Primary Market:** New York, NY
- **Investor Archetype:** Institutional PE Fund Manager
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 4/10 (Highly Analytical & Detail-Oriented)

## 2. Bio & Investment Criteria
- **Bio:** NYC PE real estate fund manager ($150M AUM). Requires portfolio-wide debt service tracking, GP co-investment side letters, and institutional capital call management.
- **Target Return:** 20% Net IRR / 2.2x EM
- **Strategy:** Institutional PE Real Estate Fund
- **Check Size Range:** $1,000,000 – $15,000,000
- **Asset Focus:** Institutional PE Fund

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (1 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Nathaniel Cross, operating Crossbeam Real Estate Partners LLC out of New York, NY, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Institutional PE Real Estate Fund with a target check size of $1,000,000 to $15,000,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to New York, NY on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **NOI Growth (+14%), Cap Rate (6.2%), Debt Service Coverage Ratio (1.42x)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 1 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Institutional PE Fund assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*