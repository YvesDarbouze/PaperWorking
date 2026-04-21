# Agent Handoff

This file passes context between Antigravity (Google), Claude Code (Anthropic), and IDE agents (Cursor, Windsurf).

## Current State: AUTH FULLY FIXED ✅ (2026-04-20, Claude Code)

`main` is up to date. Production deployment triggered by push to `main`.

## What Was Fixed (this session)
- **OAuth redirect flow**: Login/register pages have `useEffect(user+loading)` to redirect to `/dashboard` after Google/Facebook OAuth redirect returns
- **Cookie race condition**: `setLoading(false)` in `AuthContext` now runs AFTER `syncSessionCookie` (try/finally)
- **Proxy**: Removed `/dashboard` blocking — client-side guard in `dashboard/layout.tsx` is authoritative; proxy only redirects auth pages when already authenticated
- **COOP header**: `same-origin-allow-popups` in `next.config.ts` resolves Firebase OAuth popup warnings
- **Terms/Privacy pages**: Created at `/terms` and `/privacy`
- **Session route**: Uses `btoa()` (not `Buffer`) for App Hosting runtime compatibility
- **Magic Link**: Implemented in `AuthContext` + login page

## Architecture Summary
- Auth source of truth: Firebase Client SDK (`onAuthStateChanged`)
- Server session: Firebase ID token → `/api/auth/session` → `__session` HttpOnly cookie
- Proxy file: `src/proxy.ts` (Next.js 16 — was `middleware.ts` in v15)
- Dashboard guard: Client-side in `src/app/dashboard/layout.tsx`
- Secrets: `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` in Google Secret Manager

## Next Agent
No blocking issues. Auth is ready. System is open for feature work.
