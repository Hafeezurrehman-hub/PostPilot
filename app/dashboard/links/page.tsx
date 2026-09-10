"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/lib/toast-context";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─── */
interface ShortLink {
  id: string;
  user_id: string;
  original_url: string;
  short_code: string;
  short_url: string;
  clicks: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}

/* ─── Page ─── */
export default function LinksPage() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userId, setUserId] = useState("");
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showUTM, setShowUTM] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Form
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  const loadLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links ?? []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email);
      setUserId(user.id);
      await loadLinks();
    };
    init();
  }, [router, loadLinks]);

  const handleCreate = async () => {
    if (!url.trim()) { toast("Enter a URL", "error"); return; }
    // Validate URL
    try { new URL(url); } catch { toast("Invalid URL format", "error"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: url,
          customCode: customCode.trim() || undefined,
          utmSource: utmSource.trim() || undefined,
          utmMedium: utmMedium.trim() || undefined,
          utmCampaign: utmCampaign.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
      } else {
        toast("Link created!", "success");
        setShowCreate(false);
        setUrl(""); setCustomCode(""); setUtmSource(""); setUtmMedium(""); setUtmCampaign(""); setShowUTM(false);
        await loadLinks();
      }
    } catch { toast("Network error", "error"); }
    setCreating(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast("Copied!", "success");
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch("/api/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      toast("Link deleted", "success");
      setLinks(prev => prev.filter(l => l.id !== id));
    } catch { toast("Failed", "error"); }
  };

  const totalClicks = links.reduce((sum, l) => sum + (l.clicks ?? 0), 0);

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Link Shortener</h1>
            <p className="text-sm text-slate-500 mt-1">
              {links.length} links · {totalClicks.toLocaleString()} total clicks
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="shrink-0 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            {showCreate ? "Cancel" : "+ New Link"}
          </button>
        </div>

        {/* ─── Create Form ─── */}
        {showCreate && (
          <div className="mt-6 rounded-xl border border-indigo-500/30 bg-slate-900 p-5">
            <h3 className="text-sm font-medium text-white mb-4">Create short link</h3>
            <div className="space-y-3">
              {/* URL */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Destination URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/your-long-url"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Custom code */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Custom code <span className="text-slate-600">(optional — random if empty)</span>
                </label>
                <div className="flex items-center gap-0">
                  <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 border-r-0 rounded-l-lg px-3 py-2.5">
                    /l/
                  </span>
                  <input
                    type="text"
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder="my-link"
                    maxLength={20}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-r-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* UTM toggle */}
              <button
                onClick={() => setShowUTM(!showUTM)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <span className={`transition-transform ${showUTM ? "rotate-90" : ""}`}>›</span>
                UTM parameters
              </button>

              {/* UTM fields */}
              {showUTM && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">utm_source</label>
                    <input
                      type="text"
                      value={utmSource}
                      onChange={e => setUtmSource(e.target.value)}
                      placeholder="twitter, facebook"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">utm_medium</label>
                    <input
                      type="text"
                      value={utmMedium}
                      onChange={e => setUtmMedium(e.target.value)}
                      placeholder="social, cpc, email"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">utm_campaign</label>
                    <input
                      type="text"
                      value={utmCampaign}
                      onChange={e => setUtmCampaign(e.target.value)}
                      placeholder="spring_sale, launch"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowCreate(false); setUrl(""); setCustomCode(""); setUtmSource(""); setUtmMedium(""); setUtmCampaign(""); setShowUTM(false); }}
                className="flex-1 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !url.trim()}
                className="flex-1 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Link"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Stats Bar ─── */}
        {links.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">Total Links</p>
              <p className="mt-1 text-xl font-semibold text-white">{links.length}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">Total Clicks</p>
              <p className="mt-1 text-xl font-semibold text-indigo-400">{totalClicks.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">Avg. Clicks/Link</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {links.length > 0 ? Math.round(totalClicks / links.length) : 0}
              </p>
            </div>
          </div>
        )}

        {/* ─── Links List ─── */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-800/30 animate-pulse" />)}
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 py-16 text-center">
              <p className="text-3xl mb-2">🔗</p>
              <p className="text-sm text-slate-400">No short links yet</p>
              <p className="text-xs text-slate-600 mt-1">Create your first short link with click tracking</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
                Create your first link →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map(link => (
                <LinkCard
                  key={link.id}
                  link={link}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── How It Works ─── */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-medium text-slate-300">How Link Shortener works</h3>
          <ul className="mt-3 space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Paste your URL</span> — Long URLs get shortened to a clean shareable link
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Add UTM params</span> — Track which platform/campaign drives traffic
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Share & track</span> — Every click is counted so you know what&apos;s working
              </span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

/* ─── Link Card Component ─── */
function LinkCard({
  link,
  onCopy,
  onDelete,
}: {
  link: ShortLink;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const created = new Date(link.created_at).toLocaleDateString();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-colors p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Short URL */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-indigo-400 truncate">{link.short_url}</span>
            <button
              onClick={() => onCopy(link.short_url)}
              className="text-[10px] text-slate-500 hover:text-indigo-400 px-1.5 py-0.5 rounded bg-slate-800 transition-colors shrink-0"
            >
              Copy
            </button>
          </div>

          {/* Original URL */}
          <p className="text-xs text-slate-500 truncate mt-1" title={link.original_url}>
            → {link.original_url}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Clicks */}
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              👁 {link.clicks.toLocaleString()} clicks
            </span>

            {/* UTM tags */}
            {link.utm_source && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                source: {link.utm_source}
              </span>
            )}
            {link.utm_medium && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                medium: {link.utm_medium}
              </span>
            )}
            {link.utm_campaign && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                campaign: {link.utm_campaign}
              </span>
            )}

            <span className="text-[10px] text-slate-600">{created}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded transition-colors"
          >
            {showDetails ? "Less" : "Details"}
          </button>
          <button
            onClick={() => {
              if (confirmDelete) onDelete(link.id);
              else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 4000); }
            }}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              confirmDelete
                ? "text-white bg-rose-500 hover:bg-rose-400"
                : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
            }`}
          >
            {confirmDelete ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
          <div>
            <p className="text-[10px] text-slate-600 mb-0.5">Destination URL (with UTM)</p>
            <p className="text-[11px] text-slate-400 break-all">{link.original_url}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-slate-600">Short code</p>
              <p className="text-[11px] text-slate-400">{link.short_code}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600">Clicks</p>
              <p className="text-[11px] text-indigo-400 font-medium">{link.clicks.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600">Created</p>
              <p className="text-[11px] text-slate-400">{created}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
