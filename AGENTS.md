# Agent Guide — E-Learning Platform

Reference for AI agents and automated tools working in this codebase.

## Project in One Sentence

A secure video LMS where admins upload MP4s to Cloudflare R2 and grant per-student access; students stream via 15-minute signed URLs with no download path.

## Key Files to Orient Yourself

| Purpose | File |
|---|---|
| Route protection (middleware) | `src/proxy.ts` |
| Auth configuration (edge-safe) | `src/lib/auth.config.ts` |
| Auth configuration (server) | `src/lib/auth.ts` |
| Database client (singleton) | `src/lib/db.ts` |
| R2 / S3 client | `src/lib/r2.ts` |
| Signed URL API route | `src/app/api/videos/[videoId]/signed-url/route.ts` |
| Database schema | `prisma/schema.prisma` |
| All server actions | `src/actions/` |
| Security headers + CORS | `next.config.ts` |

## Data Model Summary

```
User (STUDENT | ADMIN)
  └── VideoPermission ──── Video
  └── PolicyAgreement

VideoPermission.grantedBy → User (ADMIN)
```

## Security Invariants — Never Violate

1. `Video.s3Key` must never reach the browser. Omit it from all client-facing response shapes.
2. Video playback requires: valid session + `VideoPermission` row + `video.isActive = true`.
3. Signed URLs are generated server-side with 15-minute TTL. Never bypass or cache them longer.
4. `Origin`/`Referer` of signed-url requests must match `NEXT_PUBLIC_APP_URL`.
5. Admin operations require `session.user.role === "ADMIN"` checked server-side in each action.

## Common Tasks and Where to Look

### Add a new server action
Create or edit a file in `src/actions/`. Validate input with Zod 4. Check session and role at the top of the function. Return a discriminated union `{ success: true, data } | { success: false, error: string }`.

### Add a new page
- Student page → `src/app/(student)/`
- Admin page → `src/app/(admin)/admin/`
- Auth page → `src/app/(auth)/`

Route protection is handled automatically by `src/proxy.ts` — no per-page guards needed.

### Modify the database schema
1. Edit `prisma/schema.prisma`.
2. Run `pnpm prisma generate` to regenerate the client.
3. Run `pnpm prisma db push` (dev) or create a migration for production.

### Add a UI component
Primitives go in `src/components/ui/`. Feature components go in the relevant subdirectory (`video/`, `auth/`, `layout/`, `policy/`).

### Understand the video playback flow
```
VideoPlayer (client)
  → useSignedUrl hook
    → GET /api/videos/[videoId]/signed-url
      → validate session + VideoPermission
        → getSignedUrl() from R2
          → returns { url, expiresAt }
  → passes URL to Vidstack <MediaPlayer>
```

## Dependency Notes

- **Zod 4**: `z.string()` without `.min(1)` now accepts empty strings as valid. Explicitly add `.min(1)` for required fields.
- **Prisma 7**: Uses `@prisma/adapter-pg`. The `PrismaClient` is constructed with the pg adapter — see `src/lib/db.ts`. Do not use the default constructor without the adapter.
- **Next.js 16**: Middleware file is `proxy.ts` not `middleware.ts`.
- **Auth.js v5 beta**: Uses `next-auth@5.0.0-beta.30`. The API differs from v4. Session access in server components uses `import { auth } from "@/lib/auth"` then `const session = await auth()`.
- **Tailwind CSS v4**: Config is in `postcss.config.mjs`, not `tailwind.config.ts`. The `@tailwind` directives are replaced by `@import "tailwindcss"` in `globals.css`.

## Testing Approach

- Vitest for unit and integration tests. Config in `vitest.config.ts`.
- Playwright for E2E tests. Config in `playwright.config.ts`, tests in `e2e/`.
- Integration tests should use a real PostgreSQL test database, not mocked Prisma.
- Test files: `src/__tests__/` for shared tests, co-located `*.test.ts` for unit tests.

## Out of Scope (Do Not Implement)

- HLS streaming or DRM (deliberate MVP deferral)
- OAuth / social login providers
- Session-based auth (JWT-only)
- Real-time features (WebSockets, SSE)
- Multi-tenancy
