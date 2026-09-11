/**
 * POST /api/posts/schedule
 *
 * Post schedule karne pe QStash mein exact-time job enqueue karo.
 * QStash us time pe /api/cron/publish ko call karega.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import { Client } from "@upstash/qstash";

export async function POST(request: NextRequest) {
  const { postId, scheduledFor } = await request.json();

  if (!postId || !scheduledFor) {
    return NextResponse.json({ error: "postId and scheduledFor required" }, { status: 400 });
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
