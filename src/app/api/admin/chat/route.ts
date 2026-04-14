import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { streamChat, parseWorkersAIStream } from "@/lib/ai/workers-ai";
import { buildSystemPrompt } from "@/lib/ai/context-builder";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import type { ChatMessage } from "@/lib/ai/workers-ai";

const MAX_HISTORY_MESSAGES = 20;

const ChatRequestSchema = z.object({
  conversationId: z.string().nullable().optional(),
  message: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  // 1. Auth — ADMIN only
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  // 2. Feature flag
  if (process.env.NEXT_PUBLIC_AI_CHAT_ENABLED !== "true") {
    return NextResponse.json(
      { error: "AI Chat is currently disabled" },
      { status: 503 }
    );
  }

  // 3. Rate limit
  const rateLimit = checkRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `กรุณารอ ${rateLimit.retryAfterSeconds} วินาที` },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  // 4. Validate input
  const body = await request.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อความไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const { conversationId, message } = parsed.data;
  const adminId = session.user.id;

  try {
    // 5. Load or create conversation
    let convId = conversationId;
    if (convId) {
      // Verify ownership
      const existing = await db.adminChatConversation.findUnique({
        where: { id: convId, adminId },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "ไม่พบการสนทนา" },
          { status: 404 }
        );
      }
    } else {
      const conv = await db.adminChatConversation.create({
        data: {
          adminId,
          title: message.slice(0, 100),
        },
      });
      convId = conv.id;
    }

    // 6. Save user message
    await db.adminChatMessage.create({
      data: { conversationId: convId, role: "user", content: message },
    });

    // 7. Load conversation history (most recent N messages, then reverse to chronological)
    const historyDesc = await db.adminChatMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY_MESSAGES,
      select: { role: true, content: true },
    });
    const history = historyDesc.reverse();

    // 8. Build messages array for LLM
    const systemPrompt = await buildSystemPrompt();
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // 9. Stream from Workers AI
    const aiStream = await streamChat(messages);

    // 10. Transform into SSE and collect full response
    let fullResponse = "";
    const encoder = new TextEncoder();

    const outputStream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID as first event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`)
          );

          for await (const chunk of parseWorkersAIStream(aiStream)) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }

          // Send done event
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));

          // Save the full AI response to DB
          if (fullResponse) {
            await db.adminChatMessage.create({
              data: {
                conversationId: convId!,
                role: "assistant",
                content: fullResponse,
              },
            });
          }
        } catch (err) {
          console.error("[AI Chat] Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(outputStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[AI Chat] Error:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในระบบ" },
      { status: 500 }
    );
  }
}
