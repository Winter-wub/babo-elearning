import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "ตั้งรหัสผ่านใหม่",
  // Keep the reset token (carried in the URL fragment) out of any outbound
  // Referer headers emitted by subresources on this page.
  other: { referrer: "no-referrer" },
};

/**
 * /reset-password
 *
 * The reset token is delivered via the URL fragment (`#t=...`). Fragments
 * never leave the browser — they are absent from access logs, the Referer
 * header, and webserver analytics — so this page is intentionally static
 * and the token is read client-side by ResetPasswordForm.
 */
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
