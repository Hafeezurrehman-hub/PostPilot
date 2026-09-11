/**
 * POST /api/cron/publish
 * GET  /api/cron/publish
 *
 * GET  — Vercel Cron (daily fallback) ya manual trigger
 * POST — QStash webhook (exact time scheduling)
 *
 * Security:
 *   GET  → CRON_SECRET header check
 *   POST → QStash signature verification
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Receiver } from "@upstash/qstash";

// ── QStash signature verifier ──────────────────────────────────────
function getReceiver() {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next    = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next) return null;
  return new Receiver({ currentSigningKey: current, nextSigningKey: next });
}

// ── Shared publish logic ───────────────────────────────────────────
async function runPublish(postId?: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();

  // If a specific postId is given (QStash job), publish only that post
  const query = supabase
    .from("posts")
    .select("*")
    .eq("status", "scheduled");

  const { data: duePosts, error: fetchErr } = postId
    ? await query.eq("id", postId)
    : await query.lte("scheduled_for", now);

  if (fetchErr) {
    console.error("Publish: Failed to fetch posts:", fetchErr);
    return { error: "Failed to fetch posts" };
  }

  if (!duePosts || duePosts.length === 0) {
    return { message: "No posts due.", published: 0 };
  }

  const { publishPost } = await import("@/lib/publish/publish-post");
  const results: Array<{ postId: string; success: boolean; error?: string }> = [];

  for (const post of duePosts) {
    try {
      const outcomes = await publishPost(post.id);
      const anySuccess = outcomes.some((o) => o.status === "success");
      results.push({
        postId: post.id,
        success: anySuccess,
        error: anySuccess ? undefined : outcomes.map((o) => `${o.platform}: ${o.error}`).join("; "),
      });
    } catch (err) {
      console.error(`Publish: Post ${post.id} error:`, err);
      results.push({
        postId: post.id,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      await supabase.from("posts").update({ status: "failed" }).eq("id", post.id);
    }
  }

  // Analytics refresh
  try {
    const { fetchPostAnalytics } = await import("@/lib/analytics/track");
    for (const r of results) {
      if (r.success) await fetchPostAnalytics(r.postId);
    }
  } catch (err) {
    console.error("Publish: Analytics error:", err);
  }

  // Recurring posts
  let recurringResult = { processed: 0, published: 0, failed: 0 };
  try {
    const { processRecurringPosts } = await import("@/lib/recurring/scheduler");
    recurringResult = await processRecurringPosts();
  } catch (err) {
    console.error("Publish: Recurring error:", err);
  }

  const successCount = results.filter((r) => r.success).length;
  return {
    message: `Published ${successCount}/${results.length}. Recurring: ${recurringResult.processed} processed.`,
    scheduled: { total: results.length, success: successCount },
    recurring: recurringResult,
  };
}

// ── GET — Vercel Cron / manual ─────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runPublish();
  return NextResponse.json(result);
}

// ── POST — QStash webhook ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  const receiver = getReceiver();

  if (receiver) {
    const body      = await request.text();
    const signature = request.headers.get("upstash-signature") ?? "";

    const isValid = await receiver.verify({
      signature,
      body,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/publish`,
    }).catch(() => false);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
    }

    // QStash body mein postId ho sakta hai
    let postId: string | undefined;
    try {
      const parsed = JSON.parse(body);
      postId = parsed.postId;
    } catch {
      // no postId — run full sweep
    }

    const result = await runPublish(postId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "QStash keys not configured" }, { status: 500 });
}
