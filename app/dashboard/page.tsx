import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import DeletePostButton from "@/components/DeletePostButton";
import PublishPostButton from "@/components/PublishPostButton";
import { createClient } from "@/lib/supabase/server";

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-400",
  scheduled: "bg-amber-500/10 text-amber-400",
  failed: "bg-rose-500/10 text-rose-400",
  draft: "bg-slate-800 text-slate-400",
};

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  scheduled: "Scheduled",
  failed: "Failed",
  draft: "Draft",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  const connectedCount = user
    ? (
        await supabase.from("platform_connections").select("platform", { count: "exact", head: true }).eq("user_id", user.id)
      ).count ?? 0
    : 0;

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={user?.email} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Your posts</h1>
            <p className="text-sm text-slate-500 mt-1">
              Connected platforms: {connectedCount}
              {connectedCount === 0 && (
                <>
                  {" "}
                  •{" "}
                  <Link href="/dashboard/connect" className="text-indigo-400 hover:text-indigo-300">
                    connect now
                  </Link>
                </>
              )}
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="shrink-0 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            + New Post
          </Link>
        </div>

        <div className="mt-8 rounded-lg border border-slate-800">
          {!posts || posts.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm text-slate-400">No posts yet.</p>
              <Link
                href="/dashboard/new"
                className="mt-3 inline-block text-sm text-indigo-400 hover:text-indigo-300"
              >
                Create your first post →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {posts.map((post) => (
                <div key={post.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 line-clamp-2">{post.content}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {(post.platforms ?? []).map((p: string) => (
                        <span
                          key={p}
                          className="text-xs rounded bg-slate-800 px-2 py-0.5 text-slate-400"
                        >
                          {p}
                        </span>
                      ))}
                      <span className="text-xs text-slate-600">
                        {relativeTime(post.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        STATUS_STYLES[post.status] ?? STATUS_STYLES.draft
                      }`}
                    >
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                    {(post.status === "draft" || post.status === "failed") && (
                      <>
                        <Link
                          href={`/dashboard/edit/${post.id}`}
                          className="text-xs font-medium text-slate-400 hover:text-slate-200 px-2 py-1 rounded transition-colors"
                        >
                          Edit
                        </Link>
                        <PublishPostButton postId={post.id} />
                      </>
                    )}
                    <DeletePostButton postId={post.id} />
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
