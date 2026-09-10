/**
 * Content Repurposing — Long content se multiple social posts banao.
 *
 * Blog post, article, ya kisi bhi long content ko:
 * - Multiple Twitter threads me convert karo
 * - LinkedIn post banao
 * - Instagram caption banao
 * - Facebook post banao
 *
 * AI-powered: OpenAI GPT-4o-mini se generate hota hai.
 */

export interface RepurposedPost {
  platform: string;
  content: string;
  charCount: number;
  type: "post" | "thread" | "carousel";
}

export interface RepurposeResult {
  original: string;
  posts: RepurposedPost[];
  generatedAt: string;
}

const PLATFORM_CONFIGS = {
  twitter: {
    maxChars: 280,
    instruction: "Break into a Twitter thread (each tweet ≤280 chars). Number them 1/, 2/, etc. Keep punchy and engaging.",
    count: 5,
  },
  linkedin: {
    maxChars: 3000,
    instruction: "Write a professional LinkedIn post. Start with a hook line, add value, end with a CTA. Use short paragraphs.",
    count: 2,
  },
  instagram: {
    maxChars: 2200,
    instruction: "Write an Instagram caption. Start with a hook, tell a story, end with CTA and hashtags. Include 5-10 relevant hashtags at the end.",
    count: 2,
  },
  facebook: {
    maxChars: 63206,
    instruction: "Write a Facebook post. Conversational tone, ask questions to drive engagement. Keep it under 500 chars for best reach.",
    count: 2,
  },
};

/**
 * Content ko multiple platform posts me convert karo.
 */
export async function repurposeContent(
  content: string,
  platforms: string[]
): Promise<RepurposeResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const allPosts: RepurposedPost[] = [];

  for (const platform of platforms) {
    const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
    if (!config) continue;

    const posts = await generatePlatformPosts(apiKey, content, platform, config);
    allPosts.push(...posts);
  }

  return {
    original: content,
    posts: allPosts,
    generatedAt: new Date().toISOString(),
  };
}

async function generatePlatformPosts(
  apiKey: string,
  content: string,
  platform: string,
  config: { maxChars: number; instruction: string; count: number }
): Promise<RepurposedPost[]> {
  const systemPrompt = `You are a social media content repurposer. 
Convert the given content into ${config.count} separate ${platform} posts.
${config.instruction}
Each post must be under ${config.maxChars} characters.
Return each post separated by "---POST---".
Only return the posts, no explanations.`;

  try {
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
          { role: "user", content },
        ],
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      console.error(`AI generation failed for ${platform}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";

    // Split by separator
    const parts = text.split("---POST---").map((p: string) => p.trim()).filter(Boolean);

    return parts.map((part: string) => ({
      platform,
      content: part.slice(0, config.maxChars),
      charCount: part.length,
      type: platform === "twitter" && parts.length > 1 ? "thread" as const : "post" as const,
    }));
  } catch (err) {
    console.error(`Repurpose error for ${platform}:`, err);
    return [];
  }
}

/**
 * URL se article content extract karo phir repurpose karo.
 */
export async function repurposeUrl(
  url: string,
  platforms: string[]
): Promise<RepurposeResult> {
  // Simple fetch + text extraction
  try {
    const res = await fetch(url);
    const html = await res.text();

    // Basic HTML to text (strip tags)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000); // Limit to 10K chars

    return repurposeContent(text, platforms);
  } catch (err) {
    throw new Error(`Failed to fetch URL: ${err instanceof Error ? err.message : "Unknown"}`);
  }
}
