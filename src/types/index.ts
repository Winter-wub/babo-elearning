import type { User, Video, VideoPermission, PolicyAgreement, Role, CourseMaterial, InviteLink, InviteLinkRedemption, BlogPost, BlogCategory, BlogPostStatus } from "@prisma/client";

// -----------------------------------------------------------------------
// Re-exports for convenience
// -----------------------------------------------------------------------
export type { User, Video, VideoPermission, PolicyAgreement, Role, CourseMaterial, InviteLink, InviteLinkRedemption, BlogPost, BlogCategory, BlogPostStatus };

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

/** Playlist with preview videos for homepage sections (SET e-learning style). */
export type PublicPlaylistSection = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  slug: string;
  videoCount: number;
  videos: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    duration: number;
    playCount: number;
  }[];
};

/** Playlist with its videos expanded (safe subset — no s3Key). */
export type PlaylistWithVideos = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  slug: string;
  demoVideo?: { id: string; title: string; thumbnailUrl: string | null; duration: number } | null;
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
  durationHours: number | null;
  status: PermissionTimeStatus;
  user: { id: string; name: string | null; email: string };
  video: { id: string; title: string };
};

// -----------------------------------------------------------------------
// Invite link types
// -----------------------------------------------------------------------

import type { InviteLinkStatus } from "@/lib/invite-utils";
export type { InviteLinkStatus };

/** Invite link row for the admin list table. */
export type InviteLinkRow = Pick<
  InviteLink,
  | "id"
  | "code"
  | "label"
  | "videoIds"
  | "timeMode"
  | "durationDays"
  | "durationHours"
  | "validFrom"
  | "validUntil"
  | "maxRedemptions"
  | "currentRedemptions"
  | "expiresAt"
  | "isRevoked"
  | "createdAt"
> & {
  status: InviteLinkStatus;
  videoCount: number;
};

/** Full invite link detail with video titles and redemption records. */
export type InviteLinkDetail = InviteLinkRow & {
  videos: { id: string; title: string }[];
  redemptions: {
    id: string;
    redeemedAt: Date;
    user: { id: string; name: string | null; email: string };
  }[];
  creator: { id: string; name: string | null; email: string };
};

/** Public invite link info returned to unauthenticated callers. */
export type PublicInviteLinkInfo = {
  valid: boolean;
  label?: string;
  videoTitles?: string[];
  videoCount: number;
  permissionLabel: string;
};

// -----------------------------------------------------------------------
// Blog types
// -----------------------------------------------------------------------

/** Public blog post for listing — never includes featuredImageKey. */
export type PublicBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: BlogPostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  featuredImageUrl: string | null;
  author: { name: string | null };
  categories: { id: string; name: string; slug: string; color: string }[];
};

/** Playlist preview attached to a blog post. */
export type BlogPlaylistPreview = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  slug: string;
  videoCount: number;
};

/** Full blog post detail for public reading. */
export type BlogPostDetail = PublicBlogPost & {
  content: string;
  updatedAt: Date;
  playlists: BlogPlaylistPreview[];
};

/** Blog post for admin table — includes draft-specific info. */
export type AdminBlogPostRow = {
  id: string;
  title: string;
  slug: string;
  status: BlogPostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  featuredImageUrl: string | null;
  author: { name: string | null } | null;
  categories: { id: string; name: string; color: string }[];
};

/** Full blog post for admin editing — includes raw keys for image management. */
export type AdminBlogPostDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImageKey: string | null;
  featuredImageAlt: string | null;
  featuredImageUrl: string | null;
  status: BlogPostStatus;
  publishedAt: Date | null;
  authorId: string | null;
  categoryIds: string[];
  playlistIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

/** Blog category with post count for admin management. */
export type BlogCategoryWithCount = BlogCategory & {
  _count: { posts: number };
};
