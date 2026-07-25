# Security Hardening: Firebase Edge Authentication & Mock Auth Bypass Elimination Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all startsWith mock token auth bypasses and secure the Firebase edge authentication flow.

**Architecture:** We will restrict all mock tokens to exact matching values (`mock_token`, `mock_session_token_123`, `mock_token_123`) and strictly enforce environment gating under `process.env.ENABLE_MOCK_AUTH === 'true'` in non-production environments. We will also implement a centralized security telemetry helper.

**Tech Stack:** Next.js 16, Firebase Admin SDK, PostHog Node SDK.

---

### Task 1: Create Centralized Security Telemetry Helper

**Files:**
- Create: `src/lib/auth/telemetry.ts`
- Modify: `src/lib/firebase/admin.ts`

**Step 1: Write telemetry helper and modify admin.ts**
Create `src/lib/auth/telemetry.ts` with SHA-256 IP hashing, Firestore `securityEvents` logging, and PostHog capture. Enforce strict exact-token checks in `src/lib/firebase/admin.ts`.

**Step 2: Verify type correctness**
Run: `npx tsc --noEmit`
Expected: PASS with no compilation errors.

**Step 3: Run the test suite**
Run: `npx jest src/__tests__/mockAuthSecurity.test.ts`
Expected: PASS

**Step 4: Commit**
```bash
git add src/lib/auth/telemetry.ts src/lib/firebase/admin.ts
git commit -m "security: add telemetry helper and harden firebase admin.ts"
```

---

### Task 2: Harden Auth Guard Helper

**Files:**
- Modify: `src/lib/firebase-admin/auth-guard.ts`

**Step 1: Eliminate startsWith mock token check**
Update `requireAuth` in `src/lib/firebase-admin/auth-guard.ts` to only accept exact mock tokens (`mock_token`, `mock_token_123`, `mock_session_token_123`, `mock-token`, `demo_token`) and strictly check `ENABLE_MOCK_AUTH === 'true'`.

**Step 2: Run verification**
Run: `npx tsc --noEmit` and `npx jest src/__tests__/authenticationGates.test.ts`
Expected: PASS

**Step 3: Commit**
```bash
git add src/lib/firebase-admin/auth-guard.ts
git commit -m "security: eliminate startsWith mock bypass in requireAuth"
```

---

### Task 4: Harden Server Actions

**Files:**
- Modify: `src/actions/dealInvitations.ts`
- Modify: `src/actions/follows.ts`
- Modify: `src/actions/listings.ts`

**Step 1: Update Server Actions verifyActionAuth**
Modify the three Server Action files to only accept exact mock tokens and strictly check `ENABLE_MOCK_AUTH === 'true'`.

**Step 2: Run verification**
Run: `npx tsc --noEmit` and `npm test`
Expected: PASS

**Step 3: Commit**
```bash
git add src/actions/dealInvitations.ts src/actions/follows.ts src/actions/listings.ts
git commit -m "security: harden mock auth bypass in Server Actions"
```

---

### Task 5: Harden Route Handlers and Middleware (Proxy)

**Files:**
- Modify: `src/app/api/invitations/[token]/indication/route.ts`
- Modify: `src/app/api/invitations/[token]/route.ts`
- Modify: `src/app/api/invitations/[token]/subscribe/route.ts`
- Modify: `src/proxy.ts`

**Step 1: Enforce exact mock tokens and ENABLE_MOCK_AUTH gate**
Harden mock token checks in the invitation routes and check `ENABLE_MOCK_AUTH === 'true'` in `src/proxy.ts` dev bypass.

**Step 2: Run verification**
Run: `npx tsc --noEmit` and `npm test`
Expected: PASS

**Step 3: Commit**
```bash
git add src/app/api/invitations/[token]/indication/route.ts src/app/api/invitations/[token]/route.ts src/app/api/invitations/[token]/subscribe/route.ts src/proxy.ts
git commit -m "security: secure proxy middleware and invitation API routes"
```
