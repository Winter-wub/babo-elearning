/**
 * Shared email verification utilities.
 */

/**
 * Build the email verification URL from a token.
 */
export function buildVerificationUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/verify-email?token=${token}`;
}
