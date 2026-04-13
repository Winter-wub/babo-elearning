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
