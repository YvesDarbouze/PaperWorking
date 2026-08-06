# Walkthrough — Settings → Billing Redesign

**Date:** 2026-08-04
**Branch:** `Yves/feature-development`
**Sprint:** UX/UI Hardening, August 2026 — Prompt 2
**Route:** `/dashboard/settings/billing`

> **Route note:** the prompt referenced `/dashboard/billing`. That route does not
> exist. Per the navigation contract §9.3 v7, Billing lives at
> `/dashboard/settings/billing`, which is what was redesigned.

---

## 0. Verification Summary

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** (true exit code, empty output) |
| `npx jest` | ⚠️ 2714/2726 — same **2 pre-existing** suites, unchanged by this work |
| `e2e/billing-redesign.spec.ts` (new) | ✅ **6/6 pass** |
| Billing page loads, plan visible, payment method editable | ✅ asserted |
| No dead space between nav and content at 1440px | ✅ measured, 24px |
| API Usage card absent from Billing | ✅ asserted |

The 12 jest failures are `src/marketplace/listings.test.ts` and
`src/scripts/seedAgentCrew.test.ts` — database-seeding assertions, proven
pre-existing at clean HEAD in the Prompt 1 walkthrough. Pass count is identical
before and after this prompt (2714), so nothing here regressed.

---

## 1. Before / After Layout

### The dead-space bug

`src/app/dashboard/settings/layout.tsx:128` had:

```jsx
<main className="flex-1 min-w-0 max-w-[720px] mx-auto w-full">
```

`mx-auto` centres a 720px pane inside a much wider flex track. At 1440px the
track is ~872px, so the pane sat centred with ~76px of dead gutter on **both**
sides — pushing content away from the nav and leaving the empty columns.

**Fixed:** `gap-8` → `gap-6` (24px gutter), `max-w-[720px] mx-auto` →
`max-w-[900px]` left-aligned.

### Measured at 1440px (Playwright, post-fix)

| Element | Left | Right | Width |
|---|---:|---:|---:|
| Global app sidebar | 0 | 240 | 240 |
| Settings nav | 280 | 504 | 224 |
| Content `<main>` | 528 | 1400 | **872** |

Settings nav → content gap: **24px exactly**. Content width went 720 → 872
(capped at 900), left-aligned, with leftover space falling on the right.

> **Blast radius:** this layout is shared by all 7 settings pages (General,
> Profile, Team, Notifications, Billing, Data & Privacy, Audit Logs). They all
> gain the wider, left-aligned pane. That is consistent rather than
> billing-specific — flagging it because the prompt scoped the fix to Billing.

---

## 2. Removed vs Added

### Removed from the Billing page

| Component | Was | Now |
|---|---|---|
| `AccountTierSettings` (vertical comparison bars) | `col-span-4` card | **Removed.** Replaced by one line: "Need team features? Upgrade to Team →" opening the plan sheet |
| RentCast **API Usage** card | `col-span-4` card + its own fetch + 2 state vars | **Moved** to Settings → Integrations as `ApiUsageCard` |
| **"Change Your Plan"** section | `col-span-12`, 3 large plan cards always on screen | **Merged** into a modal opened by the hero's "Change Plan" button |
| Seat Limit / "Add Seats" block | inside hero | Removed — seat management belongs on Settings → Team, which it already linked to |
| "Download All" invoices button | invoice header | Removed — per-row PDF links cover it without the popup-blocker staggering hack |
| 12-column bento grid | `lg:grid-cols-12` with 8/4/4/4/4/12/8/12 spans | Single ~900px column + one 2-col row |

### Added

| Item | Purpose |
|---|---|
| `src/components/settings/ApiUsageCard.tsx` | API Usage in its new home, restyled to match the Integrations card system |
| `PUT /api/settings/billing` | Persists the inline-edited billing contact block |
| `GET /api/settings/billing` fields | Returns `companyName`, `billingEmail`, `billingAddress` |
| `billingEmail` / `billingAddress` | Added to `src/types/user.ts` and `userSchema.ts` |
| `e2e/billing-redesign.spec.ts` | 6 acceptance tests |

### Page structure now

```
1. Current Plan hero      — eyebrow, plan name, status dot, price/cycle/next date,
                            Change Plan (primary), Cancel Subscription (text, red on hover)
2. Payment Method | Billing Info    — 2-col from `sm`, stacked below
3. Invoice History        — Date · Amount · Status · PDF
4. "Need team features? Upgrade to Team →"
5. CloudStorageMeter
```

`CloudStorageMeter` was **kept** — it was not on the removal list. Say the word
and it moves to Integrations alongside API Usage; it is arguably the same class
of thing.

---

## 3. Requirements

| # | Requirement | Status |
|---|---|---|
| 1 | Tighten spacing, ~900px, left-aligned, 24px gutter | ✅ measured 24px / 872px |
| 2 | Hero: label, plan, price, cycle, next date, status badge, primary + secondary actions | ✅ green dot Active / amber Inactive; "Change Plan" or "Choose a Plan"; "Cancel Subscription" text-only, `hover:text-error` |
| 3 | Payment method: brand, last-4, expiry; empty state; Stripe for adding | ✅ Stripe-hosted portal (`/api/stripe/portal`) |
| 4 | Compact billing form, inline edit (pencil) → save/cancel, no separate page | ✅ asserted URL is unchanged during edit |
| 5 | Invoice table + "No invoices yet." empty state | ✅ verbatim |
| 6 | Remove tier bars / API Usage / redundant Change Plan | ✅ all three |
| 7 | Mobile stacks + full-width buttons; tablet 2-col | ✅ asserted `grid-template-columns` count is 1 at 375px, 2 at 900px |

---

## 4. Stripe Integration Verification

Stripe was already wired; this redesign reuses it rather than reimplementing.

| Action | Endpoint | Mechanism |
|---|---|---|
| Add / update payment method | `POST /api/stripe/portal` | Stripe-hosted Billing Portal — card data never touches our origin |
| Change plan | `POST /api/stripe/checkout` | Stripe Checkout; proration handled by Stripe |
| Cancel subscription | `CancelSubscriptionModal` → `POST /api/stripe/portal` | Consequences + export copy shown first, cancellation completed in the portal |
| Invoices | `POST /api/stripe/invoices` | Live invoice list with `pdfUrl` / `hostedUrl` |
| Next billing date | `POST /api/stripe/subscription` | `currentPeriodEnd` from the live subscription |
| Card on file | `POST /api/stripe/payment-method` | Live brand / last4 / expiry |

**Against the project's integration rules:**
- **No secret in the client bundle** — every Stripe call is a `POST` to a server
  route; the page holds no key. Card entry happens on Stripe's domain.
- **Auth guard** — all six routes take a Firebase `idToken`; the new
  `PUT /api/settings/billing` uses the existing `requireAuth` helper and derives
  `uid` from the verified token, never from the request body.
- **Persistence** — `PUT` writes to Firestore `users/{uid}` via
  `set(..., { merge: true })`, not component state.
- **Server-side validation** — billing email is regex-checked and rejected with
  400; strings are trimmed and length-capped (200 / 500).
- **Least privilege** — the endpoint writes *only* `companyName`,
  `billingEmail`, `billingAddress`. Plan, status, and payment method remain
  Stripe-authoritative and are never client-writable.

**Verified by hand, since tests do not cover it:** the redesign adds no new
third-party SDK call and introduces no new secret. The one new endpoint is
first-party and auth-guarded.

---

## 5. Evidence

`e2e/billing-redesign.spec.ts` — **6/6**:

1. Page loads; hero, plan name, and status all visible
2. Payment method card exposes an edit affordance in either state
3. Inline edit opens a form with all three fields, URL unchanged, cancel reverts
4. `body` contains none of "API Usage", "RentCast API Volume", "Account Tier"; upsell line present
5. Nav→content gap ≤32px, content >720px and ≤900px, left-aligned
6. One grid column at 375px, two at 900px

Screenshots in `screenshots/billing-redesign/`: `billing-1440-desktop.png`,
`billing-375-mobile.png`, `billing-900-tablet.png`.

**Also hardened this pass:** the chat-bot circle test previously asserted only
`width === height` and border width — which a *rounded square* would pass, i.e.
exactly the container Prompt 1 was asked to remove. It now also asserts
`border-radius >= width / 2`. Still passing.

---

## 6. Files Changed

**New (3)**
- `src/components/settings/ApiUsageCard.tsx`
- `e2e/billing-redesign.spec.ts`
- `.agents/handoff/billing-redesign-walkthrough.md`

**Modified (6)**
- `src/app/dashboard/settings/billing/page.tsx` — rewritten, 640 → ~600 lines with more functionality (inline edit, plan sheet, cancel flow)
- `src/app/dashboard/settings/layout.tsx` — gutter + pane width
- `src/app/dashboard/settings/integrations/page.tsx` — mounts `ApiUsageCard`
- `src/app/api/settings/[[...section]]/route.ts` — `billing` PUT section + GET fields
- `src/types/user.ts`, `src/lib/schemas/userSchema.ts` — new billing fields
- `e2e/ux-hardening-evidence.spec.ts` — border-radius assertion

---

## 7. Dead Code Removed

`src/components/billing/` went from **1,428 lines → 112** (9 files deleted).
Scope was held to Billing only, as instructed.

| Deleted | Why it was dead |
|---|---|
| `BillingPage.tsx` (362) | Imported nowhere — the route has always had its own implementation |
| `ChangePlanModal.tsx` | Only imported by `BillingPage.tsx` |
| `PlanCard.tsx` | Only imported by `BillingPage.tsx` |
| `PaymentMethodCard.tsx` | Only imported by `BillingPage.tsx` |
| `InvoiceTable.tsx` | Only imported by `BillingPage.tsx` |
| `AddCardModal.tsx` | Only imported by `BillingPage.tsx` |
| `CheckoutSuccessHandler.tsx` | Zero references |
| `UpgradePromptModal.tsx` | Zero references |
| `SubscriptionGate.tsx` | Zero references — the **live** one is `components/shared/SubscriptionGate.tsx`, which is untouched and still covered by `authMicrocopy.test.ts` |

**Kept:** `CancelSubscriptionModal.tsx` — used by the redesigned page, and
`authMicrocopy.test.ts` asserts its microcopy verbatim.

### A test was guarding dead code

`src/__tests__/settingsSidebarAccess.test.ts` read `InvoiceTable.tsx` and
`PaymentMethodCard.tsx` **from disk** and asserted their empty-state copy —
copy that no user could ever see, since neither component rendered anywhere.
Deleting the files would have thrown `ENOENT`.

Rather than keep dead files alive to satisfy a test, the assertion was
retargeted at the live billing page, and the page adopted the fuller copy so
the contract survives on a surface users actually reach:

| | Before (dead component) | Now (live page) |
|---|---|---|
| Invoices | "No invoices yet. They will appear here after your first payment." | identical |
| Payment | "No payment**s** on file. Add a card to avoid interruption." | "No payment **method** on file. Add a card to avoid interruption." |

The payment string is now singular because Prompt 2 explicitly specified *"No
payment method on file"*. The guidance sentence is preserved. `settingsSidebarAccess`
and `authMicrocopy` both pass (17/17).

### Also removed this pass

`CloudStorageMeter` — dropped from Billing per direction. Storage consumption is
not a billing concern; the page now covers plan, payment, and invoices only. The
component itself is untouched and still used elsewhere.

### Still orphaned, deliberately left

`src/components/settings/AccountTierSettings.tsx` (228 lines) is now
unreferenced, but it lives in `components/settings/`, not `components/billing/`
— outside the "Billing only" scope given. Flagging for a follow-up.

---

## 8. Known Issues / Recommended Next

1. **Modal theming inconsistency (pre-existing).** `CancelSubscriptionModal` and
   `ChangePlanModal` are hard-coded light (`bg-white`, `text-slate-900`) while
   the app is dark-themed. The new in-page plan sheet uses `pw-*` tokens and is
   theme-aware. Worth unifying.
2. **Chat FAB overlaps the mobile bottom nav** at 375px (visible in
   `billing-375-mobile.png`). Pre-existing, unrelated to billing.
3. **Decide on `CloudStorageMeter`** — keep on Billing, or move to Integrations
   next to API Usage.
4. **Purge the dead billing components** in §7 once no other agent is on them.
