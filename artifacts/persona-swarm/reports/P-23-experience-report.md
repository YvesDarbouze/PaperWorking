# Persona Experience Report — Grace Adeyemi (P-23)

## 1. Agent Overview
- **Persona ID:** P-23
- **Full Name:** Grace Adeyemi
- **Email:** agent23.grace.adeyemi@paperworking-test.dev
- **Entity / LLC:** Adeyemi Holdings LLC
- **Category:** residential_landlord
- **Primary Market:** Dallas, TX
- **Investor Archetype:** Multifamily Plaid Power User
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** Active
- **Temperament Score:** 6/10 (Cautious & Risk-Averse)

## 2. Bio & Investment Criteria
- **Bio:** Dallas 12-unit small multifamily landlord. Integrates Plaid banking for automated revenue/expense ledger and monthly P&L benchmarking.
- **Target Return:** 10.8% Net Cap Rate
- **Strategy:** Small Multifamily Plaid Integration
- **Check Size Range:** $150,000 – $900,000
- **Asset Focus:** Small Multifamily

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (0 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Grace Adeyemi, operating Adeyemi Holdings LLC out of Dallas, TX, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Small Multifamily Plaid Integration with a target check size of $150,000 to $900,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to Dallas, TX on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **IRR (18-22%), Equity Multiple (1.95x), CoC Return (11.4%)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 0 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Small Multifamily assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*