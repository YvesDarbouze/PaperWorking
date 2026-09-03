# Supabase DB cutover (PaperWorking_v1)

**Date:** 2026-08-27

## What changed
- Prisma runtime adapter: Neon HTTP → `@prisma/adapter-pg` (Supabase Postgres).
- Env: `DATABASE_URL` / `DIRECT_URL` point at Supabase; `NEXT_PUBLIC_SUPABASE_*` added.
- Browser helper: `apps/web/lib/supabase/client.ts`.

## What did **not** change yet
- **Firebase Auth** still powers login/session cookies.
- Product APIs still mostly **seed stores** (not live Prisma/Firestore SoT).
- No automatic schema push/migrate to empty Supabase — run intentionally.

## Next steps (optional)
1. `cd packages/database && npx prisma db push --config prisma.config.ts` (dev only) to create tables from `schema.prisma`.
2. Wire one read path (e.g. REIL projects) through `@paperworking/database`.
3. Later: Supabase Auth cutover (replace Firebase session).

## Security
Never commit real `DATABASE_URL` / DB password. Use Secret Manager / `.env` (gitignored).
