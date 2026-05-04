import { NextRequest, NextResponse } from "next/server";
import { getPlaybackUrl } from "@/lib/r2";
import { db } from "@/lib/db";
import { CONTENT_BLOCK_KEY_PREFIX, CONTENT_BLOCK_CACHE_SECONDS } from "@/lib/constants";

/**
 * Content block file proxy route.
 *
 * Generates a signed R2 GET URL for content block images, videos, and PDFs
 * and 302-redirects to it. Public — these files appear on the public playlist page.
 *
 * SECURITY:
 * - Strict prefix validation: only serves keys under content-blocks/
 * - Pattern validation: key must match uuid/filename format
 * - DB ownership check: key must belong to a block in an active playlist
 */

/** Validate key matches: content-blocks/<hex-uuid>/<filename> */
const KEY_PATTERN = /^content-blocks\/[a-f0-9]+\/[a-zA-Z0-9._-]+$/;

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
  const key = keySegments.join("/");

  if (!key.startsWith(CONTENT_BLOCK_KEY_PREFIX)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const block = await db.playlistContentBlock.findFirst({
    where: { s3Key: key, playlist: { isActive: true } },
    select: { id: true },
  });
  if (!block) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
