/**
 * GET /api/cron/publish
 *
 * Background scheduler — ye route periodically call hona chahiye
 * (Vercel Cron, external cron service, ya manual trigger).
 *
 * Ye sabhi "scheduled" posts nikalta hai jinka scheduled_for ab aa chuka hai,
 * aur unko publish karta hai.
 *
 * Vercel Cron setup (vercel.json me):
 * { "crons": [{ "path": "/api/cron/publish", "schedule": "* * * * *" }] }
 *
 * Security: CRON_SECRET env var se verify karo ki sirf authorized call ho.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  // 1. Cron secret check — sirf authorized callers allow karo
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Supabase admin client use karo (server-side, no auth needed)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Sabhi scheduled posts nikalo jinka time aa chuka hai
  const now = new Date().toISOString();
  const { data: duePosts, error: fetchErr } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now);

  if (fetchErr) {
    console.error("Cron: Failed to fetch scheduled posts:", fetchErr);
    return NextResponse.json(
      { error: "Failed to fetch scheduled posts" },
      { status: 500 }
    );
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({
      message: "No scheduled posts due for publishing.",
      published: 0,
    });
  }

  console.log(`Cron: Found ${duePosts.length} scheduled post(s) to publish.`);

  // 3. Har post ko publish karo
  const { publishPost } = await import("@/lib/publish/publish-post");
  const results: Array<{
    postId: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const post of duePosts) {
    try {
      console.log(`Cron: Publishing post ${post.id}...`);
      const outcomes = await publishPost(post.id);
      const anySuccess = outcomes.some((o) => o.status === "success");

      results.push({
        postId: post.id,
        success: anySuccess,
        error: anySuccess
          ? undefined
          : outcomes.map((o) => `${o.platform}: ${o.error}`).join("; "),
      });

      console.log(
        `Cron: Post ${post.id} — ${anySuccess ? "SUCCESS" : "FAILED"}`
      );
    } catch (err) {
      console.error(`Cron: Post ${post.id} error:`, err);
      results.push({
        postId: post.id,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });

      // Mark post as failed so it doesn't retry forever
      await supabase
        .from("posts")
        .update({ status: "failed" })
        .eq("id", post.id);
    }
  }

  const successCount = results.filter((r) => r.success).length;

  try {
    const { fetchPostAnalytics } = await import("@/lib/analytics/track");
    for (const result of results) {
      if (result.success) {
        await fetchPostAnalytics(result.postId);
      }
    }

    const { data: recentPublished } = await supabase
      .from("posts")
      .select("id")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(20);

    for (const post of recentPublished ?? []) {
      if (!results.some((r) => r.postId === post.id)) {
        await fetchPostAnalytics(post.id);
      }
    }
  } catch (err) {
    console.error("Cron: Analytics refresh error:", err);
  }

  // 4. Recurring posts process karo
  let recurringResult = { processed: 0, published: 0, failed: 0 };
  try {
    const { processRecurringPosts } = await import("@/lib/recurring/scheduler");
    recurringResult = await processRecurringPosts();
    console.log(
      `Cron: Recurring posts — ${recurringResult.published} published, ${recurringResult.failed} failed`
    );
  } catch (err) {
    console.error("Cron: Recurring posts error:", err);
  }

  return NextResponse.json({
    message: `Scheduled: ${results.length} post(s) (${successCount} ok). Recurring: ${recurringResult.processed} processed.`,
    scheduled: { total: results.length, success: successCount },
    recurring: recurringResult,
  });
}
