import type { User, Video, VideoPermission, PolicyAgreement, Role } from "@prisma/client";

// -----------------------------------------------------------------------
// Re-exports for convenience
// -----------------------------------------------------------------------
export type { User, Video, VideoPermission, PolicyAgreement, Role };

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
