const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

function isConfigured(): boolean {
  return Boolean(BOT_TOKEN && CHAT_ID);
}

export async function sendTelegramMessage(text: string): Promise<void> {
  if (!isConfigured()) return;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
  });
}

export async function sendTelegramPhoto(photoUrl: string, caption?: string): Promise<void> {
  if (!isConfigured()) return;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, photo: photoUrl, caption, parse_mode: "HTML" }),
  });
}
