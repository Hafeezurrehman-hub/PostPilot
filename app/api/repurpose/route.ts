/**
 * POST /api/repurpose — Repurpose text content or URL into platform posts
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: {
    content?: string;
    url?: string;
    platforms?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content && !body.url) {
    return NextResponse.json(
      { error: "content or url is required" },
      { status: 400 }
    );
  }

  if (!body.platforms || body.platforms.length === 0) {
    return NextResponse.json(
      { error: "At least one platform is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI not configured. Add OPENAI_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  try {
    // If URL provided, extract content first
    let content = body.content ?? "";

    if (body.url && !content) {
      const res = await fetch(body.url);
      const html = await res.text();
      content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10000);
    }

    if (!content) {
      return NextResponse.json(
        { error: "Could not extract content from URL" },
        { status: 400 }
      );
    }

    // Platform-specific configs
    const PLATFORM_CONFIGS: Record<string, { maxChars: number; instruction: string; count: number }> = {
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

    const allPosts: Array<{
      platform: string;
      content: string;
      charCount: number;
      type: "post" | "thread";
    }> = [];

    for (const platform of body.platforms) {
      const config = PLATFORM_CONFIGS[platform];
      if (!config) continue;

      const systemPrompt = `You are a social media content repurposer. 
Convert the given content into ${config.count} separate ${platform} posts.
${config.instruction}
Each post must be under ${config.maxChars} characters.
Return each post separated by "---POST---".
Only return the posts, no explanations.`;

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
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

      if (!aiRes.ok) {
        console.error(`AI generation failed for ${platform}: ${aiRes.status}`);
        continue;
      }

      const data = await aiRes.json();
      const text = data?.choices?.[0]?.message?.content ?? "";
      const parts = text
        .split("---POST---")
        .map((p: string) => p.trim())
        .filter(Boolean);

      allPosts.push(
        ...parts.map((part: string) => ({
          platform,
          content: part.slice(0, config.maxChars),
          charCount: part.length,
          type: platform === "twitter" && parts.length > 1 ? ("thread" as const) : ("post" as const),
        }))
      );
    }

    return NextResponse.json({
      posts: allPosts,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Repurpose error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
