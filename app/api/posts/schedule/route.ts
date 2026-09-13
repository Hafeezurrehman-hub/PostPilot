/**
 * POST /api/posts/schedule
 *
 * Post schedule karne pe QStash mein exact-time job enqueue karo.
 * QStash us time pe /api/cron/publish ko call karega.
 *
 * Security: only the authenticated owner of the post can schedule it.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Client } from "@upstash/qstash";

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

export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId, scheduledFor } = await request.json();

  if (!postId || !scheduledFor) {
    return NextResponse.json({ error: "postId and scheduledFor required" }, { status: 400 });
  }

  // Verify this post exists and belongs to the authenticated user
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", postId)
    .single();

  if (postErr || !post || post.user_id !== user.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const scheduleTime = new Date(scheduledFor);
  if (isNaN(scheduleTime.getTime()) || scheduleTime <= new Date()) {
    return NextResponse.json({ error: "scheduledFor must be a future date" }, { status: 400 });
  }

  // QStash client
  const qstashToken = process.env.QSTASH_TOKEN;
  if (!qstashToken) {
    return NextResponse.json({ error: "QSTASH_TOKEN not configured" }, { status: 500 });
  }

  const client = new Client({ token: qstashToken });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://postpilot-ashen.vercel.app";

  // Delay in seconds from now
  const delaySeconds = Math.floor((scheduleTime.getTime() - Date.now()) / 1000);

  await client.publishJSON({
    url: `${appUrl}/api/cron/publish`,
    body: { postId },
    delay: delaySeconds,
  });

  return NextResponse.json({ success: true, scheduledFor, delaySeconds });
}
