# Dockerfile — Migration monorepo (apps/web + workspace packages)
# Build context: vu-migrate-architecture/ (repo root)
# Target: Google Cloud Run / Firebase App Hosting
#
# Build:
#   docker build -f infrastructure/Dockerfile -t paperworking-migrate .
# Run:
#   docker run -p 8080:8080 -e PORT=8080 paperworking-migrate

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Workspace manifests
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY packages/financial-engine/package.json ./packages/financial-engine/
COPY packages/authz/package.json ./packages/authz/
COPY packages/identity/package.json ./packages/identity/
COPY packages/database/package.json ./packages/database/
COPY packages/services/package.json ./packages/services/
COPY packages/database/prisma ./packages/database/prisma/
COPY packages/database/prisma.config.ts ./packages/database/

RUN npm ci --workspace=@paperworking/web --include-workspace-root

# Source
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.base.json ./

# Build foundation packages + API + web (standalone)
RUN npm run build --workspace=@paperworking/shared \
    --workspace=@paperworking/validation \
    --workspace=@paperworking/financial-engine \
    --workspace=@paperworking/authz \
    --workspace=@paperworking/identity \
    --workspace=@paperworking/database \
    --workspace=@paperworking/services \
    --workspace=@paperworking/api \
    --workspace=@paperworking/web

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/web/server.js"]
