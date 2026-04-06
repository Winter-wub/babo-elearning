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
// Application metadata
// -----------------------------------------------------------------------

export const APP_NAME = "E Learning";
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
