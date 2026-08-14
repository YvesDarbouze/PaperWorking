# Persona Experience Report — Naomi Ishida (P-27)

## 1. Agent Overview
- **Persona ID:** P-27
- **Full Name:** Naomi Ishida
- **Email:** agent27.naomi.ishida@paperworking-test.dev
- **Entity / LLC:** Ishida Luxe Escapes LLC
- **Category:** str_operator
- **Primary Market:** Nashville, TN
- **Investor Archetype:** Urban STR Specialist
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 1/10 (Highly Analytical & Detail-Oriented)

## 2. Bio & Investment Criteria
- **Bio:** Nashville urban STR operator with 5 boutique condos. Requires strict permit compliance tracking, local lodging tax automation, and dynamic price sync.
- **Target Return:** 22% Gross Yield / RevPAR $195
- **Strategy:** Urban Short-Term Hospitality
- **Check Size Range:** $100,000 – $600,000
- **Asset Focus:** Urban Condo, Boutique Apartment

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (1 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Naomi Ishida, operating Ishida Luxe Escapes LLC out of Nashville, TN, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Urban Short-Term Hospitality with a target check size of $100,000 to $600,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to Nashville, TN on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **RevPAR ($185), Occupancy Rate (78%), Average Daily Rate ($237)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 1 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Urban Condo assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*