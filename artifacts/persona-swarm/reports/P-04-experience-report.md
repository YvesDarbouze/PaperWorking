# Persona Experience Report — Priya Raman (P-04)

## 1. Agent Overview
- **Persona ID:** P-04
- **Full Name:** Priya Raman
- **Email:** agent04.priya.raman@paperworking-test.dev
- **Entity / LLC:** PRV Off-Market Group LLC
- **Category:** wholesaler
- **Primary Market:** Houston, TX
- **Investor Archetype:** Predictive List Stacker
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 5/10 (High-Velocity & Results-Driven)

## 2. Bio & Investment Criteria
- **Bio:** Tech-savvy virtual wholesaler leveraging predictive list stackers in Harris County. Requires robust data integration and fast lead filtering.
- **Target Return:** 14% post-refi CoC potential
- **Strategy:** Predictive List Stacking
- **Check Size Range:** $8,000 – $35,000
- **Asset Focus:** Single Family, Townhome

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (3 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Priya Raman, operating PRV Off-Market Group LLC out of Houston, TX, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Predictive List Stacking with a target check size of $8,000 to $35,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to Houston, TX on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **Fee Per Deal ($12k avg), Assignment Margin (18%), Deal Turnaround (14 days)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 3 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Single Family assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*