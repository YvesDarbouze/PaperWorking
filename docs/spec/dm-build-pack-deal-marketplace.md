# Deal Marketplace Build Pack (DM-Build-Pack)

**Governing Authorities:** `.agents/skills/paperworking-reil/SKILL.md` · `AGENTS.md` (v5 navigation contract) · `docs/spec/reil-complete-four-phase-questions-tasks.md`

This document outlines the architecture, rules, and integration requirements for the Deal Marketplace.

---

## 1. Primary Marketplace Gating & Security (RM-3)

* **Access Control**: Only verified Lead Investors and Subscribers can view or interact with active marketplace listings.
* **Anonymous Access**: Anonymous visitors are redirected to the pricing page when attempting to access gated marketplace routes.
* **Vendor Restrictions**: Users categorized as Vendors are restricted from accessing deals/listings and will see an "Access Restricted" or 404 page.
* **Secrets Protection**: All Stripe, Firebase Admin, and external provider API keys/secrets must remain strictly server-side and never be included in client bundles.

---

## 2. Provenance, Gating & Evidence (RM-3 / RM-4)

### Control Evidence (D-4 / B-2 / DR-8)
* The contract or deed that moves a Deal past Prospecting is stored as a Project attachment on the **Acquisition phase** (`projectFiles` collection), with the document type set to `purchase_agreement`.
* Gating rules in `gate.ts` enforce that transitioning the project past the prospecting phase requires this attachment to exist.
* The provenance badge citation on the deal card or post links to this attachment's metadata (document type, upload date, filename).

### Metric Drill-Down (C-3)
* Detailed provenance badges on key financial metrics (e.g. `purchase_price`, `rehab_budget`, `loan_amount`) display detailed document citations on click.
* **Document Exposure Rules**: 
  * Members of the project can always open/download the document.
  * Subscribers can only open/download the document if the Lead Investor has explicitly toggled its exposure (saved in the listing's `exposedDocumentIds` list).
  * Unauthorized users see the document as `🔒 Locked by Lead Investor`.

### Business-Card Exchange (G-4)
* When a business card exchange occurs:
  * The invitee's card is saved to the leadInvestor's project's `projectFiles` in the `Equity` folder.
  * If the invitee has an active project matching the deal, the leadInvestor's card is saved to the invitee's project's `projectFiles` in the `Equity` folder.
  * If the invitee has no active project for the deal, the leadInvestor's card is saved to the invitee's account-level contacts (`organizations/[orgId]/contacts` or `users/[uid]/contacts`).
* Exchanged cards are stored securely and follow the same double-opt-in mechanics.
