export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_AI_API_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN;
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

function getApiUrl() {
  if (!CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID is not set");
  }
  return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;
}

/**
 * Calls Cloudflare Workers AI with streaming enabled.
 * Returns a ReadableStream of text chunks.
 */
export async function streamChat(
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  if (!CLOUDFLARE_AI_API_TOKEN) {
    throw new Error("CLOUDFLARE_AI_API_TOKEN is not set");
  }

  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_AI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      stream: true,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Workers AI request failed (${response.status}): ${errorText}`
    );
  }

  if (!response.body) {
    throw new Error("Workers AI returned no response body");
  }

  return response.body;
}

/**
 * Parses the SSE stream from Workers AI into text chunks.
 * Workers AI returns `data: {"response":"..."}` lines.
 */
export async function* parseWorkersAIStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last partial line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6); // Remove "data: " prefix
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          if (parsed.response) {
            yield parsed.response;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
