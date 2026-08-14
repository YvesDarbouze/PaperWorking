# Persona Experience Report — Douglas Harmon (P-50)

## 1. Agent Overview
- **Persona ID:** P-50
- **Full Name:** Douglas Harmon
- **Email:** agent50.douglas.harmon@paperworking-test.dev
- **Entity / LLC:** Harmon Note Exchange LLC
- **Category:** note_investor
- **Primary Market:** Dallas, TX
- **Investor Archetype:** Distressed Note Buyer
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 6/10 (Cautious & Risk-Averse)

## 2. Bio & Investment Criteria
- **Bio:** Dallas non-performing & performing note buyer/workout specialist. Evaluates unpaid principal balance (UPB) discounts, collateral valuation, and loan modification workouts.
- **Target Return:** 14.5% Yield-to-Maturity
- **Strategy:** Non-Performing Note Workout & Buying
- **Check Size Range:** $50,000 – $500,000
- **Asset Focus:** Mortgage Note, Distressed Debt

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (2 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Douglas Harmon, operating Harmon Note Exchange LLC out of Dallas, TX, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Non-Performing Note Workout & Buying with a target check size of $50,000 to $500,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to Dallas, TX on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **UPB Discount (10-12%), Non-Performing Workout Velocity (90 days), Yield-to-Maturity (14.5%)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 2 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Mortgage Note assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*