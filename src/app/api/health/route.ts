// =============================================================================
// GET /api/health — liveness probe for Docker HEALTHCHECK and load balancers
//
// Returns 200 { status: "ok" } when the Next.js server is running.
// This route intentionally does NOT check database connectivity so that
// a DB outage does not cause the container to be marked unhealthy and
// restarted in a loop — use a separate readiness probe for DB checks.
// =============================================================================

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // never cache; always re-evaluate

export function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
