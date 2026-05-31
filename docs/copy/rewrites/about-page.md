# Copy Rewrites — About Page

**Author**: Upstream Copy Strategist
**Date**: 2026-05-31
**Status**: Approved (Strategist Deliverable)

This document contains rewrites for all P0 and P1 issues identified on the About Page.

---

## Issue #3 — About Page Traction Claim

**Current (failing):**
> `"Join thousands of investors who track every dollar..."`

**Failed test**: Truth / Evidence

**Rewrite Option A:**
> `"Join real estate operators tracking deal metrics from acquisition to exit."`

**Rewrite Option B:**
> `"Built for operators who track every document, dollar, and deadline."`

**Recommendation**: Option A because it maintains the **Cialdini Social Proof** framework without utilizing fabricated user counts. It calls out the target persona directly ("real estate operators").

**Frameworks applied**: Cialdini (Social Proof, Liking), StoryBrand (Investor as hero).

---

## Issue #9 — Dead Links & Outdated CTA Routing

**Current (failing):**
> `href="/#pricing"` on the "Get Started Free" button in `/about/page.tsx` line 131.

**Failed test**: Dead Link

**Rewrite Option A:**
> Reroute link to `/register` to match the Landing Page conversion funnel and prevent users from falling on dead anchor tags on the home page.

**Rewrite Option B:**
> Point link to the standalone `/pricing` page route.

**Recommendation**: Option A because it supports **Eugene Schwartz (Friction reduction)**. If the user is on the About page and decides to get started, they should proceed directly to registration instead of back-routing to a pricing selector.

**Frameworks applied**: Eugene Schwartz (Objection preemption, conversion path mapping).
