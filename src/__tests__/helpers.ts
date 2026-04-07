/**
 * Test utilities: mock factories and common helpers.
 *
 * All factories produce plain objects whose shape matches the corresponding
 * Prisma-generated types.  Callers can override any field via the optional
 * `overrides` parameter.
 */

import type { User, Video, VideoPermission, PolicyAgreement, Playlist, PlaylistVideo } from "@prisma/client";
import type { Session } from "next-auth";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const BASE_DATE = new Date("2024-01-01T00:00:00.000Z");

// ---------------------------------------------------------------------------
// User factory
// ---------------------------------------------------------------------------

let _userCounter = 0;

export function makeUser(overrides: Partial<User> = {}): User {
  const n = ++_userCounter;
  return {
    id: `user_${n}`,
    email: `user${n}@example.com`,
    name: `Test User ${n}`,
    // passwordHash is nullable (social-only users have no password).
    // Defaults to a mock hash; pass null via overrides for OAuth-only users.
    passwordHash: "$2b$12$hashedpasswordhere",
    role: "STUDENT",
    isActive: true,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

export function makeAdminUser(overrides: Partial<User> = {}): User {
  return makeUser({ role: "ADMIN", ...overrides });
}

// ---------------------------------------------------------------------------
// Video factory
// ---------------------------------------------------------------------------

let _videoCounter = 0;

export function makeVideo(overrides: Partial<Video> = {}, tenantId = "tenant_1"): Video {
  const n = ++_videoCounter;
  return {
    id: `video_${n}`,
    title: `Test Video ${n}`,
    description: `Description for video ${n}`,
    s3Key: `videos/abc${n}/test-video-${n}.mp4`,
    duration: 300,
    thumbnailUrl: null,
    isActive: true,
    playCount: 0,
    isFeatured: false,
    tenantId: tenantId,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// VideoPermission factory
// ---------------------------------------------------------------------------

let _permissionCounter = 0;

export function makeVideoPermission(
  overrides: Partial<VideoPermission> = {},
  tenantId = "tenant_1"
): VideoPermission {
  const n = ++_permissionCounter;
  return {
    id: `perm_${n}`,
    tenantId: tenantId,
    userId: `user_1`,
    videoId: `video_1`,
    grantedBy: `admin_1`,
    grantedAt: BASE_DATE,
    validFrom: null,
    validUntil: null,
    durationDays: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PolicyAgreement factory
// ---------------------------------------------------------------------------

let _policyCounter = 0;

export function makePolicyAgreement(
  overrides: Partial<PolicyAgreement> = {},
  tenantId = "tenant_1"
): PolicyAgreement {
  const n = ++_policyCounter;
  return {
    id: `policy_${n}`,
    tenantId: tenantId,
    userId: `user_1`,
    ipAddress: "127.0.0.1",
    agreedAt: BASE_DATE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Playlist factory
// ---------------------------------------------------------------------------

let _playlistCounter = 0;

export function makePlaylist(overrides: Partial<Playlist> = {}, tenantId = "tenant_1"): Playlist {
  const n = ++_playlistCounter;
  return {
    id: `playlist_${n}`,
    title: `Test Playlist ${n}`,
    description: `Description for playlist ${n}`,
    thumbnailUrl: null,
    slug: `test-playlist-${n}`,
    tenantId: tenantId,
    isActive: true,
    isFeatured: false,
    sortOrder: n,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PlaylistVideo factory
// ---------------------------------------------------------------------------

let _playlistVideoCounter = 0;

export function makePlaylistVideo(
  overrides: Partial<PlaylistVideo> = {}
): PlaylistVideo {
  const n = ++_playlistVideoCounter;
  return {
    playlistId: `playlist_1`,
    videoId: `video_${n}`,
    position: n - 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Session factories
// ---------------------------------------------------------------------------

export function makeStudentSession(overrides: Partial<User> = {}, tenantId = "tenant_1"): Session {
  const user = makeUser({ role: "STUDENT", ...overrides });
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      activeTenantId: tenantId,
      tenantRole: "STUDENT",
    },
    expires: new Date(Date.now() + 86400 * 1000).toISOString(),
  };
}

export function makeAdminSession(overrides: Partial<User> = {}, tenantId = "tenant_1"): Session {
  const user = makeUser({ role: "ADMIN", ...overrides });
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      activeTenantId: tenantId,
      tenantRole: "ADMIN",
    },
    expires: new Date(Date.now() + 86400 * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Reset counters between tests (call in beforeEach if deterministic IDs matter)
// ---------------------------------------------------------------------------

export function resetFactoryCounters(): void {
  _userCounter = 0;
  _videoCounter = 0;
  _permissionCounter = 0;
  _policyCounter = 0;
  _playlistCounter = 0;
  _playlistVideoCounter = 0;
}
