import DashboardNav from "@/components/DashboardNav";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // User ke posts nikalo with analytics
  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, platforms, status, created_at, published_at")
    .eq("user_id", user?.id ?? "")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);

  const postIds = (posts ?? []).map((p) => p.id);

  // Analytics data nikalo
  const { data: analytics } = await supabase
    .from("post_analytics")
    .select("*")
    .in("post_id", postIds.length > 0 ? postIds : [""]);

  // Har post ke liye aggregated metrics
  const postMetrics = (posts ?? []).map((post) => {
    const postAnalytics = (analytics ?? []).filter((a) => a.post_id === post.id);
    const totalImpressions = postAnalytics.reduce((s, a) => s + (a.impressions ?? 0), 0);
    const totalEngagements = postAnalytics.reduce((s, a) => s + (a.engagements ?? 0), 0);
    const totalLikes = postAnalytics.reduce((s, a) => s + (a.likes ?? 0), 0);
    const totalComments = postAnalytics.reduce((s, a) => s + (a.comments ?? 0), 0);
    const totalShares = postAnalytics.reduce((s, a) => s + (a.shares ?? 0), 0);

    return {
      ...post,
      impressions: totalImpressions,
      engagements: totalEngagements,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      engagementRate: totalImpressions > 0
        ? Math.round((totalEngagements / totalImpressions) * 100 * 100) / 100
        : 0,
      platformsCount: postAnalytics.length,
    };
  });

  // Overall stats
  const totalImpressions = postMetrics.reduce((s, p) => s + p.impressions, 0);
  const totalEngagements = postMetrics.reduce((s, p) => s + p.engagements, 0);
  const totalLikes = postMetrics.reduce((s, p) => s + p.likes, 0);
  const totalComments = postMetrics.reduce((s, p) => s + p.comments, 0);
  const totalShares = postMetrics.reduce((s, p) => s + p.shares, 0);
  const avgEngagementRate = totalImpressions > 0
    ? Math.round((totalEngagements / totalImpressions) * 100 * 100) / 100
    : 0;

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={user?.email} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track how your posts perform across platforms.
        </p>

        {/* Overview cards */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Posts" value={postMetrics.length.toString()} />
          <StatCard label="Impressions" value={formatNumber(totalImpressions)} />
          <StatCard label="Engagements" value={formatNumber(totalEngagements)} />
          <StatCard label="Engagement Rate" value={`${avgEngagementRate}%`} />
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Likes" value={formatNumber(totalLikes)} />
          <StatCard label="Comments" value={formatNumber(totalComments)} />
          <StatCard label="Shares" value={formatNumber(totalShares)} />
        </div>

        {/* Per-post breakdown */}
        <div className="mt-10">
          <h2 className="text-sm font-medium text-slate-300 mb-4">Post Performance</h2>
          {postMetrics.length === 0 ? (
            <div className="rounded-lg border border-slate-800 px-5 py-14 text-center">
              <p className="text-sm text-slate-400">No published posts yet.</p>
              <Link
                href="/dashboard/new"
                className="mt-3 inline-block text-sm text-indigo-400 hover:text-indigo-300"
              >
                Create your first post →
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 divide-y divide-slate-800">
              {postMetrics.map((post) => (
                <div key={post.id} className="px-5 py-4">
                  <p className="text-sm text-slate-200 line-clamp-1">{post.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>👁 {formatNumber(post.impressions)} views</span>
                    <span>❤️ {formatNumber(post.likes)} likes</span>
                    <span>💬 {formatNumber(post.comments)} comments</span>
                    <span>🔄 {formatNumber(post.shares)} shares</span>
                    <span className="text-indigo-400">{post.engagementRate}% engagement</span>
                    <span className="text-slate-600">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
