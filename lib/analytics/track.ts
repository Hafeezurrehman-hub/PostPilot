/**
 * Analytics — Post performance tracking.
 *
 * Har platform se engagement data fetch karo aur DB me store karo.
 * Dashboard pe analytics dikha sakein.
 */

import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/crypto/tokens";

export interface PostAnalytics {
  impressions: number;
  engagements: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
}

export interface AggregatedStats {
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
}

/**
 * Ek post ke liye analytics fetch karo sabhi platforms se.
 */
export async function fetchPostAnalytics(
  postId: string
): Promise<Record<string, PostAnalytics>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Post data + results nikalo
  const { data: post } = await supabase
    .from("posts")
    .select("*, post_results(*)")
    .eq("id", postId)
    .single();

  if (!post) return {};

  const analytics: Record<string, PostAnalytics> = {};

  for (const result of post.post_results ?? []) {
    if (result.status !== "success" || !result.platform_post_id) continue;

    // Har platform ke liye metrics fetch karo
    const metrics = await fetchPlatformMetrics(
      result.platform,
      result.platform_post_id,
      post.user_id
    );
    if (metrics) {
      analytics[result.platform] = metrics;
    }
  }

  // DB me save karo
  for (const [platform, metrics] of Object.entries(analytics)) {
    await supabase.from("post_analytics").upsert(
      {
        post_id: postId,
        platform,
        impressions: metrics.impressions,
        engagements: metrics.engagements,
        clicks: metrics.clicks,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        reach: metrics.reach,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "post_id,platform" }
    );
  }

  return analytics;
}

/**
 * User ke sabhi posts ka aggregated stats nikalo.
 */
export async function getUserStats(userId: string): Promise<AggregatedStats> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: posts } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", userId);

  const { data: analytics } = await supabase
    .from("post_analytics")
    .select("impressions, engagements, likes, comments, shares")
    .in("post_id", (posts ?? []).map((p) => p.id));

  const totalImpressions = (analytics ?? []).reduce((s, a) => s + (a.impressions ?? 0), 0);
  const totalEngagements = (analytics ?? []).reduce((s, a) => s + (a.engagements ?? 0), 0);
  const totalLikes = (analytics ?? []).reduce((s, a) => s + (a.likes ?? 0), 0);
  const totalComments = (analytics ?? []).reduce((s, a) => s + (a.comments ?? 0), 0);
  const totalShares = (analytics ?? []).reduce((s, a) => s + (a.shares ?? 0), 0);

  return {
    totalPosts: (posts ?? []).length,
    totalImpressions,
    totalEngagements,
    totalLikes,
    totalComments,
    totalShares,
    avgEngagementRate:
      totalImpressions > 0
        ? Math.round((totalEngagements / totalImpressions) * 100 * 100) / 100
        : 0,
  };
}

// ============================================================
// Platform-specific metric fetching
// ============================================================

async function fetchPlatformMetrics(
  platform: string,
  platformPostId: string,
  userId: string
): Promise<PostAnalytics | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: conn } = await supabase
    .from("platform_connections")
    .select("access_token")
    .eq("user_id", userId)
    .eq("platform", platform)
    .single();

  if (!conn) return null;

  const accessToken = decryptSecret(conn.access_token);
  if (!accessToken) return null;

  try {
    switch (platform) {
      case "twitter":
        return fetchTwitterMetrics(accessToken, platformPostId);
      case "linkedin":
        return fetchLinkedInMetrics(accessToken, platformPostId);
      case "facebook":
        return fetchFacebookMetrics(accessToken, platformPostId);
      case "instagram":
        return fetchInstagramMetrics(accessToken, platformPostId);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function fetchTwitterMetrics(
  accessToken: string,
  tweetId: string
): Promise<PostAnalytics | null> {
  const res = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const m = data?.data?.public_metrics;
  if (!m) return null;

  return {
    impressions: m.impression_count ?? 0,
    engagements: m.like_count + m.retweet_count + m.reply_count + (m.quote_count ?? 0),
    clicks: m.url_link_clicks ?? 0,
    likes: m.like_count ?? 0,
    comments: m.reply_count ?? 0,
    shares: (m.retweet_count ?? 0) + (m.quote_count ?? 0),
    reach: m.impression_count ?? 0,
  };
}

async function fetchLinkedInMetrics(
  accessToken: string,
  postId: string
): Promise<PostAnalytics | null> {
  const res = await fetch(
    `https://api.linkedin.com/v2/socialActions/${postId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  return {
    impressions: 0, // LinkedIn API doesn't expose impressions via this endpoint
    engagements: (data?.likesSummary?.totalLikes ?? 0) + (data?.commentsSummary?.totalFirstLevelComments ?? 0),
    clicks: 0,
    likes: data?.likesSummary?.totalLikes ?? 0,
    comments: data?.commentsSummary?.totalFirstLevelComments ?? 0,
    shares: 0,
    reach: 0,
  };
}

async function fetchFacebookMetrics(
  accessToken: string,
  postId: string
): Promise<PostAnalytics | null> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${postId}?fields=insights.post_impressions,insights.post_engaged_users,insights.post_reactions_by_type_total&access_token=${accessToken}`
  );
  if (!res.ok) return null;

  const data = await res.json();
  const insights = data?.insights?.data ?? [];

  const impressions = getInsightValue(insights, "post_impressions");
  const engagedUsers = getInsightValue(insights, "post_engaged_users");

  return {
    impressions,
    engagements: engagedUsers,
    clicks: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    reach: engagedUsers,
  };
}

async function fetchInstagramMetrics(
  accessToken: string,
  mediaId: string
): Promise<PostAnalytics | null> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}?fields=insights.impressions,insights.engagement,insights.saved&access_token=${accessToken}`
  );
  if (!res.ok) return null;

  const data = await res.json();
  const insights = data?.insights?.data ?? [];

  return {
    impressions: getInsightValue(insights, "impressions"),
    engagements: getInsightValue(insights, "engagement"),
    clicks: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    reach: getInsightValue(insights, "impressions"),
  };
}

function getInsightValue(insights: Array<{ name: string; values: Array<{ value: number }> }>, name: string): number {
  const insight = insights.find((i) => i.name === name);
  return insight?.values?.[0]?.value ?? 0;
}
