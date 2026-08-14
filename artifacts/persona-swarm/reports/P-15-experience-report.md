# Persona Experience Report — Jordan Fields (P-15)

## 1. Agent Overview
- **Persona ID:** P-15
- **Full Name:** Jordan Fields
- **Email:** agent15.jordan.fields@paperworking-test.dev
- **Entity / LLC:** Fields Repeat Capital LLC
- **Category:** brrrr_investor
- **Primary Market:** Phoenix, AZ
- **Investor Archetype:** BRRRR Scaling Specialist
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 7/10 (Highly Analytical & Detail-Oriented)

## 2. Bio & Investment Criteria
- **Bio:** Phoenix BRRRR investor scaling from 8 to 25 doors. Obsessed with post-refi equity extraction, cash-on-cash return, and DSCR lender requirements.
- **Target Return:** 16.2% Post-Refi CoC Return
- **Strategy:** BRRRR Cash-Out Refinance
- **Check Size Range:** $40,000 – $250,000
- **Asset Focus:** Single Family, Duplex

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (1 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Jordan Fields, operating Fields Repeat Capital LLC out of Phoenix, AZ, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is BRRRR Cash-Out Refinance with a target check size of $40,000 to $250,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to Phoenix, AZ on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **Cash-on-Cash Return (16.2%), Post-Refi Equity ($65k), Refi LTV (75%)**. The Insights dashboard provided immediate visual clarity on portfolio health.

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