import type { ChatMessage } from "./workers-ai";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type FieldType = "text" | "color" | "richtext" | "long";

export type Tone =
  | "formal"
  | "casual"
  | "energetic"
  | "friendly"
  | "professional"
  | "minimal";

export type Language = "th" | "en";

export interface ContentGenOptions {
  mode: "section" | "field";
  prefix: string;
  sectionLabel: string;
  fields: {
    key: string;
    currentValue: string;
    fieldType: FieldType;
  }[];
  targetFieldKey?: string;
  tone: Tone;
  language: Language;
  additionalInstructions: string;
}

// -----------------------------------------------------------------------
// Tone descriptions (used inside the prompt)
// -----------------------------------------------------------------------

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  formal: "formal and respectful, suitable for academic or official context",
  casual: "casual and conversational, approachable everyday language",
  energetic: "energetic and exciting, motivational with strong action words",
  friendly: "warm and friendly, welcoming and supportive",
  professional: "professional and confident, clear and trustworthy",
  minimal: "minimal and concise, short impactful phrases",
};

// -----------------------------------------------------------------------
// Field type hints
// -----------------------------------------------------------------------

function fieldTypeHint(fieldType: FieldType): string {
  switch (fieldType) {
    case "color":
      return "MUST be a valid 6-digit hex color (e.g. #1a2b3c)";
    case "richtext":
      return "HTML content using <p>, <strong>, <em> tags only";
    case "long":
      return "1-3 sentences of plain text";
    case "text":
      return "short plain text (a few words to one sentence)";
  }
}

// -----------------------------------------------------------------------
// Prompt builder
// -----------------------------------------------------------------------

export function buildContentGenMessages(
  options: ContentGenOptions
): ChatMessage[] {
  const {
    mode,
    sectionLabel,
    fields,
    targetFieldKey,
    tone,
    language,
    additionalInstructions,
  } = options;

  const langLabel = language === "th" ? "Thai" : "English";
  const toneDesc = TONE_DESCRIPTIONS[tone];

  // Build field schema description
  const targetFields =
    mode === "field" && targetFieldKey
      ? fields.filter((f) => f.key === targetFieldKey)
      : fields;

  const fieldLines = targetFields
    .map(
      (f) =>
        `  "${f.key}": ${fieldTypeHint(f.fieldType)} — current value: ${JSON.stringify(f.currentValue || "(empty)")}`
    )
    .join("\n");

  const expectedKeys = targetFields.map((f) => `"${f.key}"`).join(", ");

  // System prompt — kept concise for the 8B model
  const systemPrompt = [
    "You are a content writer for an e-learning English language platform website.",
    `Write in ${langLabel}. Tone: ${toneDesc}.`,
    "",
    "RULES:",
    "1. Respond with ONLY valid JSON. No explanation, no markdown fences, no extra text.",
    `2. The JSON object must have exactly these keys: ${expectedKeys}`,
    "3. Each value must match its field type constraint described below.",
    "4. Do NOT include any key not listed.",
    "",
    "FIELD SCHEMA:",
    fieldLines,
  ].join("\n");

  // User prompt
  const userLines: string[] = [
    `Generate new content for the "${sectionLabel}" section of the website.`,
  ];

  if (mode === "field" && targetFieldKey) {
    userLines.push(
      `Focus only on the field "${targetFieldKey}".`
    );
  }

  if (additionalInstructions.trim()) {
    userLines.push(`Additional instructions: ${additionalInstructions.trim()}`);
  }

  userLines.push("", "Return the JSON now:");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userLines.join("\n") },
  ];
}
