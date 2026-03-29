# E-Learning Platform - Architecture Document

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15+ |
| Language | TypeScript | 5.4+ |
| Styling | Tailwind CSS | 3.4+ |
| ORM | Prisma | 5.10+ |
| Database | PostgreSQL | 16 |
| Object Storage | Cloudflare R2 (S3-compatible) | - |
| Authentication | Auth.js v5 (NextAuth) | 5.x |
| Video Player | Vidstack (React) | 1.x |
| Validation | Zod | 3.22+ |
| Forms | React Hook Form | 7.x |
| UI Primitives | Radix UI | latest |
| Package Manager | pnpm | 9+ |

## 2. Data Models

### Entity Relationships

```
User 1---* VideoPermission *---1 Video
User 1---* PolicyAgreement
User (ADMIN) 1---* VideoPermission (grantedBy)
```

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  STUDENT
  ADMIN
}

model User {
  id                 String              @id @default(cuid())
  email              String              @unique
  passwordHash       String
  name               String
  role               Role                @default(STUDENT)
  isActive           Boolean             @default(true)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  videoPermissions   VideoPermission[]   @relation("UserPermissions")
  grantedPermissions VideoPermission[]   @relation("GrantedByAdmin")
  policyAgreements   PolicyAgreement[]

  @@index([email])
  @@index([role])
}

model Video {
  id            String            @id @default(cuid())
  title         String
  description   String?
  s3Key         String            @unique
  duration      Int               // seconds, max 3600
  thumbnailUrl  String?
  isActive      Boolean           @default(true)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  permissions   VideoPermission[]

  @@index([isActive])
}

model VideoPermission {
  id        String   @id @default(cuid())
  userId    String
  videoId   String
  grantedAt DateTime @default(now())
  grantedBy String

  user      User     @relation("UserPermissions", fields: [userId], references: [id], onDelete: Cascade)
  video     Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  admin     User     @relation("GrantedByAdmin", fields: [grantedBy], references: [id])

  @@unique([userId, videoId])
  @@index([userId])
  @@index([videoId])
}

model PolicyAgreement {
  id        String   @id @default(cuid())
  userId    String
  agreedAt  DateTime @default(now())
  ipAddress String

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

## 3. Folder Structure

```
e-learning-platform/
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
│   └── images/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (student)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── videos/[videoId]/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       ├── users/[userId]/page.tsx
│   │   │       ├── videos/page.tsx
│   │   │       ├── videos/upload/page.tsx
│   │   │       └── videos/[videoId]/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── videos/[videoId]/signed-url/route.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── auth.config.ts
│   │   ├── db.ts
│   │   ├── r2.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   ├── actions/
│   │   ├── auth.actions.ts
│   │   ├── user.actions.ts
│   │   ├── video.actions.ts
│   │   └── permission.actions.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── video/
│   │   ├── auth/
│   │   ├── policy/
│   │   └── providers/
│   ├── hooks/
│   │   ├── use-policy-agreement.ts
│   │   └── use-signed-url.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── next-auth.d.ts
│   └── middleware.ts
└── package.json
```

## 4. API Route Inventory

### Server Actions

| File | Function | Auth | Role | Description |
|---|---|---|---|---|
| auth.actions.ts | registerUser(data) | No | - | Create student account |
| user.actions.ts | getUsers(filters) | Yes | ADMIN | Paginated user list |
| user.actions.ts | getUserById(id) | Yes | ADMIN | Single user with permissions |
| user.actions.ts | updateUser(id, data) | Yes | ADMIN | Edit name, email, isActive |
| user.actions.ts | deleteUser(id) | Yes | ADMIN | Set isActive=false |
| video.actions.ts | getVideos(filters) | Yes | ADMIN | All videos (admin) |
| video.actions.ts | getPermittedVideos() | Yes | STUDENT | Videos current student can access |
| video.actions.ts | getVideoById(id) | Yes | ANY | Single video (checks permission) |
| video.actions.ts | createVideo(data) | Yes | ADMIN | Insert video metadata |
| video.actions.ts | updateVideo(id, data) | Yes | ADMIN | Edit title, description, isActive |
| video.actions.ts | deleteVideo(id) | Yes | ADMIN | Set isActive=false |
| video.actions.ts | getUploadPresignedUrl(filename, contentType) | Yes | ADMIN | Presigned PUT URL for R2 |
| permission.actions.ts | grantPermission(userId, videoId) | Yes | ADMIN | Create VideoPermission |
| permission.actions.ts | revokePermission(userId, videoId) | Yes | ADMIN | Delete VideoPermission |
| permission.actions.ts | bulkGrantPermissions(userId, videoIds) | Yes | ADMIN | Grant multiple videos |
| auth.actions.ts | acceptPolicy(ipAddress) | Yes | STUDENT | Record policy agreement |

### API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| /api/auth/[...nextauth] | GET, POST | - | Auth.js handlers |
| /api/videos/[videoId]/signed-url | GET | STUDENT | Returns signed R2 URL (15-min expiry) |

## 5. Video Security Strategy

### Signed URLs (Primary)
- Private R2 bucket, no public read
- `getSignedUrl()` from `@aws-sdk/s3-request-presigner` with 15-minute expiry
- Validates: authenticated user, has VideoPermission, video isActive

### Referer/Origin Validation
- Signed-url route checks Origin/Referer headers match NEXT_PUBLIC_APP_URL
- Rejects requests from other domains

### CORS Lockdown
- next.config.ts sets `Access-Control-Allow-Origin` to platform domain only for /api/videos/*
- R2 bucket CORS policy restricted to platform domain

### Content Security Policy
- `frame-ancestors 'self'` prevents iframe embedding on other sites
- `X-Frame-Options: SAMEORIGIN`

### Client-Side Deterrents
- Right-click disabled on video container
- CSS `user-select: none` on player
- No download button in Vidstack config
- No `<a download>` attributes

### MVP Approach
- MP4 with signed URLs (no HLS/DRM for MVP)
- Future: Cloudflare Stream or HLS with per-segment signing if needed

## 6. Auth Flow

### Configuration
- **Provider:** Credentials (email + password)
- **Strategy:** JWT (stateless)
- **Password Hashing:** bcryptjs
- **Edge-compatible:** auth.config.ts separated for middleware use

### Middleware Route Protection
- Public: /login, /register
- Admin: /admin/* requires ADMIN role
- Student: /dashboard, /videos/* requires authenticated user
- Redirect authenticated users away from auth pages

### Type Augmentation
- Session includes `user.id` and `user.role`
- JWT includes `id` and `role` claims

## 7. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/elearning?schema=public"

# Auth.js
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Cloudflare R2
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="elearning-videos"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 8. Component Architecture

```
RootLayout
├── SessionProvider
├── ToastProvider
│
├── (auth)/layout (centered)
│   ├── LoginForm (client, RHF + Zod)
│   └── RegisterForm (client, RHF + Zod)
│
├── (student)/layout (sidebar)
│   ├── Dashboard/page (server)
│   │   └── VideoCard[] (permitted videos)
│   └── Videos/[videoId]/page (server)
│       ├── PolicyAgreementModal (client, gates player)
│       └── VideoPlayer (client, Vidstack + signed URL)
│
└── (admin)/layout (sidebar)
    ├── Users/page → UsersTable (client, search/filter)
    ├── Users/[userId]/page → PermissionToggleList (client)
    ├── Videos/page → VideosTable (client)
    ├── Videos/upload/page → VideoUploadForm (client, presigned PUT)
    └── Videos/[videoId]/page → VideoEditForm (client)
```
