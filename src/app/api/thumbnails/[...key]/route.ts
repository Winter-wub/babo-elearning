import { NextRequest, NextResponse } from "next/server";
import { getPlaybackUrl } from "@/lib/r2";
import {
  VIDEO_THUMBNAIL_KEY_PREFIX,
  PLAYLIST_THUMBNAIL_KEY_PREFIX,
  THUMBNAIL_CACHE_SECONDS,
} from "@/lib/constants";

/**
 * Thumbnail proxy route.
 *
 * Generates a signed R2 GET URL for video/playlist thumbnails and 302-redirects.
 * Public — thumbnails are displayed on unauthenticated listing pages.
 *
 * SECURITY:
 * - Strict prefix validation: only serves keys under allowed thumbnail prefixes
 * - Pattern validation: key must match uuid/filename format
 */

/** Validate key matches: (video|playlist)-thumbnails/<uuid-like>/<filename> */
const KEY_PATTERN = /^(video|playlist)-thumbnails\/[a-z0-9-]+\/[a-zA-Z0-9._-]+$/;

/** Simple in-memory cache for signed URLs to reduce R2 signing calls. */
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = THUMBNAIL_CACHE_SECONDS * 1000;

function getCachedUrl(key: string): string | null {
  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  urlCache.delete(key);
  return null;
}

function setCachedUrl(key: string, url: string): void {
  urlCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
  if (urlCache.size > 1000) {
    const firstKey = urlCache.keys().next().value;
    if (firstKey) urlCache.delete(firstKey);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: keySegments } = await params;
  const key = keySegments.join("/");

  // SECURITY: Strict prefix check
  if (
    !key.startsWith(VIDEO_THUMBNAIL_KEY_PREFIX) &&
    !key.startsWith(PLAYLIST_THUMBNAIL_KEY_PREFIX)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // SECURITY: Pattern validation — prevent path traversal and enumeration
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    let signedUrl = getCachedUrl(key);
    if (!signedUrl) {
      signedUrl = await getPlaybackUrl(key);
      setCachedUrl(key, signedUrl);
    }

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": `public, max-age=${THUMBNAIL_CACHE_SECONDS}, stale-while-revalidate=${Math.floor(THUMBNAIL_CACHE_SECONDS / 2)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
  }
}
