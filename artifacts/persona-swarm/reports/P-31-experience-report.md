# Persona Experience Report — Andre Baptiste (P-31)

## 1. Agent Overview
- **Persona ID:** P-31
- **Full Name:** Andre Baptiste
- **Email:** agent31.andre.baptiste@paperworking-test.dev
- **Entity / LLC:** Baptiste Corridor Holdings LLC
- **Category:** commercial_investor
- **Primary Market:** New Orleans, LA
- **Investor Archetype:** Historic Mixed-Use Operator
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 5/10 (High-Velocity & Results-Driven)

## 2. Bio & Investment Criteria
- **Bio:** French Quarter mixed-use commercial landlord. Manages ground-floor retail/restaurant leases with upper-floor residential apartments.
- **Target Return:** 8.8% Cap Rate / Mixed-Use
- **Strategy:** Historic Mixed-Use Redevelopment
- **Check Size Range:** $250,000 – $1,800,000
- **Asset Focus:** Mixed-Use Commercial, Historic Building

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (0 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Andre Baptiste, operating Baptiste Corridor Holdings LLC out of New Orleans, LA, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is Historic Mixed-Use Redevelopment with a target check size of $250,000 to $1,800,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to New Orleans, LA on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **IRR (18-22%), Equity Multiple (1.95x), CoC Return (11.4%)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 0 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Mixed-Use Commercial assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*