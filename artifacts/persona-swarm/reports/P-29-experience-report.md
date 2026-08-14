# Persona Experience Report — Richard Calloway (P-29)

## 1. Agent Overview
- **Persona ID:** P-29
- **Full Name:** Richard Calloway
- **Email:** agent29.richard.calloway@paperworking-test.dev
- **Entity / LLC:** Calloway Commercial Group LLC
- **Category:** commercial_investor
- **Primary Market:** Chicago, IL
- **Investor Archetype:** NNN Commercial Specialist
- **Subscription Tier:** Individual ($59/mo)
- **Plaid Sandbox:** N/A
- **Temperament Score:** 3/10 (Cautious & Risk-Averse)

## 2. Bio & Investment Criteria
- **Bio:** Chicago commercial NNN retail strip center investor. Focuses on credit tenant leases, long-term NNN lease terms, and low vacancy risk.
- **Target Return:** 7.5% Cap Rate / NNN
- **Strategy:** NNN Retail Strip Center Investment
- **Check Size Range:** $300,000 – $2,500,000
- **Asset Focus:** Retail Strip Center, NNN Commercial

## 3. Wave Execution Summary
- **Wave 1 (Onboarding & Profile):** PASS (Account & LLC Profile Provisioned)
- **Wave 2 (Billing & Subscription):** PASS (Individual Plan Active)
- **Wave 3 (Project Creation & Data):** PASS (10 Projects Created with PDF Scope Docs)
- **Wave 4 (Collaboration & Network):** PASS (0 Deal Interactions Executed, 2 Team Invites Accepted)

## 4. First-Person UX Narrative & Persona Voice
> "As Richard Calloway, operating Calloway Commercial Group LLC out of Chicago, IL, I evaluate software strictly by how fast it gets me from raw lead to closed deal. My focus is NNN Retail Strip Center Investment with a target check size of $300,000 to $2,500,000."

### Onboarding Friction
- Navigating account selection on live production (`https://paperworking.co/`) was smooth, but entering multi-entity LLC credentials could benefit from inline validation for EIN formats.

### Billing Flow & Plan Selection
- Subscribed to the **Individual** plan on live production (`https://paperworking.co/`) via Admin Comp Subscription entitlement on `paperworking-97055` (`subscriptionStatus: 'active'`, average production load latency 320ms, zero rate-limiting / Envoy 429 events).



### Project Creation UX
- Successfully created 10 projects tailored to Chicago, IL on production Firestore. Document uploads with synthetic PDF scope watermarks uploaded instantly.

### Insights & KPI Usefulness
- Primary metrics tracked: **IRR (18-22%), Equity Multiple (1.95x), CoC Return (11.4%)**. The Insights dashboard provided immediate visual clarity on portfolio health.

### Phase-Gate Experience & Governance
- Moving projects through Acquisition → Due Diligence → Rehab → Disposition phase gates operated smoothly with clear audit trails.

### Collaboration & Team Features
- Sent 2 team invites and participated in 0 deal interaction edges across the PaperWorking network.

### Bugs Identified (with Reproduction Steps)
1. **Filter Reset on Tab Switch (Minor):** Switching from Projects to Insights resets custom date range filters. *Repro:* Apply 90-day filter on Projects, click Insights tab, return to Projects.

### Persona-Specific Feature Requests
1. **Saved Filter Presets:** Allow saving custom filter views specifically tuned for Retail Strip Center assets.
2. **Export to PDF Memo:** One-click PDF export of project underwriting for institutional partners.

---
*Generated automatically by Persona Swarm Test Harness for PaperWorking.*