import { sendTelegramMessage } from "@/lib/telegram";
import { sendEmail } from "@/lib/email";
import { formatPriceTHB } from "@/lib/order-utils";
import { APP_NAME } from "@/lib/constants";
import {
  orderSubmittedEmailTemplate,
  orderApprovedEmailTemplate,
  orderRejectedEmailTemplate,
} from "@/lib/email-templates";

interface NotifyNewSlipParams {
  orderNumber: string;
  orderId: string;
  studentName: string;
  studentEmail: string;
  totalSatang: number;
  courseTitles: string[];
}

export function notifyNewSlip(params: NotifyNewSlipParams): void {
  const { orderNumber, orderId, studentName, studentEmail, totalSatang, courseTitles } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const telegramMsg = [
    `🧾 <b>คำสั่งซื้อใหม่</b>`,
    ``,
    `หมายเลข: ${orderNumber}`,
    `นักเรียน: ${studentName} (${studentEmail})`,
    `ยอดรวม: ${formatPriceTHB(totalSatang)}`,
    `คอร์ส: ${courseTitles.join(", ")}`,
    ``,
    `<a href="${appUrl}/admin/orders/${orderId}">ตรวจสอบ →</a>`,
  ].join("\n");

  sendTelegramMessage(telegramMsg).catch(console.error);

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    sendEmail({
      to: adminEmail,
      subject: `[${APP_NAME}] คำสั่งซื้อใหม่ ${orderNumber} — ${formatPriceTHB(totalSatang)}`,
      html: `<p>มีคำสั่งซื้อใหม่จาก ${studentName} (${studentEmail})</p><p>ยอดรวม: ${formatPriceTHB(totalSatang)}</p><p><a href="${appUrl}/admin/orders/${orderId}">ตรวจสอบคำสั่งซื้อ</a></p>`,
    }).catch(console.error);
  }
}

interface NotifyOrderApprovedParams {
  studentEmail: string;
  studentName: string;
  orderNumber: string;
  courseTitles: string[];
  totalSatang: number;
}

export function notifyOrderApproved(params: NotifyOrderApprovedParams): void {
  const { studentEmail, studentName, orderNumber, courseTitles, totalSatang } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  sendEmail({
    to: studentEmail,
    subject: `[${APP_NAME}] ยืนยันการชำระเงินสำเร็จ — เข้าเรียนได้แล้ว!`,
    html: orderApprovedEmailTemplate({ name: studentName, orderNumber, courseTitles, totalSatang, dashboardUrl: `${appUrl}/dashboard` }),
  }).catch(console.error);

  const msg = `✅ อนุมัติ ${orderNumber} — ${studentName} (${formatPriceTHB(totalSatang)})`;
  sendTelegramMessage(msg).catch(console.error);
}

interface NotifyOrderRejectedParams {
  studentEmail: string;
  studentName: string;
  orderNumber: string;
  reason: string;
  orderId: string;
}

export function notifyOrderRejected(params: NotifyOrderRejectedParams): void {
  const { studentEmail, studentName, orderNumber, reason, orderId } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  sendEmail({
    to: studentEmail,
    subject: `[${APP_NAME}] หลักฐานการชำระเงินถูกปฏิเสธ — ${orderNumber}`,
    html: orderRejectedEmailTemplate({ name: studentName, orderNumber, reason, reuploadUrl: `${appUrl}/orders/${orderId}` }),
  }).catch(console.error);
}
