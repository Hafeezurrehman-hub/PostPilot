/**
 * Social Listening — Brand mentions aur competitor tracking.
 *
 * Twitter API se brand mentions, hashtags, aur competitor activity monitor karo.
 * Dashboard pe real-time dikha sakein.
 */

import { createClient } from "@supabase/supabase-js";

export interface BrandMention {
  id: string;
  platform: string;
  author: string;
  authorName: string;
  content: string;
  url: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

export interface ListeningQuery {
  id: string;
  user_id: string;
  query: string;          // e.g. "PostPilot", "#mybrand"
  platform: string;        // "twitter", "all"
  is_active: boolean;
  created_at: string;
}

/**
 * Brand mentions fetch karo Twitter se.
 */
export async function fetchBrandMentions(
  query: string,
  accessToken: string,
  count: number = 20
): Promise<BrandMention[]> {
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${count}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      console.error(`Twitter search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const users = data?.includes?.users ?? [];
    const tweets = data?.data ?? [];

    return tweets.map((tweet: Record<string, unknown>) => {
      const authorId = tweet.author_id as string;
      const author = users.find((u: Record<string, unknown>) => u.id === authorId);
      const metrics = tweet.public_metrics as Record<string, number>;

      return {
        id: tweet.id as string,
        platform: "twitter",
        author: author?.username ?? "unknown",
        authorName: author?.name ?? "Unknown",
        content: tweet.text as string,
        url: `https://twitter.com/${author?.username ?? "i"}/status/${tweet.id}`,
        publishedAt: tweet.created_at as string,
        sentiment: analyzeSentiment(tweet.text as string),
        engagement: {
          likes: metrics?.like_count ?? 0,
          retweets: metrics?.retweet_count ?? 0,
          replies: metrics?.reply_count ?? 0,
        },
      };
    });
  } catch (err) {
    console.error("Failed to fetch mentions:", err);
    return [];
  }
}

/**
 * Simple sentiment analysis — keywords based.
 * (Production me OpenAI ya dedicated API use karo)
 */
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();

  const positiveWords = [
    "love", "great", "awesome", "amazing", "excellent", "best", "fantastic",
    "wonderful", "perfect", "brilliant", "outstanding", "superb", "nice",
    "good", "like", "thanks", "thank", "helpful", "recommend", "impressed",
    "beautiful", "incredible", "exceptional", "phenomenal", "remarkable",
  ];

  const negativeWords = [
    "hate", "terrible", "awful", "worst", "horrible", "bad", "poor",
    "disappointing", "waste", "broken", "useless", "annoying", "frustrating",
    "ugly", "slow", "crash", "bug", "error", "fail", "suck", "sucks",
    "disappointed", "unfortunately", "problem", "issue", "complaint",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) positiveCount++;
  }

  for (const word of negativeWords) {
    if (lower.includes(word)) negativeCount++;
  }

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

/**
 * Listening query save karo DB me.
 */
export async function saveListeningQuery(
  userId: string,
  query: string,
  platform: string = "twitter"
): Promise<ListeningQuery> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("listening_queries")
    .insert({
      user_id: userId,
      query,
      platform,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ListeningQuery;
}

/**
 * User ki saari active listening queries nikalo.
 */
export async function getActiveQueries(userId: string): Promise<ListeningQuery[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("listening_queries")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw error;
  return (data ?? []) as ListeningQuery[];
}

/**
 * Aggregate sentiment summary nikalo.
 */
export function getSentimentSummary(mentions: BrandMention[]): {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positiveRate: number;
} {
  const positive = mentions.filter((m) => m.sentiment === "positive").length;
  const negative = mentions.filter((m) => m.sentiment === "negative").length;
  const neutral = mentions.filter((m) => m.sentiment === "neutral").length;
  const total = mentions.length;

  return {
    positive,
    negative,
    neutral,
    total,
    positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
  };
}
