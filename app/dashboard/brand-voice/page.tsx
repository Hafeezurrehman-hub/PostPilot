"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/lib/toast-context";
import { createClient } from "@/lib/supabase/client";
import { platformIcon, platformColor } from "@/components/PlatformIcons";

/* ─── Types ─── */
interface BrandVoiceProfile {
  id: string;
  user_id: string;
  name: string;
  tone: string;
  keywords: string[];
  avoid_words: string[];
  examples: string[];
  hashtag_style: string;
  emoji_usage: string;
  language: string;
  description: string;
  is_default: boolean;
  created_at: string;
}

interface RepurposedPost {
  platform: string;
  content: string;
  charCount: number;
  type: "post" | "thread";
}

const TONE_OPTIONS = [
  "professional", "casual", "funny", "inspirational",
  "informative", "witty", "bold", "friendly", "authoritative", "playful",
];

const HASHTAG_OPTIONS = [
  { value: "none", label: "None", desc: "No hashtags" },
  { value: "minimal", label: "Minimal", desc: "1–2 hashtags" },
  { value: "moderate", label: "Moderate", desc: "3–5 hashtags" },
  { value: "heavy", label: "Heavy", desc: "7–10 hashtags" },
];

const EMOJI_OPTIONS = [
  { value: "none", label: "None", desc: "No emojis" },
  { value: "minimal", label: "Minimal", desc: "1–2 per post" },
  { value: "moderate", label: "Moderate", desc: "3–5 per post" },
  { value: "heavy", label: "Heavy", desc: "Lots of emojis" },
];

const REPURPOSE_PLATFORMS = ["twitter", "linkedin", "instagram", "facebook"];

/* ─── Page ─── */
export default function BrandVoicePage() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userId, setUserId] = useState("");
  const [tab, setTab] = useState<"voice" | "repurpose">("voice");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email);
      setUserId(user.id);
    };
    init();
  }, [router]);

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white">Brand Voice & Repurpose</h1>
          <p className="text-sm text-slate-500 mt-1">
            Define your brand voice and repurpose content across platforms.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 w-fit">
          <button
            onClick={() => setTab("voice")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "voice"
                ? "bg-indigo-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🎙️ Brand Voice
          </button>
          <button
            onClick={() => setTab("repurpose")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "repurpose"
                ? "bg-indigo-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ♻️ Repurpose
          </button>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {tab === "voice" ? (
            <BrandVoiceTab userId={userId} />
          ) : (
            <RepurposeTab />
          )}
        </div>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════
   BRAND VOICE TAB
   ═══════════════════════════════════════════════ */

function BrandVoiceTab({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<BrandVoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    name: "",
    tone: "casual",
    description: "",
    keywords: "",
    avoidWords: "",
    examples: "",
    hashtagStyle: "moderate",
    emojiUsage: "moderate",
    language: "english",
    isDefault: false,
  });

  const loadProfiles = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/brand-voice?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles ?? []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast("Name is required", "error"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          userId,
          profile: {
            name: form.name,
            tone: form.tone,
            description: form.description,
            keywords: form.keywords.split(",").map(s => s.trim()).filter(Boolean),
            avoidWords: form.avoidWords.split(",").map(s => s.trim()).filter(Boolean),
            examples: form.examples.split("\n").map(s => s.trim()).filter(Boolean),
            hashtagStyle: form.hashtagStyle,
            emojiUsage: form.emojiUsage,
            language: form.language,
            isDefault: form.isDefault,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed", "error");
      } else {
        toast("Brand voice created!", "success");
        setShowCreate(false);
        setForm({ name: "", tone: "casual", description: "", keywords: "", avoidWords: "", examples: "", hashtagStyle: "moderate", emojiUsage: "moderate", language: "english", isDefault: false });
        await loadProfiles();
      }
    } catch { toast("Network error", "error"); }
    setCreating(false);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch("/api/brand-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setDefault", userId, profileId: id }),
      });
      toast("Default updated", "success");
      await loadProfiles();
    } catch { toast("Failed", "error"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch("/api/brand-voice", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, userId }),
      });
      toast("Deleted", "success");
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch { toast("Failed", "error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-medium text-slate-300">Your brand voices</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""} — default is used for AI captions
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="shrink-0 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
        >
          {showCreate ? "Cancel" : "+ New Voice"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-indigo-500/30 bg-slate-900 p-5 mb-6">
          <h3 className="text-sm font-medium text-white mb-4">Create Brand Voice</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Professional, Fun, Startup"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Tone */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tone</label>
              <select
                value={form.tone}
                onChange={e => setForm({ ...form, tone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TONE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Brand voice description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your brand's communication style..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Keywords (comma-separated)</label>
              <input
                type="text"
                value={form.keywords}
                onChange={e => setForm({ ...form, keywords: e.target.value })}
                placeholder="e.g., innovation, growth, team"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Avoid Words */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Avoid words (comma-separated)</label>
              <input
                type="text"
                value={form.avoidWords}
                onChange={e => setForm({ ...form, avoidWords: e.target.value })}
                placeholder="e.g., cheap, discount, sale"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Hashtag Style */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Hashtag style</label>
              <div className="grid grid-cols-4 gap-1.5">
                {HASHTAG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, hashtagStyle: opt.value })}
                    className={`text-[11px] px-2 py-1.5 rounded-md border transition-colors ${
                      form.hashtagStyle === opt.value
                        ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji Usage */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Emoji usage</label>
              <div className="grid grid-cols-4 gap-1.5">
                {EMOJI_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, emojiUsage: opt.value })}
                    className={`text-[11px] px-2 py-1.5 rounded-md border transition-colors ${
                      form.emojiUsage === opt.value
                        ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Examples */}
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">
                Example posts <span className="text-slate-600">(one per line)</span>
              </label>
              <textarea
                value={form.examples}
                onChange={e => setForm({ ...form, examples: e.target.value })}
                placeholder={"We're thrilled to announce...\nHey team! Quick update...\nExcited to share..."}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Default toggle */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500"
                />
                <span className="text-xs text-slate-400">Set as default voice (used for AI generation)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowCreate(false)} className="flex-1 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={creating} className="flex-1 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {creating ? "Creating..." : "Create Voice"}
            </button>
          </div>
        </div>
      )}

      {/* Profile list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-slate-800/30 animate-pulse" />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 py-16 text-center">
          <p className="text-3xl mb-2">🎙️</p>
          <p className="text-sm text-slate-400">No brand voices yet</p>
          <p className="text-xs text-slate-600 mt-1">Create a voice profile to customize AI-generated captions</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
            Create your first voice →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map(p => (
            <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">{p.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                      {p.tone}
                    </span>
                    {p.is_default && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Default
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-slate-400 mt-1.5">{p.description}</p>
                  )}

                  {/* Settings chips */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      #{p.hashtag_style}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {p.emoji_usage} emojis
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {p.language}
                    </span>
                    {p.keywords?.slice(0, 3).map(k => (
                      <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/5 text-indigo-400/70 border border-indigo-500/10">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!p.is_default && (
                    <button onClick={() => handleSetDefault(p.id)} className="text-[11px] text-slate-500 hover:text-indigo-400 px-2 py-1 rounded transition-colors">
                      Set default
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Delete this voice profile?")) handleDelete(p.id);
                    }}
                    className="text-[11px] text-slate-500 hover:text-rose-400 px-2 py-1 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   REPURPOSE TAB
   ═══════════════════════════════════════════════ */

function RepurposeTab() {
  const [mode, setMode] = useState<"text" | "url">("text");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["twitter", "linkedin"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RepurposedPost[]>([]);
  const { toast } = useToast();

  const handleRepurpose = async () => {
    if (mode === "text" && !content.trim()) { toast("Enter some content", "error"); return; }
    if (mode === "url" && !url.trim()) { toast("Enter a URL", "error"); return; }
    if (platforms.length === 0) { toast("Select at least one platform", "error"); return; }

    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: mode === "text" ? content : undefined,
          url: mode === "url" ? url : undefined,
          platforms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Generation failed", "error");
      } else {
        setResults(data.posts ?? []);
        if ((data.posts ?? []).length === 0) {
          toast("No posts generated — try different content", "info");
        } else {
          toast(`Generated ${data.posts.length} posts!`, "success");
        }
      }
    } catch {
      toast("Network error", "error");
    }
    setLoading(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast("Copied!", "success");
  };

  const handleCopyAll = () => {
    const all = results.map(r => `[${r.platform.toUpperCase()}]\n${r.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(all).catch(() => {});
    toast("All posts copied!", "success");
  };

  const handleUsePost = (post: RepurposedPost) => {
    navigator.clipboard.writeText(post.content).catch(() => {});
    toast("Copied! Paste in New Post.", "success");
  };

  return (
    <div>
      {/* Input section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-medium text-slate-300">Content to repurpose</h2>
          <div className="flex gap-1 p-0.5 bg-slate-800 rounded-md">
            <button
              onClick={() => setMode("text")}
              className={`text-[11px] px-3 py-1 rounded transition-colors ${mode === "text" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
            >
              Paste text
            </button>
            <button
              onClick={() => setMode("url")}
              className={`text-[11px] px-3 py-1 rounded transition-colors ${mode === "url" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
            >
              From URL
            </button>
          </div>
        </div>

        {mode === "text" ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste your blog post, article, or any long-form content here..."
            rows={6}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        ) : (
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/blog-post"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}

        {/* Platform selector */}
        <div className="mt-4">
          <label className="text-xs text-slate-500 mb-2 block">Repurpose for</label>
          <div className="flex flex-wrap gap-2">
            {REPURPOSE_PLATFORMS.map(p => {
              const selected = platforms.includes(p);
              const color = platformColor(p);
              const Icon = platformIcon(p);
              return (
                <button
                  key={p}
                  onClick={() => {
                    setPlatforms(prev => selected ? prev.filter(x => x !== p) : [...prev, p]);
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    selected
                      ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" style={selected ? { color } : undefined} />}
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleRepurpose}
          disabled={loading}
          className="mt-4 w-full text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Generating posts..." : "♻️ Repurpose Content"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-300">Generated posts</h2>
            <button
              onClick={handleCopyAll}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Copy all
            </button>
          </div>

          <div className="space-y-3">
            {results.map((post, i) => {
              const color = platformColor(post.platform);
              const Icon = platformIcon(post.platform);
              return (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4" style={{ color }} />}
                      <span className="text-xs font-medium text-white capitalize">{post.platform}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                        {post.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600">{post.charCount} chars</span>
                      <button
                        onClick={() => handleCopy(post.content)}
                        className="text-[11px] text-slate-500 hover:text-indigo-400 px-2 py-1 rounded transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleUsePost(post)}
                        className="text-[11px] text-white bg-indigo-500 hover:bg-indigo-400 px-2 py-1 rounded transition-colors"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
