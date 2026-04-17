/**
 * Thumbnail URL resolution utilities.
 *
 * Centralises the logic for converting an R2 key (or legacy external URL)
 * into a display-ready URL.  Server actions call `resolveThumbnailUrl` when
 * building public-facing types so that components never need to know whether
 * a thumbnail is stored in R2 or externally.
 */

/** Build the proxy URL for an R2-stored thumbnail. */
export function thumbnailProxyUrl(key: string): string {
  return `/api/thumbnails/${key}`;
}

/**
 * Resolve the best available thumbnail URL.
 *
 * Priority:
 *  1. `thumbnailKey` (R2-stored) → proxy URL
 *  2. `thumbnailUrl` (legacy external URL) → used as-is
 *  3. `null` — no thumbnail
 */
export function resolveThumbnailUrl(
  thumbnailKey: string | null | undefined,
  thumbnailUrl: string | null | undefined,
): string | null {
  if (thumbnailKey) return thumbnailProxyUrl(thumbnailKey);
  if (thumbnailUrl) return thumbnailUrl;
  return null;
}
