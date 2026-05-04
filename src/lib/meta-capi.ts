import { createHash } from "crypto";

const META_CAPI_ENDPOINT = "https://graph.facebook.com/v21.0";

interface MetaPurchaseParams {
  orderId: string;
  userId: string;
  totalSatang: number;
  fbClickId?: string | null;
  fbBrowserId?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  userEmail?: string | null;
  metaEventId?: string | null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

export async function trackMetaPurchase(params: MetaPurchaseParams): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return;
  }

  const url = `${META_CAPI_ENDPOINT}/${pixelId}/events`;

  const userData: Record<string, string> = {};
  if (params.fbClickId) userData.fbc = params.fbClickId;
  if (params.fbBrowserId) userData.fbp = params.fbBrowserId;
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;
  if (params.userEmail) userData.em = sha256(params.userEmail);
  userData.external_id = sha256(params.userId);

  const eventData: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: process.env.NEXT_PUBLIC_APP_URL ?? "https://englishwithgift.com",
    user_data: userData,
    custom_data: {
      value: params.totalSatang / 100,
      currency: "THB",
    },
  };

  if (params.metaEventId) {
    eventData.event_id = params.metaEventId;
  }

  const body: Record<string, unknown> = {
    data: [eventData],
    access_token: accessToken,
  };

  const testEventCode = process.env.META_TEST_EVENT_CODE;
  if (testEventCode) {
    body.test_event_code = testEventCode;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[Meta CAPI] Non-OK response:", res.status, text);
    }
  } catch (err) {
    console.error("[Meta CAPI] Failed to track purchase:", err);
  }
}
