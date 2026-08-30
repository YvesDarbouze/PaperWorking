# NestJS API — Cloud Run
# Build context: repo root (PaperWorking_v1)
#   docker build -f apps/api/Dockerfile -t paperworking-api .

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
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

# prisma generate reads prisma.config.ts datasource URL — dummy is enough at build time
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"

RUN npm run build --workspace=@paperworking/shared \
    --workspace=@paperworking/validation \
    --workspace=@paperworking/financial-engine \
    --workspace=@paperworking/database \
    --workspace=@paperworking/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat openssl \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 apiuser

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages

USER apiuser
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api/dist/main.js"]
