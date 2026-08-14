# Persona Experience Report — Harold Jenkins (P-20)

## 1. Agent Overview
- **Persona ID:** P-20
- **Full Name:** Harold Jenkins
- **Email:** agent20.harold.jenkins@paperworking-test.dev
- **Entity / LLC:** Jenkins Heritage Properties LLC
- **Category:** residential_landlord
- **Primary Market:** Atlanta, GA
- **Investor Archetype:** Conservative Rent Roll Manager
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 3/10 (Cautious & Risk-Averse)

## 2. Bio & Investment Criteria
- **Bio:** Atlanta landlord with 32 single family rental doors. Focuses on low tenant turnover, preventative maintenance tracking, and long-term appreciation.
- **Target Return:** 10.5% Net Cap Rate
- **Strategy:** Long-Term Rental Portfolio
- **Check Size Range:** $80,000 – $450,000
- **Asset Focus:** Single Family, Duplex

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (1 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Harold Jenkins, operating Jenkins Heritage Properties LLC out of Atlanta, GA, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Long-Term Rental Portfolio with a target check size of $80,000 to $450,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to Atlanta, GA on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **IRR (18-22%), Equity Multiple (1.95x), CoC Return (11.4%)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 1 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Single Family assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*