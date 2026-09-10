/**
 * POST /api/ai/caption
 *
 * AI se caption generate karo.
 * Body: { topic, platform, tone?, includeHashtags? }
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
    tone?: string;
    includeHashtags?: boolean;
    multiple?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.topic || !body.platform) {
    return NextResponse.json(
      { error: "topic and platform are required" },
      { status: 400 }
    );
  }

  try {
    if (body.multiple) {
      // Multiple options generate karo
      const options = await generateCaptionOptions({
        topic: body.topic,
        platform: body.platform,
        tone: body.tone as "professional" | "casual" | "funny" | "inspirational" | "informative",
        includeHashtags: body.includeHashtags,
      });
      return NextResponse.json({ options });
    } else {
      // Single caption generate karo
      const caption = await generateCaption({
        topic: body.topic,
        platform: body.platform,
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
