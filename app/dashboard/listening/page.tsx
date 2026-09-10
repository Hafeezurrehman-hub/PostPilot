"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/lib/toast-context";
import { createClient } from "@/lib/supabase/client";
import { platformIcon, platformColor } from "@/components/PlatformIcons";

/* ─── Types ─── */
interface ListeningQuery {
  id: string;
  user_id: string;
  query: string;
  platform: string;
  is_active: boolean;
  created_at: string;
}

interface Mention {
  id: string;
  platform: string;
  author: string;
  authorName: string;
  content: string;
  url: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  likes: number;
  retweets: number;
  replies: number;
}

interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positiveRate: number;
}

const SENTIMENT_CONFIG = {
  positive: { emoji: "😊", label: "Positive", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  negative: { emoji: "😟", label: "Negative", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  neutral: { emoji: "😐", label: "Neutral", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
};

const PLATFORM_OPTIONS = [
  { value: "twitter", label: "Twitter" },
  { value: "all", label: "All platforms" },
];

/* ─── Page ─── */
export default function ListeningPage() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userId, setUserId] = useState("");
  const [queries, setQueries] = useState<ListeningQuery[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [sentiment, setSentiment] = useState<SentimentSummary>({ positive: 0, negative: 0, neutral: 0, total: 0, positiveRate: 0 });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  // Add query form
  const [newQuery, setNewQuery] = useState("");
  const [newPlatform, setNewPlatform] = useState("twitter");
  const [adding, setAdding] = useState(false);

  // Filter
  const [filter, setFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");

  const { toast } = useToast();
  const router = useRouter();

  const loadData = useCallback(async (uid: string) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/listening?userId=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setQueries(data.queries ?? []);
        setMentions(data.mentions ?? []);
        setSentiment(data.sentiment ?? { positive: 0, negative: 0, neutral: 0, total: 0, positiveRate: 0 });
      }
    } catch { /* silent */ }
    setLoading(false);
    setFetching(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email);
      setUserId(user.id);
      await loadData(user.id);
    };
    init();
  }, [router, loadData]);

  const handleAddQuery = async () => {
    if (!newQuery.trim()) { toast("Enter a search term", "error"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", userId, query: newQuery, platform: newPlatform }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed", "error");
      } else {
        toast(`Now tracking "${newQuery}"`, "success");
        setNewQuery("");
        await loadData(userId);
      }
    } catch { toast("Network error", "error"); }
    setAdding(false);
  };

  const handleToggleQuery = async (queryId: string) => {
    try {
      await fetch("/api/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", userId, queryId }),
      });
      setQueries(prev => prev.map(q => q.id === queryId ? { ...q, is_active: !q.is_active } : q));
    } catch { toast("Failed", "error"); }
  };

  const handleDeleteQuery = async (queryId: string) => {
    try {
      await fetch("/api/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", userId, queryId }),
      });
      toast("Query removed", "success");
      setQueries(prev => prev.filter(q => q.id !== queryId));
    } catch { toast("Failed", "error"); }
  };

  const filteredMentions = filter === "all" ? mentions : mentions.filter(m => m.sentiment === filter);

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Social Listening</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track brand mentions, sentiment, and competitor activity.
            </p>
          </div>
        </div>

        {/* ─── Sentiment Overview ─── */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SentimentCard label="Total Mentions" value={sentiment.total} emoji="📊" />
          <SentimentCard label="Positive" value={sentiment.positive} emoji="😊" color="text-emerald-400" />
          <SentimentCard label="Negative" value={sentiment.negative} emoji="😟" color="text-rose-400" />
          <SentimentCard label="Positive Rate" value={`${sentiment.positiveRate}%`} emoji="📈" color="text-indigo-400" />
        </div>

        {/* Sentiment bar */}
        {sentiment.total > 0 && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-slate-500">Sentiment breakdown</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden flex">
              {sentiment.positive > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(sentiment.positive / sentiment.total) * 100}%` }}
                />
              )}
              {sentiment.neutral > 0 && (
                <div
                  className="h-full bg-slate-500 transition-all duration-500"
                  style={{ width: `${(sentiment.neutral / sentiment.total) * 100}%` }}
                />
              )}
              {sentiment.negative > 0 && (
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${(sentiment.negative / sentiment.total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[10px] text-emerald-400">● Positive ({sentiment.positive})</span>
              <span className="text-[10px] text-slate-400">● Neutral ({sentiment.neutral})</span>
              <span className="text-[10px] text-rose-400">● Negative ({sentiment.negative})</span>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left: Queries Panel ─── */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-slate-300">Tracking queries</h2>
                <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                  {queries.length}
                </span>
              </div>

              {/* Add query */}
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  value={newQuery}
                  onChange={e => setNewQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddQuery()}
                  placeholder="e.g., @yourbrand, #yourproduct"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <select
                    value={newPlatform}
                    onChange={e => setNewPlatform(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PLATFORM_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddQuery}
                    disabled={adding || !newQuery.trim()}
                    className="shrink-0 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {adding ? "..." : "Add"}
                  </button>
                </div>
              </div>

              {/* Query list */}
              {queries.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-500">No tracking queries yet</p>
                  <p className="text-[10px] text-slate-600 mt-1">Add a brand name, hashtag, or competitor to start tracking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queries.map(q => {
                    const Icon = platformIcon(q.platform === "all" ? "twitter" : q.platform);
                    return (
                      <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {Icon && <Icon className="w-3 h-3 text-slate-500 shrink-0" />}
                            <span className="text-xs text-white truncate">{q.query}</span>
                          </div>
                          <span className="text-[10px] text-slate-600">{q.platform}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleQuery(q.id)}
                            className={`w-6 h-4 rounded-full transition-colors relative ${
                              q.is_active ? "bg-emerald-500" : "bg-slate-700"
                            }`}
                          >
                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                              q.is_active ? "left-3" : "left-0.5"
                            }`} />
                          </button>
                          <button
                            onClick={() => handleDeleteQuery(q.id)}
                            className="text-[10px] text-slate-600 hover:text-rose-400 px-1 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Info */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Mentions are fetched from Twitter API. Connect your Twitter account in{" "}
                  <a href="/dashboard/connect" className="text-indigo-400 hover:text-indigo-300">Accounts</a>{" "}
                  to enable live tracking.
                </p>
              </div>
            </div>
          </div>

          {/* ─── Right: Mentions Feed ─── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-slate-300">Mentions</h2>
              <div className="flex items-center gap-2">
                {/* Filter buttons */}
                {(["all", "positive", "negative", "neutral"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                      filter === f
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {f === "all" ? "All" : SENTIMENT_CONFIG[f].emoji} {f !== "all" && SENTIMENT_CONFIG[f].label}
                  </button>
                ))}
                <button
                  onClick={() => loadData(userId)}
                  disabled={fetching}
                  className="text-[11px] text-slate-500 hover:text-indigo-400 px-2 py-1 rounded transition-colors disabled:opacity-50"
                >
                  {fetching ? "↻ Loading..." : "↻ Refresh"}
                </button>
              </div>
            </div>

            {fetching && mentions.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-slate-800/30 animate-pulse" />)}
              </div>
            ) : filteredMentions.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 py-16 text-center">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm text-slate-400">No mentions found yet</p>
                <p className="text-xs text-slate-600 mt-1">
                  {queries.length === 0
                    ? "Add a tracking query on the left to get started"
                    : "Connect your Twitter account and add queries to start tracking"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMentions.map(mention => (
                  <MentionCard key={mention.id} mention={mention} />
                ))}
              </div>
            )}

            {/* ─── Competitor Tracking Info ─── */}
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h3 className="text-sm font-medium text-slate-300">💡 How Social Listening works</h3>
              <ul className="mt-3 space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
                  <span className="text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">Add queries</span> — Track your brand name, product names, hashtags, or competitor names
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
                  <span className="text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">Monitor mentions</span> — See who&apos;s talking about you across social platforms
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
                  <span className="text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">Analyze sentiment</span> — Automatic positive/negative/neutral classification
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">⚡</span>
                  <span className="text-xs text-slate-400">
                    <span className="text-slate-300 font-medium">Track competitors</span> — Add competitor brand names to see what people say about them
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── Components ─── */

function SentimentCard({
  label,
  value,
  emoji,
  color = "text-white",
}: {
  label: string;
  value: number | string;
  emoji: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={`mt-1.5 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function MentionCard({ mention }: { mention: Mention }) {
  const config = SENTIMENT_CONFIG[mention.sentiment];
  const Icon = platformIcon(mention.platform);
  const brandColor = platformColor(mention.platform);

  const timeAgo = (() => {
    const diff = Date.now() - new Date(mention.publishedAt).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  })();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" style={{ color: brandColor }} />}
          <div>
            <span className="text-xs font-medium text-white">{mention.authorName}</span>
            <span className="text-xs text-slate-500 ml-1.5">@{mention.author}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${config.bg} ${config.color} ${config.border}`}>
            {config.emoji} {config.label}
          </span>
          <span className="text-[10px] text-slate-600">{timeAgo}</span>
        </div>
      </div>

      {/* Content */}
      <p className="text-xs text-slate-300 leading-relaxed mb-3">{mention.content}</p>

      {/* Engagement + Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span>❤️ {mention.likes}</span>
          <span>🔁 {mention.retweets}</span>
          <span>💬 {mention.replies}</span>
        </div>
        <a
          href={mention.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View on {mention.platform} →
        </a>
      </div>
    </div>
  );
}
