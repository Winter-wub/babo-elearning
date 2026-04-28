import { NextResponse } from "next/server";

// Next.js generates a unique BUILD_ID during each build
// DigitalOcean App Platform provides SOURCE_COMMIT at runtime (git commit SHA)
// In standalone mode, we read from the environment or generate one
const BUILD_ID =
  process.env.SOURCE_COMMIT ||
  process.env.NEXT_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  Date.now().toString();

export async function GET() {
  return new NextResponse(BUILD_ID, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}