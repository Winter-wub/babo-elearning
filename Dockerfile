# =============================================================================
# Dockerfile — Multi-stage build for Next.js 16 standalone output
#
# Stages:
#   1. deps    — install pnpm + production + dev deps (needed for prisma generate)
#   2. builder — generate Prisma client, run next build
#   3. runner  — minimal image: standalone server + static assets, non-root user
#
# Build args:
#   NODE_ENV   — defaults to production
#
# Required runtime env vars (injected at container start, not baked in):
#   DATABASE_URL, AUTH_SECRET, AUTH_URL,
#   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
#   NEXT_PUBLIC_APP_URL
# =============================================================================

# ---------------------------------------------------------------------------- #
# Stage 1: deps — install all dependencies so builder has what it needs        #
# ---------------------------------------------------------------------------- #
FROM node:20-alpine AS deps

# libc6-compat is required by some native Node modules on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Enable corepack so we can use the pnpm version locked in package.json
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifest files first to exploit Docker layer cache:
# if these don't change, the install layer is reused.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all deps (dev deps are needed for Prisma CLI in the builder stage).
# --frozen-lockfile ensures the build is reproducible.
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------- #
# Stage 2: builder — generate Prisma client and produce the Next.js build      #
# ---------------------------------------------------------------------------- #
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Bring in installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the full source tree
COPY . .

# Prisma: generate the type-safe client from schema.prisma.
# This must run before `next build` because the app imports from @prisma/client.
# The generated client is placed in node_modules/@prisma/client.
RUN pnpm exec prisma generate

# next build reads NEXT_PUBLIC_* vars at build time — they are inlined into
# the JS bundle and cannot be overridden at runtime.
# The real value is passed via fly.toml [build.args].
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ARG NEXT_PUBLIC_AI_CHAT_ENABLED=false
ENV NEXT_PUBLIC_AI_CHAT_ENABLED=${NEXT_PUBLIC_AI_CHAT_ENABLED}
# Dummy DATABASE_URL so Next.js can collect page data during build.
# Auth.js route handler initialises Prisma at import time; without a
# syntactically valid URL the build crashes. The real URL is injected
# at runtime via fly.io secrets.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV AUTH_SECRET=build-time-placeholder
ENV NODE_ENV=production
# Disable Next.js telemetry inside CI/Docker
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# No separate prisma-cli prep needed — installed directly in runner stage

# ---------------------------------------------------------------------------- #
# Stage 3: runner — minimal production image                                   #
# ---------------------------------------------------------------------------- #
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# next start in standalone mode listens on this port
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a non-root user/group for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy public assets (served directly without Next.js processing)
COPY --from=builder /app/public ./public

# Copy the standalone server bundle produced by `output: "standalone"`.
# Standalone output includes a minimal node_modules with only runtime deps,
# which keeps the final image lean.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

# ---------------------------------------------------------------------------- #
# Prisma migration support                                                      #
#                                                                               #
# We need the Prisma CLI + engines for running migrations. pnpm stores engines  #
# in deeply nested .pnpm paths. The simplest reliable approach: copy the        #
# prisma-related packages from the deps stage and the schema/migrations from    #
# the builder stage.                                                            #
# ---------------------------------------------------------------------------- #

# Copy schema and migration files
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Copy prisma config (Prisma 7 needs prisma.config.ts for migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
# Install Prisma CLI in an isolated directory for running migrations,
# then symlink into /app/node_modules so prisma.config.ts can resolve "prisma/config"
RUN mkdir -p /prisma-cli && cd /prisma-cli && npm init -y > /dev/null 2>&1 && \
    npm install prisma@7.6.0 --save-exact 2>&1 | tail -1 && \
    ln -sf /prisma-cli/node_modules/prisma /app/node_modules/prisma && \
    ln -sf /prisma-cli/node_modules/@prisma /app/node_modules/@prisma 2>/dev/null || true

# Switch to non-root before starting the server
USER nextjs

EXPOSE 3000

# Liveness probe: Next.js standalone server starts quickly; 30s initial delay
# gives time for any init tasks (e.g., DB connectivity check in middleware).
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# The standalone build emits a self-contained server.js at the project root.
CMD ["node", "server.js"]
