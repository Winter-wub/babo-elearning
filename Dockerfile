# =============================================================================
# Dockerfile — Advanced Multi-stage build for Next.js 16 (Node 24 LTS)
#
# Optimized for:
# - Minimal image size (~200MB)
# - Fast builds (pnpm cache mounts)
# - Production-ready performance (Standalone mode)
# =============================================================================

# 1. Base stage — shared config and system dependencies
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# 2. Deps stage — install all dependencies using build cache
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# 3. Builder stage — generate Prisma and build Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Build-time placeholders for Next.js build validation
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV AUTH_SECRET=build-time-placeholder

ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ARG NEXT_PUBLIC_AI_CHAT_ENABLED
ENV NEXT_PUBLIC_AI_CHAT_ENABLED=${NEXT_PUBLIC_AI_CHAT_ENABLED}

RUN pnpm exec prisma generate
RUN pnpm build

# 4. Runner stage — Minimal production image
FROM node:24-alpine AS runner
# openssl is required for Prisma runtime on Alpine
RUN apk add --no-cache openssl libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy assets and standalone bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma production support: Copy schema and migrations for DO migrate job
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Note: We don't include the Prisma CLI here to keep the image small (~200MB).
# DigitalOcean's migrate job should use `npx prisma migrate deploy`.

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
