import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaybackUrl } from "@/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await db.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = order.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slip = await db.paymentSlip.findUnique({ where: { orderId } });
  if (!slip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signedUrl = await getPlaybackUrl(slip.s3Key);
  return NextResponse.redirect(signedUrl);
}
