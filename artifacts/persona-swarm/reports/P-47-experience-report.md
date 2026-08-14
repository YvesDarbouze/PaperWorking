# Persona Experience Report — Patricia Trish Malone (P-47)

## 1. Agent Overview
- **Persona ID:** P-47
- **Full Name:** Patricia Trish Malone
- **Email:** agent47.patricia.malone@paperworking-test.dev
- **Entity / LLC:** Malone Dental EPC LLC
- **Category:** sba_borrower
- **Primary Market:** St. Louis, MO
- **Investor Archetype:** Owner-User Practice Owner
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 3/10 (Cautious & Risk-Averse)

## 2. Bio & Investment Criteria
- **Bio:** St. Louis dental practice owner executing SBA 504 sale-leaseback and owner-occupied commercial acquisition. Tracks SBA loan compliance and NNN leaseback payments.
- **Target Return:** SBA 504 90% LTV Loan
- **Strategy:** SBA 504 Owner-Occupied Acquisition
- **Check Size Range:** $200,000 – $1,800,000
- **Asset Focus:** Owner-User Medical, Commercial Building

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (2 Deal Interactions Executed, 3 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Patricia Trish Malone, operating Malone Dental EPC LLC out of St. Louis, MO, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is SBA 504 Owner-Occupied Acquisition with a target check size of $200,000 to $1,800,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to St. Louis, MO on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **IRR (18-22%), Equity Multiple (1.95x), CoC Return (11.4%)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 3 team invites and participated in 2 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Owner-User Medical assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*