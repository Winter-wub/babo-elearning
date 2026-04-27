import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.order.updateMany({
    where: {
      status: OrderStatus.PENDING_PAYMENT,
      expiresAt: { lt: new Date() },
    },
    data: { status: OrderStatus.EXPIRED },
  });

  return NextResponse.json({ expired: result.count });
}
