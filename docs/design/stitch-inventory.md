# Stitch Screen Catalog Inventory

This document tracks all user interface screens imported from the Stitch design workspace, their target page mappings, and implementation status.

---

## Screen Inventory

### 1. Marketing & Landing Surfaces

| Screen Title | Screen ID | Target Route | Status | Gaps vs. Mockup |
| :--- | :--- | :--- | :--- | :--- |
| PaperWorking Landing Page (Desktop Redesign) | `2eac60a3f2d0426390d1fde07959b493` | `/` | **LIVE** | None. Implemented 12-column Bento hero, stats panel, active pipeline metrics, and OS Performance section. |
| PaperWorking Landing Page (Mobile Redesign) | `dc0c32f2e10445c19a848faa83f091ca` | `/` | **LIVE** | None. Responsively stacks Bento elements on narrow viewports. |
| Marketing Pricing (Desktop Redesign) | `a5acab3f432041f68f89f627ca2f3298` | `/pricing` | **DRAFT** | Need to wire functional monthly/annual billing toggle, raised vendor pricing ranges ($99/$249/$499), and checkbox compare rows. |
| PaperWorking Pricing (Mobile) | `e4943b58ba1c4be1b41b47fc9a0e52bf` | `/pricing` | **DRAFT** | Needs mobile responsive layout styling for the feature comparison table. |
| Marketing: How It Works (Desktop Redesign) | `79d8b7f54fbf43e49dfc19999c510ec0` | `/how-it-works` | **NOT YET IMPLEMENTED** | Route currently redirects. Needs dedicated phase walkthrough page with platform screenshots. |
| Marketing: How It Works (Redesign) (Mobile) | `9288b54e9b7b4c78bdb0ef1af11b467d` | `/how-it-works` | **NOT YET IMPLEMENTED** | Needs mobile responsive walkthrough view. |

---

### 2. Application & Authenticated Surfaces

| Screen Title | Screen ID | Target Route | Status | Gaps vs. Mockup |
| :--- | :--- | :--- | :--- | :--- |
| Projects Grid (Updated Navigation) | `d580c861786344ad8a19ad79f8fced5a` | `/dashboard/projects` | **LIVE** | Verify persistent sidebar navigation contract compliance. |
| Command Center (Updated Navigation) | `ee06d5c1696a4720ae617f714a703d30` | `/dashboard/command-center` | **LIVE** | Connect needs attention alerts feed to active Firestore metrics. |
| Deal Analyzer (Desktop) | `6137c5cfd9984a058ded515c4841f2e8` | `/dashboard/deal-analyzer` | **LIVE** | None. Fully functional. |
| Reports & Tax Intelligence (Desktop) | `3533b837ae15420ebc93f6e843e4c3a6` | `/dashboard/tax` | **LIVE** | Verify Schedule E preview and ZIP downloads compile correctly. |
| Refinance Report Summary (Desktop) | `fefeeacb8ca74ebbafd02111ce91fb26` | `/dashboard/projects/[id]/hold` | **DRAFT** | Connect period-aware cash flow and hold cost variables to metrics. |
| Project Workspace: Exit Phase | `f000bc93ffd04b16a10203de8b6d1bfc` | `/dashboard/projects/[id]/exit` | **DRAFT** | Map exit modality specific inputs to active state fields. |
