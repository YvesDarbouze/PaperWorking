# Product Launch Decisions

**Date:** 2026-08-28  
**Purpose:** Explicit product/ops answers required before controlled launch.  
**Do not invent answers** — fill Status when decided.

| # | Decision | Owner | Status | Required before launch |
|---|----------|-------|--------|------------------------|
| 1 | Is an **empty Reports ledger** acceptable at launch? | Product | **PENDING** | Yes — if No, Reports must be removed from nav or ledger shipped |
| 2 | Is KPI/Portfolio **Unavailable** acceptable at launch? | Product | **PENDING** | Yes — if No, hide scorecard/portfolio estimate UI or ship formulas |
| 3 | Are **Wave-2 screens excluded** from launch? | Product + Eng | **PENDING** (Eng gate implemented; Product confirm) | Yes — confirm exclusion list in `WAVE2_PRODUCTION_SCOPE.md` |
| 4 | Are **paid Stripe plans enabled** at launch, or **free-tier only**? | Product + Ops | **PENDING** | Yes — if paid, complete `STRIPE_PRODUCTION_CHECKLIST.md` |
| 5 | Which **marketplace data is public**? (listings / deals / investors) | Product | **PENDING** | Yes — aligns privacy + SEO |
| 6 | Should public investors show **names only**, or other public profile fields (bio, company, avatar)? | Product | **PENDING** | Yes — API currently returns id/name/displayName/companyName/avatarUrl/**no email** |

---

## Engineering defaults until Product answers

These are **not** product decisions — temporary safe defaults for a controlled launch:

| Topic | Temporary default |
|-------|-------------------|
| Reports ledger | Ship empty ledger with honest empty UI |
| KPI / portfolio estimates | Ship `Unavailable` / null |
| Wave-2 | Excluded via middleware + nav |
| Paid Stripe | Fail closed until Ops configures; treat as free-tier capable |
| Public investor email | **Never** exposed (fixed) |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product | | | |
| Engineering | | | |
| Ops / Security | | | |
