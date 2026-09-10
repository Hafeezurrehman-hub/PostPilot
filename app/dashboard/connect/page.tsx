import DashboardNav from "@/components/DashboardNav";
import ConnectCard from "@/components/ConnectCard";
import { createClient } from "@/lib/supabase/server";
import { getCorePlatforms, getExtendedPlatforms, ALL_PLATFORMS } from "@/lib/platform-data";

export default async function ConnectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: connections } = await supabase
    .from("platform_connections")
    .select("platform, platform_username, expires_at")
    .eq("user_id", user?.id ?? "");

  const corePlatforms = getCorePlatforms();
  const extendedPlatforms = getExtendedPlatforms();

  const connectedCount = new Set((connections ?? []).map((c) => c.platform)).size;
  const totalPlatforms = ALL_PLATFORMS.length;
  const progressPercent = Math.round((connectedCount / totalPlatforms) * 100);

  const isFirstTime = connectedCount === 0;

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={user?.email} />
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white">Connect Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isFirstTime
              ? "Connect your first platform to start posting everywhere."
              : `${connectedCount} of ${totalPlatforms} platforms connected`}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-500">Connection progress</span>
            <span className="text-slate-400 font-medium">{connectedCount}/{totalPlatforms}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* First-time onboarding banner */}
        {isFirstTime && (
          <div className="mt-6 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-indigo-300">Get started in 3 steps</h3>
                <ol className="mt-2 space-y-1.5 text-xs text-slate-400">
                  <li><span className="text-indigo-400 font-medium">1.</span> Connect at least one platform below</li>
                  <li><span className="text-indigo-400 font-medium">2.</span> Go to <span className="text-slate-300">New Post</span> and write something</li>
                  <li><span className="text-indigo-400 font-medium">3.</span> Hit <span className="text-slate-300">Publish</span> — it posts to all connected platforms!</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Core platforms */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-slate-300">Popular platforms</h2>
            <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
              {corePlatforms.filter((p) => connections?.some((c) => c.platform === p.id)).length}/{corePlatforms.length}
            </span>
          </div>
          <div className="space-y-2">
            {corePlatforms.map((p) => {
              const conn = (connections ?? []).find((c) => c.platform === p.id);
              return <ConnectCard key={p.id} platform={p} connection={conn} />;
            })}
          </div>
        </div>

        {/* Extended platforms */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-slate-300">More platforms</h2>
            <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
              {extendedPlatforms.filter((p) => connections?.some((c) => c.platform === p.id)).length}/{extendedPlatforms.length}
            </span>
          </div>
          <div className="space-y-2">
            {extendedPlatforms.map((p) => {
              const conn = (connections ?? []).find((c) => c.platform === p.id);
              return <ConnectCard key={p.id} platform={p} connection={conn} />;
            })}
          </div>
        </div>

        {/* All connected celebration */}
        {connectedCount === totalPlatforms && (
          <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h3 className="text-sm font-medium text-emerald-300">All platforms connected!</h3>
            <p className="text-xs text-slate-400 mt-1">You can now publish to all {totalPlatforms} platforms from a single post.</p>
          </div>
        )}

        {/* How it works */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-medium text-slate-300">How it works</h3>
          <ul className="mt-3 space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">✓</span>
              <span className="text-xs text-slate-400"><span className="text-slate-300 font-medium">Connect</span> — Authorize PostPilot to post on your behalf. Each platform uses its own secure OAuth flow.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">↻</span>
              <span className="text-xs text-slate-400"><span className="text-slate-300 font-medium">Reconnect</span> — Some tokens expire. Reconnect keeps your posting uninterrupted.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">✕</span>
              <span className="text-xs text-slate-400"><span className="text-slate-300 font-medium">Disconnect</span> — Remove access anytime. Your tokens are deleted from the database.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">🔒</span>
              <span className="text-xs text-slate-400"><span className="text-slate-300 font-medium">Secure</span> — All tokens are encrypted before storage. Facebook disconnect also removes Instagram &amp; Threads.</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
