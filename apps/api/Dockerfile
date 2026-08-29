# NestJS API — Cloud Run
# Build context: repo root (PaperWorking_v1)
#   docker build -f apps/api/Dockerfile -t paperworking-api .
#   docker run -p 8080:8080 -e PORT=8080 paperworking-api

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY packages/financial-engine/package.json ./packages/financial-engine/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/
COPY packages/database/prisma.config.ts ./packages/database/
COPY packages/config/package.json ./packages/config/

RUN npm ci --workspace=@paperworking/api --include-workspace-root

COPY packages ./packages
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

RUN npm run build --workspace=@paperworking/shared \
    --workspace=@paperworking/validation \
    --workspace=@paperworking/financial-engine \
    --workspace=@paperworking/database \
    --workspace=@paperworking/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 apiuser

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages

USER apiuser
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api/dist/main.js"]
