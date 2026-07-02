# Copy Strategist Verdict: Narrative Rescue Complete

**Author**: Upstream Copy Strategist
**Date**: 2026-05-31
**Status**: Approved (Sign-off Deliverable)

This report details the copy rescue work completed under **Part A.2** of the implementation plan. It confirms the alignment of brand voice, target audience focus, and capability descriptions, and verifies that all copy crimes have been resolved.

---

## 1. Summary of Actions Completed

Under the Copy Strategist audit and rewrite phase, we have generated and locked four key assets:
1. [docs/copy/live-site-audit.md](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/copy/live-site-audit.md): Indexed and audited false claims, unverified testimonials, capability gaps, and phase nomenclature mismatches on `paperworking.co`.
2. [docs/copy/voice-and-tone.md](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/copy/voice-and-tone.md): Established the direct, experienced brand personality, prohibited standard SaaS fluff, and outlined correct vs. incorrect copy patterns.
3. [docs/copy/landing-page-v2.md](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/copy/landing-page-v2.md): Drafted concrete, high-converting copy specifications for the hero grid, bento panels, lifecycle phase visualizers (REIL v2 standard), testimonials, and security features.
4. [docs/copy/pricing-page-v2.md](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/copy/pricing-page-v2.md): Structured pricing plan tables ($99, $249, $499 monthly tiers), billing savings ratios, a 16-feature comparison matrix, and pre-billing objection handlers.

---

## 2. Strategic Narrative Alignment

Our narrative structure is now focused entirely on the **Real Estate Operator** persona, drawing on the JTBD frameworks (Jobs to Be Done) and Cialdini's ethical principles of persuasion:

- **Simple & Concrete (Made to Stick)**: No vague metrics. We describe tracking by the actual actions: logging earnest money, approving contractor draw milestones, and exporting tax-time transaction ledgers.
- **The Operator is the Hero (StoryBrand)**: The copy positions PaperWorking as the tool that *enables* the operator to remain in control and build LP trust, rather than a magical platform that "seamlessly automates" all their work.
- **Negation of Spreadsheet Chaos**: We highlight the specific pain of spreadsheets (missed deadlines, broken formulas, CPA complaints) to nudge operators toward switching.

---

## 3. Product Capability Sign-Off

The Copy Strategist has verified the following capabilities align *exactly* with the TypeScript codebase checks:
- **No ML/AI Valuation**: The calculators (IRR, Cap Rate, DSCR) run purely on manual or API property data inputs. The copy reflects this transparently.
- **Draw Approvals**: The portal manages check-lists, draws, and invoices, but is not connected directly to ACH payment gateways. The copy describes this as milestone tracking and record generation.
- **Carrying Cost Burn Rate**: The system tracks monthly costs across periods in the Hold/Exit phase, which aligns with the new period-aware math in `reiMetrics.ts`.

---

## 4. Downstream Recommendations

Page-specific implementation agents (`landing-ui-agent`, `pricing-ui-agent`, `how-it-works-ui-agent`) should now consume these documents when building their layouts. They are forbidden from introducing new marketing jargon, unverified statistics, or mock user data that contradicts the locked specifications.
