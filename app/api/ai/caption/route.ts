/**
 * POST /api/ai/caption
 *
 * AI se caption generate karo.
 * Accepts either shape (for backward/forward compatibility):
 *   { topic, platform, tone?, includeHashtags? }
 *   { prompt, platforms, tone?, includeHashtags? }  ← what the New Post page actually sends
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateCaption, generateCaptionOptions } from "@/lib/ai/caption";

export async function POST(request: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: {
    topic?: string;
    platform?: string;
    prompt?: string;
    platforms?: string[];
    tone?: string;
    includeHashtags?: boolean;
    multiple?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // The New Post composer sends { prompt, platforms: [] } — normalize that
  // to the { topic, platform } shape the generator expects. When multiple
  // platforms are selected, target the one with the tightest character
  // limit so the caption fits everywhere it's being posted.
  const topic = body.topic ?? body.prompt;
  const platform = body.platform ?? body.platforms?.[0];

  if (!topic || !platform) {
    return NextResponse.json(
      { error: "topic/prompt and platform/platforms are required" },
      { status: 400 }
    );
  }

  try {
    if (body.multiple) {
      const options = await generateCaptionOptions({
        topic,
        platform,
        tone: body.tone as "professional" | "casual" | "funny" | "inspirational" | "informative",
        includeHashtags: body.includeHashtags,
      });
      return NextResponse.json({ options });
    } else {
      const caption = await generateCaption({
        topic,
        platform,
        tone: body.tone as "professional" | "casual" | "funny" | "inspirational" | "informative",
        includeHashtags: body.includeHashtags,
      });
      return NextResponse.json({ caption });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
