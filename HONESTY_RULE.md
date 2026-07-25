# The Honesty Rule

## Principle
PaperWorking never fabricates data. Every number displayed to a user is either:
1. Explicitly entered by the user
2. Imported from a verified connected service (Plaid, DocuSign, RentCast)
3. Calculated from real inputs using documented formulas
4. Clearly marked as an estimate with a yellow badge

## Prohibited
- Hardcoded fallback values (e.g., $12,486 as default NOI)
- Silent mock data presented as live
- Fake ratings or review counts
- Fabricated file sizes or metadata
- Auto-populated "estimated" figures written as paid: true
- Single-point AVMs without confidence ranges

## Required
- Empty portfolios show honest empty states with CTAs
- Estimates are explicitly flagged (estimated: true, paid: false)
- Mock data shows visible "Demo" banners in development
- All integrations fail loudly in production when misconfigured
- AVM ranges show low/high bounds, not single points
- Vendor ratings show "No reviews yet" for unrated vendors
