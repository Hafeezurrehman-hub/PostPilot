/**
 * AI Caption Generator — OpenAI API se post captions generate karo.
 *
 * Features:
 * - Topic/keyword se caption generate karo
 * - Platform-specific character limits follow karo
 * - Tone customize karo (professional, casual, funny, etc.)
 * - Hashtags automatically add karo
 */

export interface GenerateCaptionParams {
  topic: string;
  platform: string;
  tone?: "professional" | "casual" | "funny" | "inspirational" | "informative";
  includeHashtags?: boolean;
  maxLength?: number;
  brandVoicePrompt?: string;  // From Brand Voice Profile
}

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
};

const TONE_PROMPTS: Record<string, string> = {
  professional: "Write in a professional, business-appropriate tone",
  casual: "Write in a casual, friendly tone like talking to a friend",
  funny: "Write in a humorous, witty tone that makes people smile",
  inspirational: "Write in an inspiring, motivational tone that uplifts readers",
  informative: "Write in an informative, educational tone that teaches something",
};

export async function generateCaption(
  params: GenerateCaptionParams
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const limit = params.maxLength ?? PLATFORM_LIMITS[params.platform] ?? 280;
  const tone = TONE_PROMPTS[params.tone ?? "casual"];
  const hashtagInstruction = params.includeHashtags
    ? "Include 3-5 relevant hashtags at the end."
    : "Do not include any hashtags.";

  const voiceInstructions = params.brandVoicePrompt
    ? `\nAdditional brand voice instructions:\n${params.brandVoicePrompt}`
    : "";

  const systemPrompt = `You are a social media content creator. Write engaging posts for ${params.platform}.
${tone}. Keep it under ${limit} characters.
${hashtagInstruction}${voiceInstructions}
Only return the post text, nothing else. No quotes, no labels.`;

  const userPrompt = `Write a ${params.platform} post about: ${params.topic}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: Math.ceil(limit / 2), // Approximate token count
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ?? `OpenAI API failed: ${res.status}`
    );
  }

  const data = await res.json();
  const caption = data?.choices?.[0]?.message?.content?.trim();

  if (!caption) {
    throw new Error("No caption generated");
  }

  return caption.slice(0, limit);
}

/**
 * Multiple caption options generate karo (user ko choose karne ke liye).
 */
export async function generateCaptionOptions(
  params: GenerateCaptionParams,
  count: number = 3
): Promise<string[]> {
  const results: string[] = [];

  // Parallel calls for speed
  const promises = Array.from({ length: count }, () =>
    generateCaption(params).catch(() => null)
  );

  const resolved = await Promise.all(promises);

  for (const caption of resolved) {
    if (caption && !results.includes(caption)) {
      results.push(caption);
    }
  }

  return results;
}
