# CLAUDE.md — E-Learning Platform

Working instructions for Claude Code when assisting in this repository.

## Stack Versions (Exact)

| Layer | Package | Version |
|---|---|---|
| Framework | Next.js | 16.2.1 |
| Runtime | React | 19 |
| ORM | Prisma | 7.x |
| Auth | next-auth | 5.0.0-beta (Auth.js v5) |
| DB driver | @prisma/adapter-pg | 7.x |
| Styling | Tailwind CSS | 4.x |
| Validation | Zod | 4.x |
| Tests | Vitest | 4.x |
| Package manager | pnpm | 9+ |

## Critical Architectural Quirks

### Next.js 16: `proxy.ts` not `middleware.ts`
Next.js 16 renames the middleware file. The route-protection file is `src/proxy.ts`, **not** `src/middleware.ts`. Do not create or reference `middleware.ts`.

### Prisma 7: `prisma.config.ts` + adapter
Prisma 7 separates datasource config from the schema. The DB connection is configured via `prisma.config.ts` (if present) and uses `@prisma/adapter-pg` at runtime. The `datasource db` block in `schema.prisma` does not contain a `url` field — the URL is injected via the adapter.

### Auth.js v5 split config
- `src/lib/auth.config.ts` — edge-safe config (route protection logic). No Node-only imports.
- `src/lib/auth.ts` — full server-side auth with Prisma adapter.
- `src/proxy.ts` imports only `auth.config.ts` (edge runtime constraint).

## Video Security Rules (Non-Negotiable)

1. **Never expose `s3Key` to the client.** The `s3Key` column is server-only. Strip it from any response shape passed to the browser.
2. **All video playback goes through `/api/videos/[videoId]/signed-url`.** This route validates session, checks `VideoPermission`, then returns a 15-minute signed R2 URL.
3. **Signed URLs expire in 15 minutes.** Do not increase this TTL.
4. **Origin/Referer validation** is required in the signed-url route. Reject requests whose `Origin` or `Referer` header does not match `NEXT_PUBLIC_APP_URL`.
5. **CORS** for `/api/videos/*` is locked to `NEXT_PUBLIC_APP_URL` in `next.config.ts`. Do not widen it.

## Auth & Role Rules

- JWT strategy only — no database sessions.
- Two roles: `STUDENT` and `ADMIN`.
- Admin routes: `/admin/*` — protected by `authConfig` authorized callback.
- Student routes: `/dashboard`, `/videos/*` — requires authenticated session.
- Public routes: `/login`, `/register`.
- Never pass raw `passwordHash` to the client.

## Code Conventions

- **Server Actions** for all mutations. No REST endpoints for CRUD — only the signed-url route and auth handler are API routes.
- **Zod 4 schemas** for all input validation (note: Zod 4 API differs from v3 — `z.string().min()` behaviour changed for empty strings).
- **`src/lib/db.ts`** exports the singleton Prisma client. Always import from there, never instantiate Prisma directly.
- **`src/lib/r2.ts`** exports the S3 client for R2. Never construct `S3Client` inline.
- Component files: PascalCase. Utility/hook files: kebab-case.
- Prefer React Server Components; add `"use client"` only when interactivity requires it.

## Testing

- Unit/integration tests: Vitest (`pnpm test`). Test files live in `src/__tests__/` or co-located `*.test.ts`.
- E2E tests: Playwright (`pnpm e2e`). Test files live in `e2e/`.
- Do not mock the database in integration tests — use a real test DB.

## What NOT to Do

- Do not add HLS, DRM, or Cloudflare Stream — MP4 + signed URLs is the deliberate MVP choice.
- Do not add OAuth providers — Credentials-only is intentional.
- Do not use `prisma.$queryRaw` unless absolutely necessary; prefer typed Prisma queries.
- Do not create `src/middleware.ts` — the file is `src/proxy.ts`.
- Do not set `unsafe-eval` in the CSP for production — see the TODO in `next.config.ts`.

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/elearning"
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="elearning-videos"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Docker

- `docker-compose.dev.yml` — local dev with hot reload + PostgreSQL.
- `docker-compose.yml` — production-like stack.
- `fly.toml` — Fly.io deployment config.
- Next.js is built with `output: "standalone"` for lean Docker images.
