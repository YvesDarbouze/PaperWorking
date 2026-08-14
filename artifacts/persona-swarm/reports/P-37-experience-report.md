# Persona Experience Report — Ken Tanaka (P-37)

## 1. Agent Overview
- **Persona ID:** P-37
- **Full Name:** Ken Tanaka
- **Email:** agent37.ken.tanaka@paperworking-test.dev
- **Entity / LLC:** Tanaka Growth Holdings LLC
- **Category:** passive_lp
- **Primary Market:** San Francisco, CA
- **Investor Archetype:** Tech Founder LP
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** Active
- **Temperament Score:** 2/10 (High-Velocity & Results-Driven)

## 2. Bio & Investment Criteria
- **Bio:** SF tech founder investing LP capital across 8 deals. Connects Plaid to track distribution direct deposits and real-time portfolio yield.
- **Target Return:** 8.0% Pref Return / 20% IRR
- **Strategy:** Tech-Forward Passive LP Allocation
- **Check Size Range:** $100,000 – $500,000
- **Asset Focus:** Passive LP Allocation

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (2 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Ken Tanaka, operating Tanaka Growth Holdings LLC out of San Francisco, CA, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Tech-Forward Passive LP Allocation with a target check size of $100,000 to $500,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to San Francisco, CA on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **IRR (18-22%), Equity Multiple (1.95x), CoC Return (11.4%)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 2 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Passive LP Allocation assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*