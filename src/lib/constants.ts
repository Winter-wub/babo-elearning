// -----------------------------------------------------------------------
// Video constraints
// -----------------------------------------------------------------------

/** Maximum allowed video duration in seconds (1 hour). */
export const MAX_VIDEO_DURATION = 3_600;

/** Expiry duration for R2 signed playback URLs in seconds (15 minutes). */
export const SIGNED_URL_EXPIRY = 900;

/** Maximum upload file size in bytes (2 GB). */
export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

/** Accepted video MIME types for upload. */
export const ACCEPTED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

// -----------------------------------------------------------------------
// Course material constraints
// -----------------------------------------------------------------------

/** Maximum material file size in bytes (50 MB). */
export const MAX_MATERIAL_SIZE_BYTES = 50 * 1024 * 1024;

/** Maximum number of materials per video. */
export const MAX_MATERIALS_PER_VIDEO = 20;

/** Accepted material MIME types for upload. */
export const ACCEPTED_MATERIAL_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/zip",
  "text/plain",
  "text/csv",
] as const;

/** Content types that can be viewed inline (PDF + images). */
export const VIEWABLE_MATERIAL_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

// -----------------------------------------------------------------------
// Pagination defaults
// -----------------------------------------------------------------------

/** Default number of items per page for paginated lists. */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum number of items per page allowed by the API. */
export const MAX_PAGE_SIZE = 100;

// -----------------------------------------------------------------------
// Auth / security
// -----------------------------------------------------------------------

/** bcrypt salt rounds for password hashing. */
export const BCRYPT_SALT_ROUNDS = 12;

/** Session JWT max age in seconds (30 days). */
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

// -----------------------------------------------------------------------
// Email verification (legacy link-based — kept for backward compat)
// -----------------------------------------------------------------------

/** Email verification token TTL in milliseconds (24 hours). */
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Minimum seconds between resend requests. */
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_S = 60;

/** Maximum failed verification attempts within the window. */
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

/** Window for rate limiting failed verification attempts (5 minutes). */
export const EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

// -----------------------------------------------------------------------
// OTP email verification (new 3-step registration)
// -----------------------------------------------------------------------

/** Number of digits in the OTP code. */
export const OTP_LENGTH = 6;

/** OTP validity period in milliseconds (10 minutes). */
export const OTP_TTL_MS = 10 * 60 * 1000;

/** Maximum OTP verification attempts before lockout. */
export const OTP_MAX_ATTEMPTS = 5;

/** Minimum time between OTP resend requests in milliseconds (60 seconds). */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/** Maximum time to complete registration after OTP verification (1 hour). */
export const OTP_SESSION_TTL_MS = 60 * 60 * 1000;

// -----------------------------------------------------------------------
// Password reset
// -----------------------------------------------------------------------

/** Raw random bytes for password reset tokens (32 → 64 hex chars). */
export const PASSWORD_RESET_TOKEN_BYTES = 32;

/** Password reset token TTL in milliseconds (1 hour). */
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Max self-service reset requests per user per hour. */
export const PASSWORD_RESET_MAX_PER_HOUR = 3;

// -----------------------------------------------------------------------
// Invite links
// -----------------------------------------------------------------------

/** Number of random bytes for invite link codes (32 bytes → 64 hex chars). */
export const INVITE_CODE_BYTES = 32;

/** Maximum number of videos that can be attached to a single invite link. */
export const MAX_INVITE_VIDEOS = 100;

// -----------------------------------------------------------------------
// Application metadata
// -----------------------------------------------------------------------

export const APP_NAME = "English with Gift";
export const APP_DESCRIPTION =
  "เข้าถึงคอร์สวิดีโอคุณภาพจากผู้เชี่ยวชาญ สร้างทักษะจริงตามจังหวะของคุณ";

// -----------------------------------------------------------------------
// Theme defaults (matches the base tokens in globals.css)
// -----------------------------------------------------------------------

export const THEME_DEFAULTS = {
  primaryColor: "#1a1a1a",
  defaultMode: "light" as "light" | "dark",
  radius: "0.625",
  sidebarBg: "#0f172a",
  sidebarFg: "#ffffff",
  logoUrl: "",
} as const;

/** SiteContent keys used for theme storage. */
export const THEME_KEYS = {
  primaryColor: "theme.primaryColor",
  defaultMode: "theme.defaultMode",
  radius: "theme.radius",
  sidebarBg: "theme.sidebarBg",
  sidebarFg: "theme.sidebarFg",
  logoUrl: "theme.logoUrl",
} as const;

// -----------------------------------------------------------------------
// OAuth provider configuration
// -----------------------------------------------------------------------

/** OAuth provider IDs supported by the platform. */
export const OAUTH_PROVIDER_IDS = ["google", "facebook", "apple"] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

/** SiteContent keys used for OAuth provider storage. */
export const OAUTH_KEYS = {
  google: {
    enabled: "oauth.google.enabled",
    clientId: "oauth.google.clientId",
    clientSecret: "oauth.google.clientSecret",
  },
  facebook: {
    enabled: "oauth.facebook.enabled",
    clientId: "oauth.facebook.clientId",
    clientSecret: "oauth.facebook.clientSecret",
  },
  apple: {
    enabled: "oauth.apple.enabled",
    clientId: "oauth.apple.clientId",
    clientSecret: "oauth.apple.clientSecret",
  },
} as const;

/** Default OAuth provider settings — all disabled. */
export const OAUTH_DEFAULTS: Record<
  OAuthProviderId,
  { enabled: boolean; clientId: string; clientSecret: string }
> = {
  google: { enabled: false, clientId: "", clientSecret: "" },
  facebook: { enabled: false, clientId: "", clientSecret: "" },
  apple: { enabled: false, clientId: "", clientSecret: "" },
};

/** Environment variable names for OAuth providers (used as seed values for migration). */
export const OAUTH_ENV_KEYS: Record<
  OAuthProviderId,
  { id: string; secret: string }
> = {
  google: { id: "AUTH_GOOGLE_ID", secret: "AUTH_GOOGLE_SECRET" },
  facebook: { id: "AUTH_FACEBOOK_ID", secret: "AUTH_FACEBOOK_SECRET" },
  apple: { id: "AUTH_APPLE_ID", secret: "AUTH_APPLE_SECRET" },
};

/** Display labels for OAuth providers. */
export const OAUTH_LABELS: Record<OAuthProviderId, string> = {
  google: "Google",
  facebook: "Facebook",
  apple: "Apple",
};

// -----------------------------------------------------------------------
// Blog constraints
// -----------------------------------------------------------------------

/** Maximum blog image upload size in bytes (5 MB). */
export const MAX_BLOG_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepted blog image MIME types. */
export const ACCEPTED_BLOG_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** Blog posts per page for public listing. */
export const BLOG_POSTS_PER_PAGE = 12;

/** Maximum blog title length. */
export const MAX_BLOG_TITLE_LENGTH = 255;

/** Maximum blog excerpt length. */
export const MAX_BLOG_EXCERPT_LENGTH = 500;

/** Maximum blog content size (5 MB of HTML). */
export const MAX_BLOG_CONTENT_LENGTH = 5_000_000;

/** R2 key prefix for blog images — must be enforced on all image routes. */
export const BLOG_IMAGE_KEY_PREFIX = "blog-images/";

/** Blog image signed URL cache duration in seconds (10 minutes). */
export const BLOG_IMAGE_CACHE_SECONDS = 600;

/** Maximum blog video upload size in bytes (100 MB). */
export const MAX_BLOG_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

/** Accepted blog video MIME types. */
export const ACCEPTED_BLOG_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

/** R2 key prefix for blog videos. */
export const BLOG_VIDEO_KEY_PREFIX = "blog-videos/";

/** Category color presets (safe in both light and dark mode). */
export const BLOG_CATEGORY_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-red-100 text-red-700",
  "bg-purple-100 text-purple-700",
  "bg-slate-100 text-slate-700",
] as const;

/** Slug validation: only lowercase alphanumeric + hyphens, 3–200 chars. */
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Reserved slug values that cannot be used for blog posts. */
export const RESERVED_BLOG_SLUGS = new Set([
  "admin", "api", "null", "undefined", "new", "edit", "delete",
  "categories", "search", "feed", "rss", "sitemap",
]);

// -----------------------------------------------------------------------
// Thumbnail upload (video & playlist covers)
// -----------------------------------------------------------------------

/** Maximum thumbnail upload size in bytes (5 MB). */
export const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepted thumbnail MIME types. */
export const ACCEPTED_THUMBNAIL_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** R2 key prefix for video thumbnails. */
export const VIDEO_THUMBNAIL_KEY_PREFIX = "video-thumbnails/";

/** R2 key prefix for playlist thumbnails. */
export const PLAYLIST_THUMBNAIL_KEY_PREFIX = "playlist-thumbnails/";

/** Thumbnail signed URL cache duration in seconds (10 minutes). */
export const THUMBNAIL_CACHE_SECONDS = 600;

// -----------------------------------------------------------------------
// Logo upload
// -----------------------------------------------------------------------

/** Max logo upload size in bytes (2 MB). */
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

/** Accepted logo MIME types. */
export const ACCEPTED_LOGO_MIME_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/webp",
  "image/jpeg",
] as const;

// -----------------------------------------------------------------------
// Order / checkout constraints
// -----------------------------------------------------------------------

/** Order payment window in hours before auto-expiry. */
export const ORDER_EXPIRY_HOURS = 24;

/** Maximum payment slip file size in bytes (10 MB). */
export const MAX_SLIP_SIZE_BYTES = 10 * 1024 * 1024;

/** Accepted payment slip MIME types. */
export const ACCEPTED_SLIP_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** R2 key prefix for payment slip images. */
export const SLIP_KEY_PREFIX = "payment-slips/";

/** Maximum slip uploads per user per hour (rate limit). */
export const SLIP_UPLOAD_RATE_LIMIT = 5;

/** Expiry duration for slip signed URLs in seconds (15 minutes). */
export const SLIP_SIGNED_URL_EXPIRY = 900;

/** SiteContent keys for checkout bank details. */
export const CHECKOUT_KEYS = {
  bankName: "checkout.bank_name",
  accountNumber: "checkout.account_number",
  accountName: "checkout.account_name",
  promptpayId: "checkout.promptpay_id",
} as const;

/** Default bank detail values (shown until admin sets real values). */
export const CHECKOUT_DEFAULTS = {
  bankName: "กสิกรไทย (KBANK)",
  accountNumber: "XXX-X-XXXXX-X",
  accountName: "ชื่อ นามสกุล",
  promptpayId: "",
} as const;
