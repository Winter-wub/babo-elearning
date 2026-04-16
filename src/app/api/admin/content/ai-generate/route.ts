import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { chatComplete } from "@/lib/ai/workers-ai";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { buildContentGenMessages } from "@/lib/ai/content-prompt-builder";
import type { ContentGenOptions } from "@/lib/ai/content-prompt-builder";

// -----------------------------------------------------------------------
// Request schema
// -----------------------------------------------------------------------

const GenerateRequestSchema = z.object({
  mode: z.enum(["section", "field"]),
  prefix: z.string().min(1).max(50),
  sectionLabel: z.string().max(200),
  fields: z
    .array(
      z.object({
        key: z.string().min(1).max(255),
        currentValue: z.string().max(5000),
        fieldType: z.enum(["text", "color", "richtext", "long"]),
      })
    )
    .min(1)
    .max(30),
  targetFieldKey: z.string().max(255).optional(),
  tone: z.enum([
    "formal",
    "casual",
    "energetic",
    "friendly",
    "professional",
    "minimal",
  ]),
  language: z.enum(["th", "en"]),
  additionalInstructions: z.string().max(500).default(""),
});

// -----------------------------------------------------------------------
// JSON extraction helpers
// -----------------------------------------------------------------------

/**
 * Try to parse raw LLM output as JSON.
 * Falls back to extracting a JSON object from markdown fences or raw text.
 */
function extractJson(raw: string): Record<string, string> | null {
  const trimmed = raw.trim();

  // 1. Direct parse
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // continue to fallback
  }

  // 2. Extract from markdown fences: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      // continue
    }
  }

  // 3. Extract first {...} block
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      // give up
    }
  }

  return null;
}

// -----------------------------------------------------------------------
// POST handler
// -----------------------------------------------------------------------

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
      { error: "AI is currently disabled" },
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
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const options: ContentGenOptions = parsed.data;

  try {
    // 5. Build prompt and call AI
    const messages = buildContentGenMessages(options);
    const rawResponse = await chatComplete(messages, 2048);

    // 6. Extract JSON from response
    const generated = extractJson(rawResponse);
    if (!generated) {
      console.error("[AI Content] Failed to parse JSON:", rawResponse);
      return NextResponse.json(
        {
          success: false,
          error:
            "AI ไม่สามารถสร้างเนื้อหาในรูปแบบที่ถูกต้อง กรุณาลองใหม่",
        },
        { status: 422 }
      );
    }

    // 7. Filter to only allowed keys, sanitize values
    const allowedFields = new Map(
      options.fields.map((f) => [f.key, f.fieldType])
    );
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(generated)) {
      if (!allowedFields.has(key)) continue;
      let strValue = String(value ?? "");

      const fieldType = allowedFields.get(key)!;

      // Sanitize richtext: strip dangerous tags/attributes
      if (fieldType === "richtext") {
        strValue = strValue
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
          .replace(/\bon\w+\s*=/gi, "data-removed=")
          .replace(/javascript:/gi, "");
      }

      // Validate color fields: must be valid hex
      if (fieldType === "color" && !/^#[0-9A-Fa-f]{6}$/.test(strValue)) {
        continue; // Skip invalid colors rather than apply broken values
      }

      result[key] = strValue;
    }

    return NextResponse.json({ success: true, generated: result });
  } catch (err) {
    console.error("[AI Content] Error:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
