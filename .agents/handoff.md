# Agent Handoff — Auth + Checkout Overhaul

## Last Agent: Antigravity (Google DeepMind)
## Date: 2026-05-12T19:39Z
## Status: ✅ Batch 1-3 Complete

## What Was Done

### Batch 1: Auth Migration (signInWithPopup → signInWithRedirect)
- **`src/context/AuthContext.tsx`**: Replaced `signInWithPopup` with `signInWithRedirect` + `getRedirectResult`. Added redirect result handler that provisions user docs and syncs session cookies on return from Google/Facebook OAuth.
- **`src/app/(auth)/login/page.tsx`**: Updated social login handler — removed `finally` block and `router.replace` since page navigates away with redirect auth.
- **`next.config.ts`**: Tightened COOP header from `same-origin-allow-popups` to `same-origin` (maximum cross-origin isolation). Updated CSP frame-src comments.

### Batch 2: Checkout Infrastructure (Already Existed)
- **Webhook handler**: `/api/stripe/webhook/route.ts` — already implemented with idempotent event deduplication, all 5 key events covered.
- **Customer portal**: `/api/stripe/portal/route.ts` — already exists.
- **NEW** `src/lib/stripe/subscription.ts`: Feature gating utility with grace period handling, plan tier comparison, and subscription state API.

### Batch 3: Plan Intent Persistence (User Journey Wiring)
- **`src/app/pricing/page.tsx`**: Unauthenticated users → plan intent saved to `sessionStorage` → redirected to `/login` → on return, `useEffect` auto-resumes checkout.
- **`src/app/page.tsx`**: Same pattern applied to landing page pricing section.

## Key Architecture Decisions
1. **sessionStorage for plan intent** (not localStorage): Auto-clears on tab close, preventing stale intents.
2. **getRedirectResult runs before onAuthStateChanged**: Ensures Firestore user doc is provisioned before the auth listener fires.
3. **ref guard on redirect handler**: `redirectHandled.current` prevents double-processing in React StrictMode.

## What's Left
- [ ] Push to `main` and verify Firebase App Hosting deployment
- [ ] Verify Google OAuth redirect URI is registered for `paperworking.co`
- [ ] Verify Facebook OAuth redirect URI in Facebook App settings
- [ ] End-to-end browser test: Visitor → Plan → Auth → Checkout → Success
