import { NextRequest, NextResponse } from "next/server";
import { getPlaybackUrl } from "@/lib/r2";
import { CONTENT_BLOCK_CACHE_SECONDS } from "@/lib/constants";

/**
 * Marketing-assets file proxy route.
 *
 * Generates a signed R2 GET URL for marketing-assets/* objects and
 * 302-redirects to it. Public — these files appear on the public About
 * page (instructor photo, intro video, student photos, etc.) and are
 * never tied to a per-row DB record, so there is no ownership check.
 *
 * SECURITY:
 * - Strict prefix validation: only serves keys under marketing-assets/
 * - Pattern validation: uuid (with dashes) + sanitized filename
 *
 * Modeled on src/app/api/content-blocks/[...key]/route.ts.
 */

const MARKETING_ASSETS_PREFIX = "marketing-assets/";

/** Validate key: marketing-assets/<uuid>/<sanitized-filename> */
const KEY_PATTERN =
  /^marketing-assets\/[a-f0-9-]{36}\/[a-zA-Z0-9._-]+$/;

/** Validate URL path: <uuid>/<sanitized-filename> (without prefix) */
const PATH_PATTERN = /^[a-f0-9-]{36}\/[a-zA-Z0-9._-]+$/;

const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = CONTENT_BLOCK_CACHE_SECONDS * 1000;

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
    const now = Date.now();
    for (const [k, v] of urlCache) {
      if (v.expiresAt <= now) urlCache.delete(k);
    }
    if (urlCache.size > 1000) {
      const firstKey = urlCache.keys().next().value;
      if (firstKey) urlCache.delete(firstKey);
    }
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: keySegments } = await params;
  const path = keySegments.join("/");

  // Accept clean path (<uuid>/<file>) and prepend the prefix server-side.
  // Legacy doubled URLs (marketing-assets/<uuid>/<file>) keep working too.
  const key = path.startsWith(MARKETING_ASSETS_PREFIX)
    ? path
    : `${MARKETING_ASSETS_PREFIX}${path}`;

  if (!KEY_PATTERN.test(key) && !PATH_PATTERN.test(path)) {
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
        "Cache-Control": `public, max-age=${CONTENT_BLOCK_CACHE_SECONDS}, stale-while-revalidate=${Math.floor(CONTENT_BLOCK_CACHE_SECONDS / 2)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

const METHOD_NOT_ALLOWED = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });

export const POST = METHOD_NOT_ALLOWED;
export const PUT = METHOD_NOT_ALLOWED;
export const PATCH = METHOD_NOT_ALLOWED;
export const DELETE = METHOD_NOT_ALLOWED;
