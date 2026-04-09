/**
 * Email HTML templates for the e-learning platform.
 * Pure functions — no side effects, no imports from Next.js runtime.
 */
import { APP_NAME } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Email verification template
// ---------------------------------------------------------------------------

interface VerificationEmailOptions {
  name: string;
  url: string;
}

export function verificationEmailTemplate({ name, url }: VerificationEmailOptions): string {
  const appName = APP_NAME;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ยืนยันอีเมลของคุณ — ${appName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #18181b; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: -0.025em; }
    .body { padding: 40px; }
    .body p { margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6; }
    .body p.greeting { font-size: 16px; color: #18181b; font-weight: 500; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; padding: 12px 32px; background-color: #18181b; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.01em; }
    .note { font-size: 13px !important; color: #71717a !important; }
    .url-fallback { word-break: break-all; color: #2563eb !important; font-size: 13px; }
    .footer { background-color: #f4f4f5; padding: 20px 40px; text-align: center; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${appName}</h1>
    </div>
    <div class="body">
      <p class="greeting">สวัสดีคุณ ${name},</p>
      <p>ขอบคุณที่สมัครสมาชิกกับ <strong>${appName}</strong> กรุณาคลิกปุ่มด้านล่างเพื่อยืนยันที่อยู่อีเมลของคุณและเริ่มต้นการเรียนรู้</p>
      <div class="btn-wrap">
        <a href="${url}" class="btn">ยืนยันอีเมล</a>
      </div>
      <p class="note">ลิงก์นี้มีอายุ <strong>24 ชั่วโมง</strong> หากคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
      <p class="note">หากปุ่มด้านบนใช้งานไม่ได้ กรุณาคัดลอก URL ด้านล่างแล้วเปิดในเบราว์เซอร์:</p>
      <p><a href="${url}" class="url-fallback">${url}</a></p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${appName}. สงวนสิทธิ์ทุกประการ.
    </div>
  </div>
</body>
</html>`;
}

export function verificationEmailSubject(): string {
  return `[${APP_NAME}] ยืนยันที่อยู่อีเมลของคุณ`;
}
