# E-Learning Platform

A secure video learning management system built with Next.js 16 and Cloudflare R2. Administrators upload and manage educational videos, then grant per-user access to students who stream content through time-limited signed URLs. The platform prioritises video content protection while keeping the developer experience simple and the deployment footprint small.

## Features

### Student Side

- Self-registration and credential-based login
- Personal dashboard showing only permitted videos
- Secure video playback via Vidstack player with signed URLs
- Policy agreement gate before first video access
- Anti-download deterrents (disabled right-click, no download button)

### Admin Side

- Admin dashboard with user and video management
- Create, edit, deactivate, and delete users
- Upload videos directly to Cloudflare R2 (up to 2 GB, MP4/WebM)
- Create, edit, deactivate, and delete video metadata
- Grant and revoke per-user video permissions (individual or bulk)
- Search and filter users and videos with pagination

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16 |
| Language | TypeScript | 5+ |
| Styling | Tailwind CSS | 4 |
| ORM | Prisma | 7 |
| Database | PostgreSQL | 16 |
| Object Storage | Cloudflare R2 (S3-compatible) | - |
| Authentication | Auth.js v5 (NextAuth) | 5.x beta |
| Video Player | Vidstack (React) | 0.6 |
| Validation | Zod | 4 |
| Forms | React Hook Form | 7 |
| UI Primitives | Radix UI | latest |
| Testing (unit) | Vitest + Testing Library | 4 |
| Testing (E2E) | Playwright | 1.58+ |

## Prerequisites

- **Node.js** 20 or later
- **pnpm** 9 or later
- **PostgreSQL** 16 (local install or Docker)
- **Cloudflare R2 account** with an API token (see [docs/deployment.md](docs/deployment.md))

## Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd e-learning-platform
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and fill in the values. See [docs/deployment.md](docs/deployment.md) for details on each variable.

4. **Set up the database**

   ```bash
   pnpm prisma generate && pnpm prisma db push
   ```

5. **Seed sample data**

   ```bash
   pnpm prisma db seed
   ```

   This creates an admin account, three sample students, two sample videos, and permission assignments.

6. **Start the development server**

   ```bash
   pnpm dev
   ```

7. **Log in**

   Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with the seeded admin account:

   | Field | Value |
   |---|---|
   | Email | `admin@elearning.com` |
   | Password | `Admin123!` |

   Sample student accounts (`alice@student.com`, `bob@student.com`, `carol@student.com`) all use password `Student123!`.

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Create an optimised production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint across the project |
| `pnpm test` | Run unit and integration tests with Vitest |
| `pnpm test:coverage` | Run tests with V8 coverage report |
| `pnpm prisma generate` | Regenerate Prisma Client after schema changes |
| `pnpm prisma db push` | Push schema changes to the database |
| `pnpm prisma db seed` | Seed the database with sample data |
| `pnpm prisma studio` | Open Prisma Studio GUI for the database |
| `pnpm e2e` | Run Playwright end-to-end tests |
| `pnpm e2e:ui` | Run Playwright tests with interactive UI |

## Project Structure

```
e-learning-platform/
├── prisma/
│   ├── schema.prisma          # Database schema (User, Video, VideoPermission, PolicyAgreement)
│   ├── seed.ts                # Sample data seeder
│   └── migrations/            # Database migration history
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login and registration pages
│   │   ├── (student)/         # Student dashboard and video player
│   │   ├── (admin)/           # Admin dashboard, user/video management
│   │   └── api/               # API route handlers (auth, signed URLs)
│   ├── actions/               # Server actions (auth, user, video, permission)
│   ├── components/            # React components (ui, layout, video, auth, policy)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Shared utilities (auth, db, r2, constants)
│   └── types/                 # TypeScript type definitions
├── docs/                      # Project documentation
├── next.config.ts             # Next.js config (security headers, CORS)
├── tailwind.config.ts         # Tailwind CSS configuration
└── package.json
```

## Documentation

- [Architecture](docs/architecture.md) -- data models, folder structure, component tree
- [API Reference](docs/api.md) -- all API routes and server actions
- [Admin Guide](docs/admin-guide.md) -- non-technical guide for administrators
- [Security](docs/security.md) -- authentication, authorization, and video protection
- [Deployment](docs/deployment.md) -- step-by-step deployment instructions

## License

This project is proprietary. All rights reserved.
