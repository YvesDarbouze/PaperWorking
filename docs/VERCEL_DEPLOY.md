# Vercel deploy (monorepo)

## Required project settings

In Vercel → Project → Settings → General:

| Setting | Value |
|---|---|
| **Root Directory** | `apps/web` |
| Framework Preset | Next.js |
| **Output Directory** | leave **empty** (do not set `.next` at repo root) |
| Install Command | override OK: `cd ../.. && npm ci` (also in `apps/web/vercel.json`) |
| Build Command | override OK: `cd ../.. && npm run build` |

Why: Next emits `.next` under `apps/web/`. If Root Directory is repo root, Vercel looks for `/vercel/path0/.next` and fails.

## Do not

- Set Output Directory to `.next` at monorepo root
- Use root `vercel.json` with `"framework": "nextjs"` (treats repo root as the Next app)
