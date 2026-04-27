import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaybackUrl } from "@/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const slip = await db.paymentSlip.findUnique({ where: { orderId } });
  if (!slip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signedUrl = await getPlaybackUrl(slip.s3Key);
  return NextResponse.redirect(signedUrl);
}
