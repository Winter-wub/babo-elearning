import { NextRequest, NextResponse } from "next/server";
import { getPlaybackUrl } from "@/lib/r2";
import { BLOG_IMAGE_KEY_PREFIX, BLOG_IMAGE_CACHE_SECONDS, BLOG_VIDEO_KEY_PREFIX } from "@/lib/constants";

/**
 * Blog media proxy route (images and videos).
 *
 * Generates a signed R2 GET URL for blog media and 302-redirects.
 * Uses aggressive caching since blog content is public.
 *
 * SECURITY:
 * - Strict prefix validation: only serves keys under "blog-images/" or "blog-videos/"
 * - Pattern validation: key must match UUID/filename format
 * - No auth required (blog content is public)
 */

/** Validate key matches: blog-(images|videos)/<uuid-like>/<filename> */
const KEY_PATTERN = /^blog-(images|videos)\/[a-z0-9-]+\/[a-zA-Z0-9._-]+$/;

/** Simple in-memory cache for signed URLs to reduce R2 signing calls. */
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = BLOG_IMAGE_CACHE_SECONDS * 1000;

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
  // Prevent unbounded growth — evict oldest entries
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

  // SECURITY: Strict prefix check — never serve non-blog R2 objects
  if (!key.startsWith(BLOG_IMAGE_KEY_PREFIX) && !key.startsWith(BLOG_VIDEO_KEY_PREFIX)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // SECURITY: Pattern validation — prevent path traversal and enumeration
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    // Check in-memory cache first
    let signedUrl = getCachedUrl(key);
    if (!signedUrl) {
      signedUrl = await getPlaybackUrl(key);
      setCachedUrl(key, signedUrl);
    }

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": `public, max-age=${BLOG_IMAGE_CACHE_SECONDS}, stale-while-revalidate=${Math.floor(BLOG_IMAGE_CACHE_SECONDS / 2)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
