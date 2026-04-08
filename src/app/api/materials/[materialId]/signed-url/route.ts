import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMaterialViewUrl, getMaterialDownloadUrl } from "@/lib/r2";
import { SIGNED_URL_EXPIRY, VIEWABLE_MATERIAL_TYPES } from "@/lib/constants";
import { getPermissionTimeStatus } from "@/lib/permission-utils";

/**
 * Constructs a download filename prefixed with the user's name.
 * e.g. "Alice Johnson" + "Notes.docx" → "Alice_Johnson_Notes.docx"
 */
function buildDownloadFilename(
  userName: string | null | undefined,
  originalFilename: string
): string {
  if (!userName?.trim()) return originalFilename;

  const safeName = userName
    .trim()
    .replace(/[^a-zA-Z0-9\u0E00-\u0E7F\s]/g, "")
    .replace(/\s+/g, "_");

  return `${safeName}_${originalFilename}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  // -----------------------------------------------------------------------
  // 1. Authenticate
  // -----------------------------------------------------------------------
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "ไม่มีสิทธิ์" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // -----------------------------------------------------------------------
  // 2. Validate Origin / Referer
  // -----------------------------------------------------------------------
  const appUrl = (
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const isValidOrigin =
    origin === appUrl || (referer != null && referer.startsWith(appUrl));

  if (!isValidOrigin) {
    return NextResponse.json(
      { error: "ไม่อนุญาต" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  // -----------------------------------------------------------------------
  // 3. Resolve materialId and mode
  // -----------------------------------------------------------------------
  const { materialId } = await params;
  const mode = request.nextUrl.searchParams.get("mode") ?? "download";

  // -----------------------------------------------------------------------
  // 4. Fetch material with parent video
  // -----------------------------------------------------------------------
  const material = await db.courseMaterial.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      s3Key: true,
      filename: true,
      contentType: true,
      video: {
        select: { id: true, isActive: true },
      },
    },
  });

  if (!material || !material.video.isActive) {
    return NextResponse.json(
      { error: "ไม่พบเอกสาร" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  // -----------------------------------------------------------------------
  // 5. Permission check — STUDENT needs VideoPermission for the parent video
  // -----------------------------------------------------------------------
  if (session.user.role === "STUDENT") {
    const permission = await db.videoPermission.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: material.video.id,
        },
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
  // 6. Generate signed URL based on mode
  // -----------------------------------------------------------------------
  const isViewable = (VIEWABLE_MATERIAL_TYPES as readonly string[]).includes(
    material.contentType
  );

  let signedUrl: string;

  if (mode === "view" && isViewable) {
    signedUrl = await getMaterialViewUrl(material.s3Key);
  } else {
    const downloadFilename = buildDownloadFilename(
      session.user.name,
      material.filename
    );
    signedUrl = await getMaterialDownloadUrl(material.s3Key, downloadFilename);
  }

  const expiresAt = Date.now() + SIGNED_URL_EXPIRY * 1000;

  return NextResponse.json(
    { url: signedUrl, expiresAt, mode: mode === "view" && isViewable ? "view" : "download" },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
