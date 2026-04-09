/**
 * Nodemailer transporter using Mailjet SMTP.
 * The transporter is created lazily on the first sendEmail call so that
 * importing this module in tests (or build steps) does NOT throw when
 * SMTP credentials are absent.
 *
 * Required environment variables:
 *   MAILJET_SMTP_HOST   — default: in-v3.mailjet.com
 *   MAILJET_SMTP_PORT   — default: 587
 *   MAILJET_SMTP_USER   — Mailjet API Key (public key)
 *   MAILJET_SMTP_PASS   — Mailjet Secret Key
 *   MAIL_FROM_EMAIL     — sender address
 *   MAIL_FROM_NAME      — sender display name
 */
import nodemailer from "nodemailer";
import { APP_NAME } from "@/lib/constants";

function getTransporter() {
  const globalForMailer = globalThis as unknown as {
    mailer: ReturnType<typeof nodemailer.createTransport> | undefined;
  };

  if (globalForMailer.mailer) return globalForMailer.mailer;

  const host = process.env.MAILJET_SMTP_HOST ?? "in-v3.mailjet.com";
  const port = parseInt(process.env.MAILJET_SMTP_PORT ?? "587", 10);
  const user = process.env.MAILJET_SMTP_USER;
  const pass = process.env.MAILJET_SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      "MAILJET_SMTP_USER and MAILJET_SMTP_PASS environment variables must be set."
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForMailer.mailer = transporter;
  }

  return transporter;
}

// ---------------------------------------------------------------------------
// Public helper
// ---------------------------------------------------------------------------

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const transporter = getTransporter();

  const fromEmail =
    process.env.MAIL_FROM_EMAIL ??
    `noreply@${new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost").hostname}`;
  const fromName = process.env.MAIL_FROM_NAME ?? APP_NAME;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
}

