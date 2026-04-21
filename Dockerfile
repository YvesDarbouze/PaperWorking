# Dockerfile for Next.js with Prisma optimized for Google Cloud Run
# Single-stage build to avoid cross-stage issues with platform-specific native binaries.

FROM node:20-alpine AS builder
# libc6-compat needed for Alpine: https://github.com/nodejs/docker-node#nodealpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* .npmrc* ./
# Use npm install (not npm ci) to correctly resolve platform-specific
# optional native binaries (lightningcss, @tailwindcss/oxide) on Alpine (musl).
# Delete lockfile so npm resolves optional deps for the target platform (npm #4828).
RUN rm -f package-lock.json && npm install

# Copy the rest of the application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build for production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Runner ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy common public assets
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema for potential runtime access
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

# Port configuration for Cloud Run
ENV PORT=8080
EXPOSE 8080

# Command to start the server
CMD ["node", "server.js"]
