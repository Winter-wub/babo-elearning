import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

/**
 * Cron job to clean up old VerificationAttempt records.
 * Records older than 24 hours are no longer needed for rate limiting.
 *
 * Rate limiting window: 5 minutes
 * Retention period: 24 hours (5 minute window * 288 = plenty of buffer)
 *
 * Schedule: Run daily at 3 AM via cron
 */

// Only allow requests from localhost or with a valid cron secret
function isValidRequest(req: NextRequest): boolean {
  const host = req.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  // In production, require cron secret header
  if (!isLocalhost) {
    const cronSecret = req.headers.get("x-cron-secret");
    return cronSecret === process.env.CRON_SECRET;
  }

  return true;
}

export async function GET(req: NextRequest) {
  if (!isValidRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Calculate cutoff: delete records older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db.verificationAttempt.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    console.log(JSON.stringify({
      event: "cleanup_verification_attempts",
      deletedCount: result.count,
      cutoff: cutoff.toISOString(),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    console.error("Failed to cleanup verification attempts:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
