import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle under .next/standalone.
  // The standalone output includes only the runtime dependencies needed to
  // serve the app, which keeps Docker images lean (~50–80 MB vs ~500 MB+).
  // The Dockerfile copies .next/standalone, .next/static, and public/ into
  // the final runner stage and starts the server with `node server.js`.
  output: "standalone",

  // Strict mode for catching common bugs early
  reactStrictMode: true,

  // Security and CORS headers
  async headers() {
    return [
      // Apply security headers to all routes
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // TODO(security/medium): Remove 'unsafe-eval' for production builds.
              // Use 'unsafe-eval' only in development; in production use nonce-based CSP.
              // Example: process.env.NODE_ENV === "development" ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline'"
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval required by Next.js dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https: https://lh3.googleusercontent.com https://graph.facebook.com https://platform-lookaside.fbsbx.com",
              "media-src 'self' blob: https://*.r2.cloudflarestorage.com",
              "connect-src 'self' https://*.r2.cloudflarestorage.com https://accounts.google.com https://graph.facebook.com https://appleid.apple.com",
              "font-src 'self'",
              "object-src 'none'",
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com https://www.facebook.com https://appleid.apple.com",
            ].join("; "),
          },
        ],
      },
      // CORS lockdown for video API routes
      {
        source: "/api/videos/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
};

export default nextConfig;
