# NestJS API (Cloud Run) — PaperWorking_v1

## Production architecture (Wave 1 complete)

```text
Vercel (Next.js FE only)
  → HTTPS NEXT_PUBLIC_API_URL
NestJS on Cloud Run (apps/api)
  → Controllers → Guards → Zod → Services → Prisma
  → Supabase PostgreSQL
```

- **No** `apps/web/app/api/**` production routes
- **No** Express bridge
- Firebase Auth remains IdP; Nest is API auth/RBAC authority

## Run locally

```bash
npm run build --workspace=@paperworking/database
npm run build --workspace=@paperworking/api
PORT=8080 node apps/api/scripts/start-with-env.mjs
# or: npm run start:api --workspace=@paperworking/api  (requires DATABASE_URL in env)
```

FE: set `NEXT_PUBLIC_API_URL=http://localhost:8080` and `CORS_ORIGINS=http://localhost:3000`.

## Docker

```bash
docker build -f apps/api/Dockerfile -t paperworking-api .
docker run -p 8080:8080 -e PORT=8080 -e DATABASE_URL=... -e CORS_ORIGINS=https://your-app.vercel.app paperworking-api
```

Entry: `node apps/api/dist/main.js`

## Inventory

See [NEST_FULL_MIGRATION_INVENTORY_v1.md](./NEST_FULL_MIGRATION_INVENTORY_v1.md).
