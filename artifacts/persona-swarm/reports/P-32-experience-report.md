# Persona Experience Report — Evelyn Marsh (P-32)

## 1. Agent Overview
- **Persona ID:** P-32
- **Full Name:** Evelyn Marsh
- **Email:** agent32.evelyn.marsh@paperworking-test.dev
- **Entity / LLC:** Marsh Multifamily Partners LLC
- **Category:** syndicator_gp
- **Primary Market:** Chicago, IL
- **Investor Archetype:** Polished Multifamily Syndicator
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 6/10 (Cautious & Risk-Averse)

## 2. Bio & Investment Criteria
- **Bio:** Chicago 300-unit multifamily deal lead, 12 years in. Polished, process-driven, and investor-relations obsessed. Manages LP deal rooms, subscription agreements, and quarterly investor reporting.
- **Target Return:** 18.5% IRR / 2.0x EM
- **Strategy:** Polished Multifamily Syndication
- **Check Size Range:** $50,000 – $500,000
- **Asset Focus:** Multifamily 50+ Units

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (4 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Evelyn Marsh, operating Marsh Multifamily Partners LLC out of Chicago, IL, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Polished Multifamily Syndication with a target check size of $50,000 to $500,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to Chicago, IL on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **NOI Growth (+14%), Cap Rate (6.2%), Debt Service Coverage Ratio (1.42x)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 4 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Multifamily 50+ Units assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*