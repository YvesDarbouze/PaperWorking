# REIL v2 Copy Specification

**Status:** Locked (Canonical Reference)
**Last Updated:** 2026-07-10
**Owner:** Copy Strategist

This document is the single source of truth for all PaperWorking UI copy,
marketing text, phase labels, CTA strings, and banned terminology.

---

## 1  Brand Voice & Tone

PaperWorking talks like a **seasoned real estate operator**. Not a SaaS marketer,
not an academic, not a Silicon Valley pitch deck.

### 1.1  Tone Pillars

| Pillar | What It Means |
|--------|---------------|
| **Direct** | Say what the product does, no filler. |
| **Experienced** | Understand the exact friction: earnest money deposits, contractor delays, CPA audits. |
| **Skeptical of Fluff** | Hard, verifiable numbers over vague assertions. |
| **Supportive but Firm** | Build tools that help operators look professional. Copy reflects that authority. |

### 1.2  Style Directives

1. **Use contractions** — "you'll", "it's", "don't", "can't"
2. **Address the operator directly** — "you", "your deal", "your portfolio"
3. **Be concrete & specific** — explain *how* it works, not that it's "powerful"
4. **Sentence variety** — mix short punchy with descriptive
5. **Verb-first instructions** — "Upload your HUD-1", "Select exit path", "Log materials draw"

---

## 2  Banned Words Index

> [!CAUTION]
> These words are **prohibited** in all UI copy, marketing, docs, and agent-generated text.
> Violation triggers an immediate rewrite.

| Banned Word | Preferred Substitute | Reason |
|-------------|---------------------|--------|
| `robust` | exact, complete | Lost all meaning |
| `streamline` | track, organize | Too generic. Tell the user *how*. |
| `leverage` | use | Pure corporate speak |
| `seamlessly` | *(remove entirely)* | Overused adverb, zero value |
| `cutting-edge` | verified, built-in | Prove quality by evidence, not adjectives |
| `holistic` | full-lifecycle | Keep it relevant to real estate |
| `empower` | let, allow | The tool is a helper; the operator is the hero |
| `navigate` | go to, manage | Avoid navigational metaphors in copy |
| `institutional-grade` | CPA-ready, professional | Keeps the promise realistic and grounded |

---

## 3  Phase Copy (Locked)

### 3.1  Marketing Titles & Sub-captions

| Phase | Title | Sub-caption |
|-------|-------|-------------|
| 1 | Acquisition | Know the real numbers before you sign. |
| 2 | Fund | Capital raise, financing, and closing room. |
| 3 | Hold | Renovation budget, holding costs, and operations. |
| 4 | Exit | Sale, settlement, and realized ROI. |

### 3.2  Phase Body Copy

**Phase 1 — Acquisition:**
> "Calculate your projected IRR, Cap Rate, and cash-on-cash return with exact deal formulas. Build syndication pitches with real numbers that LPs trust."

**Phase 2 — Fund:**
> "Track escrow deposits, title work, earnest money deposits, and closing timelines. Secure capital and invite investors to your financing room."

**Phase 3 — Hold:**
> "Log receipts, track renovation progress, and approve contractor draws by milestone. Monitor utility costs and occupancy status."

**Phase 4 — Exit:**
> "Track monthly carrying costs, property valuations, and exit closing disclosures. Generate a single, clean cost-basis export for your accountant at tax time."

### 3.3  Phase Semantic Colors

| Phase | Color Name | Hex |
|-------|-----------|-----|
| 1 | Gold/Amber | `#F59E0B` |
| 2 | Blue | `#3B82F6` |
| 3 | Orange | `#F97316` |
| 4 | Green | `#10B981` |

---

## 4  Landing Page Copy (Canonical)

### 4.1  Hero Section

- **Status Pill:** `● Active Operator Platform`
- **Headline:** "Stop Running Six-Figure Flips Out of Five-Column Spreadsheets."
- **Sub-headline:** "PaperWorking is the deal operating system for real estate investors. Track every document, dollar, and deadline from acquisition to exit in one dashboard."
- **Primary CTA:** `Start Free Trial`
- **Trial Subtext:** `Free for 14 days • No credit card required • Instant setup`

### 4.2  Dashboard Preview Values

| Metric | Value |
|--------|-------|
| ARV | $350,000 |
| Rehab Budget | $35,000 |
| Current Cost Basis | $282,400 |
| Projected Net Exit | $32,600 |

### 4.3  Credibility Block (Selected: Founder-Credibility Framing)

> "Built by active real estate operators who closed 40+ deals before writing a single line of code. We built the system we needed to survive our own flips and syndications."

### 4.4  Social Proof (Operator Case Studies — NOT testimonials)

**Case Study 1 — The Multi-Unit Rehab:**
- Headline: "We saved $8,400 in materials variances."
- Metadata: `Solo Operator • Duplex Flip • Nashville, TN`

**Case Study 2 — Partnership Transparency:**
- Headline: "Built trust with our passive partners."
- Metadata: `JV Partnership • 4-Unit Value-Add • Dallas, TX`

### 4.5  Security & Trust Signals

- "Real estate data is sensitive. We secure it like financial data."
- AES-256 Encryption · Firebase Auth Security · Read-Only Shared Views

---

## 5  Pricing Page Copy (Canonical)

### 5.1  Plans

| Plan | Monthly | Annual | Tagline |
|------|---------|--------|---------|
| Solo | $99/mo | $79/mo ($948/yr) | For independent operators flipping 1–3 deals at a time. |
| Team | $249/mo | $199/mo ($2,388/yr) | For small partnerships and active syndication groups. |
| Enterprise | $499/mo | $399/mo ($4,788/yr) | For institutional syndicators and multi-market operators. |

### 5.2  Billing Toggle

- `Pay Monthly` (Standard) / `Pay Annually` (Save 20%)

### 5.3  Plan Value Propositions

| Plan | Value Prop |
|------|-----------|
| Solo | Take control of your cost basis and stop chasing receipts. |
| Team | Collaborate with partners, lenders, and contractors from one workspace. |
| Enterprise | Custom access rules, white-label reporting, and priority support. |

---

## 6  CTA Templates

| Context | CTA Text | Notes |
|---------|----------|-------|
| Landing Hero | Start Free Trial | Primary pill button |
| Landing Nav | Sign In | Ghost/secondary style |
| Pricing Card | Start Free Trial | Per-plan primary button |
| Trial Subtext | Free for 14 days • No credit card required • Instant setup | Below CTA buttons |
| In-App Upgrade | Upgrade Plan | Settings → Billing |
| Export | Export to CSV | Data export actions |

> [!WARNING]
> **Never** use "Sign up now to immediately scale your portfolio!" or similar pressure copy.
> **Never** require credit card at trial signup (defer to in-app settings).

---

## 7  FAQ Copy (Landing Page)

**Q: How is this better than my existing spreadsheets?**
A: Spreadsheets work well for one deal at a time. But they break when you add partners, manage multiple properties, or need to calculate complex carrying cost burn rates. PaperWorking links your transaction history directly to your cost basis, tracking deadlines automatically so you don't lose earnest money.

**Q: Can my accountant and contractor use it?**
A: Yes. You can invite contractors with "Rehab-Only" permissions to submit draw requests, and invite your CPA with "Read-Only" financial access to export transaction ledgers. You control the keys.

**Q: What happens when the 14-day trial ends?**
A: You will be prompted to choose a plan (Solo, Team, or Vendor) to keep tracking your deals. We don't ask for a credit card when you sign up, so you'll never be billed automatically.

**Q: Is my data locked in?**
A: Never. You can export all your project data, financials, transaction logs, and checklists to standard CSV files at any time.

---

## 8  Copy Audit Rules

### 8.1  Truth Test

Every claim on a public page must pass: **Is this verifiable from the running codebase?**
- No fabricated user counts, capital figures, or deal volumes.
- No fake testimonial names or outcomes.
- No capability claims for features that don't exist.

### 8.2  Comprehension Test

If a visitor cannot tell **what the platform does**, **who it's for**, and **how to start** within 7 seconds of landing, the copy has failed.

1. **What:** A deal management operating system for active real estate operators.
2. **Who:** Fix-and-flippers, small REI partnerships, and syndication leads.
3. **How:** Start a 14-day free trial (no credit card required).

### 8.3  Capability Sign-Off

These capabilities are verified against the TypeScript codebase:
- **No ML/AI Valuation** — Calculators run on manual or API inputs. Copy must not claim "AI-powered" valuations.
- **No Integrated Payments** — Draw management tracks milestones but does not route ACH.
- **No Automatic Tax Sync** — Property taxes are entered manually in Hold Cost periods.

---

## Source of Truth Files

| File | Path |
|------|------|
| Voice & Tone | `docs/copy/voice-and-tone.md` |
| Landing Page v2 | `docs/copy/landing-page-v2.md` |
| Pricing Page v2 | `docs/copy/pricing-page-v2.md` |
| Copy Audit Inventory | `docs/copy/audit-inventory.md` |
| Phase Reconciliation | `docs/copy/phase-reconciliation.md` |
| Credibility Options | `docs/copy/credibility-options.md` |
| Live Site Audit | `docs/copy/live-site-audit.md` |
| Copy Strategist Report | `docs/copy/copy-strategist-report.md` |
