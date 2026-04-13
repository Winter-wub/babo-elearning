import { redirect } from "next/navigation";

/**
 * Resend verification page is no longer needed — registration now uses
 * inline OTP verification. Redirect to the register page.
 */
export default function ResendVerificationPage() {
  redirect("/register");
}
