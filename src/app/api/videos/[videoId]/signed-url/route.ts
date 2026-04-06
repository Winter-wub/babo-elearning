import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaybackUrl } from "@/lib/r2";
import { SIGNED_URL_EXPIRY } from "@/lib/constants";
import { getPermissionTimeStatus } from "@/lib/permission-utils";

// ---------------------------------------------------------------------------
// Rate limiting (TODO: implement before going to production)
// ---------------------------------------------------------------------------
// This endpoint generates a signed R2 URL on every call.  Without rate limiting
// a compromised session or a brute-force loop could generate thousands of valid
// short-lived URLs in seconds.
//
// Recommended approach (Upstash Ratelimit + Redis, or Vercel KV):
//
//   import { Ratelimit } from "@upstash/ratelimit";
//   import { Redis }     from "@upstash/redis";
//
//   const ratelimit = new Ratelimit({
//     redis: Redis.fromEnv(),
//     limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 req/min per user
//   });
//
//   const { success } = await ratelimit.limit(`signed-url:${session.user.id}`);
//   if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
//
// Place the check immediately after step 1 (authentication).
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  // -----------------------------------------------------------------------
  // 1. Authenticate — must have a valid session
  // -----------------------------------------------------------------------
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "ไม่มีสิทธิ์" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  // -----------------------------------------------------------------------
  // 2. Validate Origin / Referer to prevent hotlinking from other origins.
  //    Both headers are checked because browsers send Origin on cross-origin
  //    requests and Referer on same-origin navigations, but not always both.
  // -----------------------------------------------------------------------
  const appUrl = (process.env.APP_URL ?? process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Allow the request if either Origin exactly matches or Referer starts with the app URL.
  // In server-side rendering / direct API calls the headers may be absent, which we
  // treat as a forbidden request so bots cannot trivially retrieve signed URLs.
  const isValidOrigin =
    origin === appUrl || (referer != null && referer.startsWith(appUrl));

  if (!isValidOrigin) {
    return NextResponse.json(
      { error: "ไม่อนุญาต" },
      {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  // -----------------------------------------------------------------------
  // 3. Resolve videoId from dynamic segment
  // -----------------------------------------------------------------------
  const { videoId } = await params;

  // -----------------------------------------------------------------------
  // 4. Verify the video exists and is active
  // -----------------------------------------------------------------------
  const video = await db.video.findUnique({
    where: { id: videoId, isActive: true },
    select: { id: true, s3Key: true },
  });

  if (!video) {
    return NextResponse.json(
      { error: "ไม่พบวิดีโอ" },
      {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  // -----------------------------------------------------------------------
  // 5. Authorise — STUDENT needs an explicit VideoPermission row that is
  //               currently valid (time-based check); ADMIN bypasses.
  // -----------------------------------------------------------------------
  if (session.user.role === "STUDENT") {
    const permission = await db.videoPermission.findUnique({
      where: {
        userId_videoId: { userId: session.user.id, videoId },
      },
      select: { id: true, validFrom: true, validUntil: true },
    });

    if (!permission) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const timeStatus = getPermissionTimeStatus(permission);
    if (timeStatus === "expired") {
      return NextResponse.json(
        { error: "สิทธิ์หมดอายุแล้ว" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (timeStatus === "not_yet_active") {
      return NextResponse.json(
        { error: "สิทธิ์ยังไม่เริ่มใช้งาน" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  // -----------------------------------------------------------------------
  // 6. Generate a short-lived signed R2 URL for playback
  // -----------------------------------------------------------------------
  const signedUrl = await getPlaybackUrl(video.s3Key);

  // expiresAt is a Unix timestamp (ms) the client can use to schedule refresh
  const expiresAt = Date.now() + SIGNED_URL_EXPIRY * 1000;

  return NextResponse.json(
    { url: signedUrl, expiresAt },
    {
      status: 200,
      headers: {
        // Never cache signed URLs — each response must be freshly generated
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
