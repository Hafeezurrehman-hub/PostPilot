"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/lib/toast-context";
import { createClient } from "@/lib/supabase/client";
import { platformIcon, platformColor } from "@/components/PlatformIcons";

/* ─── Types ─── */
interface ParsedPost {
  content: string;
  platforms: string[];
  scheduled_for: string | null;
  media_url: string | null;
}

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

const ALL_PLATFORMS = [
  "twitter", "linkedin", "facebook", "instagram", "threads",
  "tiktok", "youtube", "pinterest", "reddit", "mastodon",
  "bluesky", "google_business", "whatsapp",
];

const EXAMPLE_CSV = `content,platforms,scheduled_for,media_url
"Check out our new feature! 🚀",twitter;linkedin,
"Behind the scenes at our office 📸",instagram;facebook,2025-01-15T10:00:00Z,
"New blog post: How to grow your audience",twitter;linkedin;facebook,`;

const EXAMPLE_JSON = `[
  {
    "content": "Check out our new feature! 🚀",
    "platforms": ["twitter", "linkedin"]
  },
  {
    "content": "Behind the scenes at our office 📸",
    "platforms": ["instagram", "facebook"],
    "scheduled_for": "2025-01-15T10:00:00Z"
  }
]`;

/* ─── Page ─── */
export default function BulkPage() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userId, setUserId] = useState("");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [inputFormat, setInputFormat] = useState<"csv" | "json">("csv");
  const [rawInput, setRawInput] = useState("");
  const [parsedPosts, setParsedPosts] = useState<ParsedPost[]>([]);
  const [parseError, setParseError] = useState("");
  const [importMode, setImportMode] = useState<"draft" | "scheduled">("draft");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const handleParse = useCallback(() => {
    if (!rawInput.trim()) { setParsedPosts([]); setParseError(""); return; }
    try {
      if (inputFormat === "json") {
        const data = JSON.parse(rawInput);
        if (!Array.isArray(data)) throw new Error("JSON must be an array");
        const posts: ParsedPost[] = data
          .filter((item: Record<string, unknown>) => item.content && item.platforms)
          .map((item: Record<string, unknown>) => ({
            content: String(item.content),
            platforms: Array.isArray(item.platforms)
              ? (item.platforms as string[]).map(p => p.toLowerCase())
              : String(item.platforms).split(";").map(p => p.trim().toLowerCase()).filter(Boolean),
            scheduled_for: item.scheduled_for ? String(item.scheduled_for) : null,
            media_url: item.media_url ? String(item.media_url) : null,
          }));
        setParsedPosts(posts.filter(p => p.content && p.platforms.length > 0));
        setParseError(posts.length === 0 ? "No valid posts found" : "");
      } else {
        // CSV
        const lines = rawInput.trim().split("\n");
        if (lines.length < 2) { setParseError("Need header + at least 1 row"); setParsedPosts([]); return; }
        const header = lines[0].toLowerCase().split(",").map(h => h.trim());
        const contentIdx = header.indexOf("content");
        const platformsIdx = header.indexOf("platforms");
        const scheduledIdx = header.indexOf("scheduled_for");
        const mediaIdx = header.indexOf("media_url");
        if (contentIdx === -1 || platformsIdx === -1) {
          setParseError("CSV needs 'content' and 'platforms' columns"); setParsedPosts([]); return;
        }
        const posts: ParsedPost[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = parseCSVLine(line);
          const content = cols[contentIdx] ?? "";
          const platforms = (cols[platformsIdx] ?? "").split(";").map(p => p.trim().toLowerCase()).filter(Boolean);
          if (!content || platforms.length === 0) continue;
          posts.push({
            content,
            platforms,
            scheduled_for: cols[scheduledIdx] || null,
            media_url: cols[mediaIdx] || null,
          });
        }
        setParsedPosts(posts);
        setParseError(posts.length === 0 ? "No valid posts found" : "");
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Parse error");
      setParsedPosts([]);
    }
  }, [rawInput, inputFormat]);

  // Auto-parse on input change
  useEffect(() => { handleParse(); }, [handleParse]);

  const handleFileUpload = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "json") setInputFormat("json");
    else setInputFormat("csv");

    const reader = new FileReader();
    reader.onload = (e) => {
      setRawInput(e.target?.result as string);
      setInputMode("paste");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleImport = async () => {
    if (parsedPosts.length === 0 || !userId) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: rawInput,
          format: inputFormat,
          userId,
          mode: importMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Import failed", "error");
      } else {
        setResult(data);
        if (data.imported > 0) {
          toast(`${data.imported} posts imported!`, "success");
        }
        if (data.failed > 0) {
          toast(`${data.failed} posts failed`, "error");
        }
      }
    } catch {
      toast("Network error", "error");
    }
    setImporting(false);
  };

  const handleLoadExample = () => {
    setRawInput(inputFormat === "csv" ? EXAMPLE_CSV : EXAMPLE_JSON);
  };

  const handleClear = () => {
    setRawInput("");
    setParsedPosts([]);
    setParseError("");
    setResult(null);
  };

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white">Bulk Post</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload a CSV or JSON file to create multiple posts at once.
          </p>
        </div>

        {/* ─── Input Section ─── */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          {/* Mode tabs */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 p-0.5 bg-slate-800 rounded-md">
                <button
                  onClick={() => setInputMode("paste")}
                  className={`text-[11px] px-3 py-1 rounded transition-colors ${inputMode === "paste" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
                >
                  Paste text
                </button>
                <button
                  onClick={() => setInputMode("upload")}
                  className={`text-[11px] px-3 py-1 rounded transition-colors ${inputMode === "upload" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
                >
                  Upload file
                </button>
              </div>
              <div className="flex gap-1 p-0.5 bg-slate-800 rounded-md">
                <button
                  onClick={() => setInputFormat("csv")}
                  className={`text-[11px] px-3 py-1 rounded transition-colors ${inputFormat === "csv" ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 hover:text-white"}`}
                >
                  CSV
                </button>
                <button
                  onClick={() => setInputFormat("json")}
                  className={`text-[11px] px-3 py-1 rounded transition-colors ${inputFormat === "json" ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 hover:text-white"}`}
                >
                  JSON
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLoadExample} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                Load example
              </button>
              <button onClick={handleClear} className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                Clear
              </button>
            </div>
          </div>

          {inputMode === "paste" ? (
            <textarea
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder={inputFormat === "csv"
                ? 'content,platforms,scheduled_for\n"Hello world!",twitter;linkedin,'
                : '[{"content":"Hello world!","platforms":["twitter","linkedin"]}]'
              }
              rows={10}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg py-12 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-indigo-500 bg-indigo-500/5"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,.txt"
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              <p className="text-2xl mb-2">📄</p>
              <p className="text-sm text-slate-400">
                {dragOver ? "Drop your file here" : "Drag & drop a CSV or JSON file, or click to browse"}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">Supports .csv, .json, .txt</p>
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="mt-3 rounded-lg bg-rose-500/5 border border-rose-500/20 px-3 py-2">
              <p className="text-xs text-rose-400">⚠️ {parseError}</p>
            </div>
          )}

          {/* Format help */}
          <div className="mt-4 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
            <p className="text-[10px] text-slate-500 mb-1.5 font-medium">CSV format:</p>
            <p className="text-[10px] text-slate-400 font-mono">
              content,platforms,scheduled_for,media_url
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Separate platforms with <code className="text-indigo-400">;</code> (semicolons).{" "}
              <code className="text-indigo-400">scheduled_for</code> and <code className="text-indigo-400">media_url</code> are optional.
            </p>
          </div>
        </div>

        {/* ─── Preview Section ─── */}
        {parsedPosts.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-300">
                Preview <span className="text-slate-500">({parsedPosts.length} posts)</span>
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-500">Import as:</label>
                  <div className="flex gap-1 p-0.5 bg-slate-800 rounded-md">
                    <button
                      onClick={() => setImportMode("draft")}
                      className={`text-[11px] px-2.5 py-1 rounded transition-colors ${importMode === "draft" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
                    >
                      Drafts
                    </button>
                    <button
                      onClick={() => setImportMode("scheduled")}
                      className={`text-[11px] px-2.5 py-1 rounded transition-colors ${importMode === "scheduled" ? "bg-amber-500/20 text-amber-300" : "text-slate-500 hover:text-white"}`}
                    >
                      Scheduled
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {importing ? "Importing..." : `Import ${parsedPosts.length} posts`}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {parsedPosts.map((post, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-3">
                        {post.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {post.platforms.map(p => {
                          const color = platformColor(p);
                          const Icon = platformIcon(p);
                          return (
                            <span key={p} className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                              {Icon && <Icon className="w-2.5 h-2.5" style={{ color }} />}
                              {p}
                            </span>
                          );
                        })}
                        {post.scheduled_for && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            📅 {new Date(post.scheduled_for).toLocaleDateString()}
                          </span>
                        )}
                        {post.media_url && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                            🖼️ Has media
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-600 shrink-0">#{i + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Results ─── */}
        {result && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
            <h2 className="text-sm font-medium text-slate-300 mb-4">Import Results</h2>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-slate-800 p-3 text-center">
                <p className="text-2xl font-bold text-white">{result.total}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Total</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                <p className="text-[10px] text-emerald-500/70 mt-0.5">Imported</p>
              </div>
              <div className="rounded-lg bg-rose-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-rose-400">{result.failed}</p>
                <p className="text-[10px] text-rose-500/70 mt-0.5">Failed</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
                    Row {err.index}: {err.error}
                  </div>
                ))}
              </div>
            )}

            {result.imported > 0 && (
              <div className="mt-4 flex gap-3">
                <a
                  href="/dashboard"
                  className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-lg transition-colors"
                >
                  View Posts →
                </a>
                <button
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Import more
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── How It Works ─── */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-medium text-slate-300">How Bulk Posting works</h3>
          <ul className="mt-3 space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Prepare your file</span> — CSV with columns: <code className="text-indigo-400">content</code>, <code className="text-indigo-400">platforms</code> (semicolon-separated), optional <code className="text-indigo-400">scheduled_for</code> and <code className="text-indigo-400">media_url</code>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Upload or paste</span> — Drag & drop a file, or paste CSV/JSON directly
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Preview & import</span> — Review parsed posts, choose drafts or scheduled, then import
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">📅</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Scheduled posts</span> — If you provide dates in <code className="text-indigo-400">scheduled_for</code>, posts will be published automatically at that time
              </span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

/* ─── Helpers ─── */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}
