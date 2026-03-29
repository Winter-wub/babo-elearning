# Deployment Guide

Step-by-step instructions for deploying the e-learning platform to production.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Cloudflare R2 Setup](#cloudflare-r2-setup)
- [Docker Deployment](#docker-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Post-Deployment Checklist](#post-deployment-checklist)

---

## Environment Variables

Create a `.env.local` file (or configure environment variables in your hosting provider). Every variable below is required unless marked optional.

### Database

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Must include the schema parameter. | `postgresql://user:password@host:5432/elearning?schema=public` |

### Auth.js

| Variable | Description | Example |
|---|---|---|
| `AUTH_SECRET` | Secret key for signing JWTs. Generate with `openssl rand -base64 32`. Must be at least 32 characters. **Keep this secret.** | `aBcDeFgH1234567890...` |
| `AUTH_URL` | The canonical URL of your deployed application. Used by Auth.js for callback URLs. | `https://learn.example.com` |

### Cloudflare R2

| Variable | Description | Example |
|---|---|---|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID. Found in the Cloudflare dashboard under "Account Home". | `a1b2c3d4e5f6...` |
| `R2_ACCESS_KEY_ID` | R2 API token access key ID. Created in "R2 Object Storage" > "Manage R2 API Tokens". | `abcdef1234567890` |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret access key. Shown only once when the token is created. | `secretkey1234567890abcdef` |
| `R2_BUCKET_NAME` | Name of the R2 bucket for video storage. | `elearning-videos` |

### Application

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public URL of the application. Used for CORS, Origin validation, and CSP headers. Must not have a trailing slash. | `https://learn.example.com` |

---

## Database Setup

### Option A: Managed PostgreSQL

Use a managed PostgreSQL service such as:

- **Neon** (serverless, generous free tier)
- **Supabase** (PostgreSQL with extras)
- **AWS RDS** / **Google Cloud SQL** / **Azure Database for PostgreSQL**

1. Create a new PostgreSQL 16 database.
2. Copy the connection string and set it as `DATABASE_URL`.
3. Run migrations:

   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

4. Seed the database with the default admin account:

   ```bash
   pnpm prisma db seed
   ```

### Option B: Self-Hosted PostgreSQL

1. Install PostgreSQL 16 on your server.
2. Create a database and user:

   ```sql
   CREATE USER elearning WITH PASSWORD 'your-strong-password';
   CREATE DATABASE elearning OWNER elearning;
   ```

3. Set `DATABASE_URL` to `postgresql://elearning:your-strong-password@localhost:5432/elearning?schema=public`.
4. Run migrations and seed as shown above.

### Database Migrations

For production, use versioned migrations instead of `db push`:

```bash
# Generate a migration from schema changes
pnpm prisma migrate dev --name descriptive_name

# Apply migrations in production
pnpm prisma migrate deploy
```

---

## Cloudflare R2 Setup

### 1. Create an R2 Bucket

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **R2 Object Storage** in the sidebar.
3. Click **Create bucket**.
4. Name it `elearning-videos` (or your preferred name -- match `R2_BUCKET_NAME`).
5. Select a location hint close to your users.
6. Leave the bucket **private** (no public access).

### 2. Create an API Token

1. In the R2 section, click **Manage R2 API Tokens**.
2. Click **Create API Token**.
3. Give it a descriptive name (e.g., "E-Learning Platform").
4. Set permissions to **Object Read & Write** for the `elearning-videos` bucket.
5. Click **Create API Token**.
6. Copy the **Access Key ID** and **Secret Access Key** immediately. The secret is shown only once.
7. Set `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in your environment.

### 3. Configure CORS

Add a CORS policy to the R2 bucket so the platform can fetch signed URLs:

1. In the R2 dashboard, click on your bucket.
2. Go to **Settings** > **CORS policy**.
3. Add the following configuration (replace the origin with your domain):

```json
[
  {
    "AllowedOrigins": ["https://learn.example.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

For local development, add `http://localhost:3000` as an additional allowed origin.

**Important:** Do not use `"*"` as the allowed origin in production. This would allow any website to load your video content.

### 4. Verify the Setup

After configuring environment variables, test the connection:

```bash
# Start the dev server
pnpm dev

# Log in as admin and try uploading a video
# If the upload succeeds and generates a presigned URL, R2 is configured correctly
```

---

## Docker Deployment

### Prerequisites

- Docker 24+ and Docker Compose v2

### Create Docker Files

If the project does not include Docker files, create them.

**Dockerfile:**

```dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

**docker-compose.yml:**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: elearning
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
      POSTGRES_DB: elearning
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U elearning"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://elearning:${DB_PASSWORD:-changeme}@db:5432/elearning?schema=public
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_URL: ${AUTH_URL:-http://localhost:3000}
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET_NAME: ${R2_BUCKET_NAME:-elearning-videos}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

### Run with Docker Compose

1. Create a `.env` file in the project root with all required variables.

2. Build and start:

   ```bash
   docker compose up -d --build
   ```

3. Run migrations and seed:

   ```bash
   docker compose exec app npx prisma db push
   docker compose exec app npx prisma db seed
   ```

4. Open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deployment

### 1. Connect Repository

1. Push the project to a GitHub, GitLab, or Bitbucket repository.
2. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import the repository.

### 2. Configure Build Settings

| Setting | Value |
|---|---|
| Framework preset | Next.js (auto-detected) |
| Build command | `pnpm prisma generate && pnpm build` |
| Install command | `pnpm install` |
| Output directory | `.next` (default) |

### 3. Set Environment Variables

In the Vercel project settings, add all environment variables listed in the [Environment Variables](#environment-variables) section.

**Important notes:**
- `DATABASE_URL` must point to an externally accessible PostgreSQL instance (not `localhost`). Use Neon, Supabase, or another managed provider.
- `AUTH_URL` must match the Vercel deployment URL (e.g., `https://your-app.vercel.app`).
- `NEXT_PUBLIC_APP_URL` must also match the deployment URL.
- Generate a fresh `AUTH_SECRET` for production.

### 4. Deploy

Click **Deploy**. Vercel will build and deploy automatically.

### 5. Run Migrations

After the first deployment, run migrations against your production database:

```bash
# From your local machine, with DATABASE_URL pointing to production
pnpm prisma migrate deploy
pnpm prisma db seed
```

---

## Post-Deployment Checklist

Verify the following after deploying to production.

### Security

- [ ] `AUTH_SECRET` is a unique, randomly generated value (not the example from `.env.example`)
- [ ] `NEXT_PUBLIC_APP_URL` is set to the production domain (no trailing slash)
- [ ] HTTPS is enforced (redirect HTTP to HTTPS at the load balancer or CDN level)
- [ ] R2 bucket is private (no public read access)
- [ ] R2 CORS policy allows only the production domain
- [ ] Database credentials are strong and unique
- [ ] Default admin password has been changed

### Functionality

- [ ] Admin can log in with seeded credentials
- [ ] Admin can create new users
- [ ] Admin can upload a video and it appears in the video list
- [ ] Admin can grant a student permission to a video
- [ ] Student can log in and see their permitted videos
- [ ] Student can play a video (signed URL generation works)
- [ ] Student sees the policy agreement modal before first playback
- [ ] Registration page creates new student accounts

### Performance

- [ ] Database has appropriate indexes (applied automatically by Prisma schema)
- [ ] Next.js build completes without warnings
- [ ] Video playback starts within a few seconds

### Monitoring (Recommended)

- [ ] Application error tracking (Sentry, Vercel Analytics, or similar)
- [ ] Database connection pool monitoring
- [ ] R2 storage usage and request volume alerts
- [ ] Uptime monitoring on the login page and signed URL endpoint
