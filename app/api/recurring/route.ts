/**
 * GET  /api/recurring — User ke recurring posts list karo
 * POST /api/recurring — Naya recurring post create karo
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function GET() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: posts, error } = await supabase
    .from("recurring_posts")
    .select("*")
    .eq("user_id", user.id)
    .order("next_run_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    content?: string;
    media_url?: string;
    platforms?: string[];
    frequency?: string;
    interval_count?: number;
    days_of_week?: number[];
    day_of_month?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content || !body.platforms?.length || !body.frequency) {
    return NextResponse.json(
      { error: "content, platforms, and frequency are required" },
      { status: 400 }
    );
  }

  if (!["daily", "weekly", "monthly"].includes(body.frequency)) {
    return NextResponse.json(
      { error: "frequency must be daily, weekly, or monthly" },
      { status: 400 }
    );
  }

  // Calculate first run (start from now + interval)
  const now = new Date();
  let firstRun = new Date(now);

  switch (body.frequency) {
    case "daily":
      firstRun.setDate(firstRun.getDate() + (body.interval_count ?? 1));
      break;
    case "weekly":
      firstRun.setDate(firstRun.getDate() + 7 * (body.interval_count ?? 1));
      break;
    case "monthly":
      firstRun.setMonth(firstRun.getMonth() + (body.interval_count ?? 1));
      break;
  }

  const { data, error } = await supabase
    .from("recurring_posts")
    .insert({
      user_id: user.id,
      content: body.content,
      media_url: body.media_url ?? null,
      platforms: body.platforms ?? [],
      frequency: body.frequency,
      interval_count: body.interval_count ?? 1,
      days_of_week: body.days_of_week ?? null,
      day_of_month: body.day_of_month ?? null,
      next_run_at: firstRun.toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

/**
 * PATCH — Toggle active/inactive
 * DELETE — Recurring post delete karo
 */
export async function PATCH(request: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("recurring_posts")
    .update({ is_active: body.is_active })
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("recurring_posts")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
