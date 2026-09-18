/**
 * AI Caption Generator — Google Gemini API se post captions generate karo.
 *
 * Features:
 * - Topic/keyword se caption generate karo
 * - Platform-specific character limits follow karo
 * - Tone customize karo (professional, casual, funny, etc.)
 * - Hashtags automatically add karo
 *
 * Uses the `gemini-flash-latest` alias, which Google always points at
 * their current fastest GA model — this avoids hardcoding a specific
 * model version that could get deprecated later (Gemini model names
 * change frequently).
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
  tiktok: 2200,
  youtube: 5000,
  pinterest: 500,
  reddit: 40000,
  threads: 500,
  bluesky: 300,
  mastodon: 500,
  telegram: 4096,
  whatsapp: 4096,
  "google-business": 1500,
  google_business: 1500,
};

const TONE_PROMPTS: Record<string, string> = {
  professional: "Write in a professional, business-appropriate tone",
  casual: "Write in a casual, friendly tone like talking to a friend",
  funny: "Write in a humorous, witty tone that makes people smile",
  inspirational: "Write in an inspiring, motivational tone that uplifts readers",
  informative: "Write in an informative, educational tone that teaches something",
};

const GEMINI_MODEL = "gemini-flash-latest";

export async function generateCaption(
  params: GenerateCaptionParams
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
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
Only return the post text, nothing else. No quotes, no labels, no markdown formatting.`;

  const userPrompt = `Write a ${params.platform} post about: ${params.topic}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: Math.ceil(limit / 3), // rough token estimate
          temperature: 0.8,
        },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ?? `Gemini API failed: ${res.status}`
    );
  }

  const data = await res.json();
  const caption = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!caption) {
    // Gemini can refuse/empty-out on safety grounds — surface that clearly
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new Error(
      finishReason && finishReason !== "STOP"
        ? `Gemini did not return a caption (${finishReason})`
        : "No caption generated"
    );
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
