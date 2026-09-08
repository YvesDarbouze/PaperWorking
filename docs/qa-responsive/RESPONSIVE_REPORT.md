# Responsive audit report

Generated: 2026-09-07 (live browser + automated sweep)  
Base: `http://127.0.0.1:3000`  
Viewports: **Desktop 1440×900** · **Tablet 768×1024** · **Mobile 390×844**

## Summary

| Sweep | Result |
|-------|--------|
| Automated (9 public + 14 app routes × 3 viewports) | **69/69** no hard failures |
| Live loaded content (auth + wait for network idle) | App screens OK; **1 tablet marketing header issue** |

## Screens covered

**Public:** `/`, `/login`, `/signup`, `/forgot-password`, `/pricing`, `/how-it-works`, `/support`, `/privacy`, `/terms`  

**App (mock investor session):** `/dashboard`, `/projects`, `/projects/new`, `/project/:id`, scorecard, insights, `/deals`, deal detail, inbox, marketplace, profile, billing, reports, team

## Findings by viewport

### Desktop (1440)
- Marketing hero + Deal Analyzer OK
- Dashboard / Projects / Scorecard / Deals / Profile: sidebar/layout usable, no horizontal scroll
- Scorecard table readable in 3 columns

### Tablet (768)
- App shell (Portfolio, Projects, Project workspace, Deal, Profile, Wizard): OK, no overflow
- **Fixed — Marketing `/` header:** desktop nav was showing at `md` (768) and crowding “Go to Dashboard” + ACCOUNT (~5px overflow). Desktop chrome now starts at `lg`; tablet uses the hamburger drawer.

### Mobile (390)
- Bottom tab nav present (Portfolio / Marketplace / Projects / Reports)
- Portfolio cards stack full-width; CTAs tappable
- Projects: filters stack; **board columns intentionally scroll horizontally** (kanban) — expected, not a page overflow
- Scorecard: sub-nav wraps to 2 rows; KPI table readable; long project title truncates with ellipsis
- Deal underwrite form: single-column fields OK

## Fix applied
- `MarketingHeader.tsx`: raise inline marketing nav/actions from `md` → `lg`; keep hamburger through tablet.

## Screenshots

Automated: `docs/qa-responsive/{desktop,tablet,mobile}-*.png`  
Live (settled content): `docs/qa-responsive/live-{desktop,tablet,mobile}-*.png`  
Before/after tablet header: `issue-tablet-home.png` → `fixed-tablet-home.png`
