/**
 * GET    /api/brand-voice — List user's brand voice profiles
 * POST   /api/brand-voice — Create or set default
 * DELETE /api/brand-voice — Delete a profile
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("brand_voice_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profiles: data ?? [] });
}

export async function POST(request: NextRequest) {
  let body: {
    action?: string;
    userId?: string;
    profile?: Record<string, unknown>;
    profileId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getSupabase();

  if (body.action === "create" && body.userId && body.profile) {
    const p = body.profile;

    // If setting as default, unset other defaults first
    if (p.isDefault) {
      await supabase
        .from("brand_voice_profiles")
        .update({ is_default: false })
        .eq("user_id", body.userId)
        .eq("is_default", true);
    }

    const { data, error } = await supabase
      .from("brand_voice_profiles")
      .insert({
        user_id: body.userId,
        name: p.name,
        tone: p.tone ?? "casual",
        keywords: p.keywords ?? [],
        avoid_words: p.avoidWords ?? [],
        examples: p.examples ?? [],
        hashtag_style: p.hashtagStyle ?? "moderate",
        emoji_usage: p.emojiUsage ?? "moderate",
        language: p.language ?? "english",
        description: p.description ?? "",
        is_default: p.isDefault ?? false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ profile: data });
  }

  if (body.action === "setDefault" && body.userId && body.profileId) {
    // Unset all defaults
    await supabase
      .from("brand_voice_profiles")
      .update({ is_default: false })
      .eq("user_id", body.userId)
      .eq("is_default", true);

    // Set new default
    const { error } = await supabase
      .from("brand_voice_profiles")
      .update({ is_default: true })
      .eq("id", body.profileId)
      .eq("user_id", body.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  let body: { id?: string; userId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || !body.userId) {
    return NextResponse.json({ error: "id and userId are required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("brand_voice_profiles")
    .delete()
    .eq("id", body.id)
    .eq("user_id", body.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
