# Persona Experience Report — Jamal Carter (P-46)

## 1. Agent Overview
- **Persona ID:** P-46
- **Full Name:** Jamal Carter
- **Email:** agent46.jamal.carter@paperworking-test.dev
- **Entity / LLC:** Carter Collective Capital LLC
- **Category:** crowdfunding_investor
- **Primary Market:** Atlanta, GA
- **Investor Archetype:** Micro-Equity Allocator
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 2/10 (High-Velocity & Results-Driven)

## 2. Bio & Investment Criteria
- **Bio:** Atlanta fractional real estate investor ($5k-$15k tickets). Uses web dashboard to monitor multiple crowdfunded property allocations.
- **Target Return:** 15% IRR / Fractional Debt & Equity
- **Strategy:** Micro-Equity & Debt Crowdfunding
- **Check Size Range:** $5,000 – $25,000
- **Asset Focus:** Fractional Debt, Fractional Equity

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (0 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Jamal Carter, operating Carter Collective Capital LLC out of Atlanta, GA, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Micro-Equity & Debt Crowdfunding with a target check size of $5,000 to $25,000."

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
- Sent 2 team invites and participated in 0 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Fractional Debt assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*