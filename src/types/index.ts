import type { User, Video, VideoPermission, PolicyAgreement, Role, CourseMaterial } from "@prisma/client";

// -----------------------------------------------------------------------
// Re-exports for convenience
// -----------------------------------------------------------------------
export type { User, Video, VideoPermission, PolicyAgreement, Role, CourseMaterial };

/** Material record safe for client — s3Key omitted. */
export type PublicMaterial = Omit<CourseMaterial, "s3Key">;

/** Safe subset of Video exposed to unauthenticated callers — never includes s3Key. */
export type PublicVideo = Pick<
  Video,
  "id" | "title" | "description" | "duration" | "thumbnailUrl" | "createdAt" | "playCount" | "isFeatured"
>;

// -----------------------------------------------------------------------
// Composed types used throughout the application
// -----------------------------------------------------------------------

/** User record stripped of the hashed password — safe to pass to client components. */
export type SafeUser = Omit<User, "passwordHash">;

/** User with all video permissions they hold, each including the video record. */
export type UserWithPermissions = User & {
  videoPermissions: (VideoPermission & {
    video: Video;
  })[];
};

/** Video with all permission records attached, each including the user it belongs to. */
export type VideoWithPermissions = Video & {
  permissions: (VideoPermission & {
    user: SafeUser;
  })[];
};

/** Lightweight permission record that includes both the user and the video. */
export type VideoPermissionWithRelations = VideoPermission & {
  user: SafeUser;
  video: Video;
};

/** Safe user with their video permissions expanded. */
export type SafeUserWithPermissions = SafeUser & {
  videoPermissions: (VideoPermission & {
    video: Video;
  })[];
};

// -----------------------------------------------------------------------
// Utility / discriminated-union helpers
// -----------------------------------------------------------------------

/**
 * Standard server-action response envelope.
 * Use the generic parameter to type the `data` field on success.
 */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Safe subset of Playlist exposed to unauthenticated callers. */
export type PublicPlaylist = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  slug: string;
  videoCount: number;
};

/** Playlist with its videos expanded (safe subset — no s3Key). */
export type PlaylistWithVideos = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  slug: string;
  videos: {
    position: number;
    video: Pick<Video, "id" | "title" | "description" | "duration" | "thumbnailUrl" | "playCount">;
  }[];
};

/** Pagination metadata returned alongside paginated list responses. */
export type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Paginated list response. */
export type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

// -----------------------------------------------------------------------
// Permission types (shared between server actions and client components)
// -----------------------------------------------------------------------

import type { PermissionTimeStatus } from "@/lib/permission-utils";
export type { PermissionTimeStatus };

/** VideoPermission with its related Video record. */
export type VideoPermissionWithVideo = VideoPermission & { video: Video };

/** Safe permission record for the permissions table — never includes s3Key or passwordHash. */
export type SafePermissionRow = {
  id: string;
  userId: string;
  videoId: string;
  grantedAt: Date;
  grantedBy: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  durationDays: number | null;
  status: PermissionTimeStatus;
  user: { id: string; name: string | null; email: string };
  video: { id: string; title: string };
};
