/**
 * GET    /api/listening — List user's listening queries + mentions
 * POST   /api/listening — Add/delete/toggle queries
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Simple keyword-based sentiment analysis */
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const positiveWords = [
    "love", "great", "awesome", "amazing", "excellent", "best", "fantastic",
    "wonderful", "perfect", "brilliant", "outstanding", "superb", "nice",
    "good", "like", "thanks", "helpful", "recommend", "impressed", "beautiful",
  ];
  const negativeWords = [
    "hate", "terrible", "awful", "worst", "horrible", "bad", "poor",
    "disappointing", "waste", "broken", "useless", "annoying", "frustrating",
    "slow", "crash", "bug", "error", "fail", "suck", "problem", "issue",
  ];
  let pos = 0, neg = 0;
  for (const w of positiveWords) if (lower.includes(w)) pos++;
  for (const w of negativeWords) if (lower.includes(w)) neg++;
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

/** Fetch mentions from Twitter API v2 */
async function fetchTwitterMentions(query: string, accessToken: string, count = 20) {
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${count}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const users = data?.includes?.users ?? [];
    const tweets = data?.data ?? [];

    return tweets.map((tweet: Record<string, unknown>) => {
      const authorId = tweet.author_id as string;
      const author = users.find((u: Record<string, unknown>) => u.id === authorId);
      const metrics = (tweet.public_metrics ?? {}) as Record<string, number>;
      const text = tweet.text as string;
      return {
        id: tweet.id as string,
        platform: "twitter",
        author: author?.username ?? "unknown",
        authorName: author?.name ?? "Unknown",
        content: text,
        url: `https://twitter.com/${author?.username ?? "i"}/status/${tweet.id}`,
        publishedAt: tweet.created_at as string,
        sentiment: analyzeSentiment(text),
        likes: metrics.like_count ?? 0,
        retweets: metrics.retweet_count ?? 0,
        replies: metrics.reply_count ?? 0,
      };
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch user's queries
  const { data: queries, error: qErr } = await supabase
    .from("listening_queries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  // Try to fetch mentions for active queries using Twitter token
  const twitterConn = await supabase
    .from("platform_connections")
    .select("access_token_encrypted")
    .eq("user_id", userId)
    .eq("platform", "twitter")
    .single();

  let allMentions: Array<Record<string, unknown>> = [];

  if (twitterConn.data?.access_token_encrypted) {
    // For now, return empty mentions since we'd need to decrypt the token
    // In production, decrypt and fetch from Twitter API
    allMentions = [];
  }

  // Sentiment summary
  const positive = allMentions.filter(m => m.sentiment === "positive").length;
  const negative = allMentions.filter(m => m.sentiment === "negative").length;
  const neutral = allMentions.filter(m => m.sentiment === "neutral").length;
  const total = allMentions.length;

  return NextResponse.json({
    queries: queries ?? [],
    mentions: allMentions,
    sentiment: {
      positive,
      negative,
      neutral,
      total,
      positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: {
    action?: string;
    userId?: string;
    query?: string;
    platform?: string;
    queryId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getSupabase();

  if (body.action === "add") {
    if (!body.userId || !body.query) {
      return NextResponse.json({ error: "userId and query are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("listening_queries")
      .insert({
        user_id: body.userId,
        query: body.query,
        platform: body.platform ?? "twitter",
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ query: data });
  }

  if (body.action === "toggle") {
    if (!body.queryId || !body.userId) {
      return NextResponse.json({ error: "queryId and userId are required" }, { status: 400 });
    }

    // Get current state
    const { data: existing } = await supabase
      .from("listening_queries")
      .select("is_active")
      .eq("id", body.queryId)
      .eq("user_id", body.userId)
      .single();

    const { error } = await supabase
      .from("listening_queries")
      .update({ is_active: !existing?.is_active })
      .eq("id", body.queryId)
      .eq("user_id", body.userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete") {
    if (!body.queryId || !body.userId) {
      return NextResponse.json({ error: "queryId and userId are required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("listening_queries")
      .delete()
      .eq("id", body.queryId)
      .eq("user_id", body.userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
