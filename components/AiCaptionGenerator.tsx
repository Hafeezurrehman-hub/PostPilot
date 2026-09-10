"use client";

import { useState } from "react";
import { useToast } from "@/lib/toast-context";

interface AiCaptionGeneratorProps {
  platform: string;
  onInsert: (caption: string) => void;
}

export default function AiCaptionGenerator({
  platform,
  onInsert,
}: AiCaptionGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<string>("casual");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setOptions([]);

    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          tone,
          includeHashtags,
          multiple: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Generation failed", "error");
      } else {
        setOptions(data.options ?? []);
        if ((data.options ?? []).length === 0) {
          toast("No options generated — try a different topic", "info");
        }
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-md transition-colors"
        >
          ✨ AI Generate Caption
        </button>
      ) : (
        <div className="rounded-lg border border-violet-500/30 bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-violet-400">✨ AI Caption Generator</h3>
            <button
              onClick={() => {
                setOpen(false);
                setOptions([]);
                setTopic("");
              }}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What's your post about? (e.g., 'new product launch')"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="funny">Funny</option>
              <option value="inspirational">Inspirational</option>
              <option value="informative">Informative</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-violet-500"
              />
              Hashtags
            </label>

            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-50 transition-colors"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>

          {options.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Click a caption to insert:</p>
              {options.map((caption, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onInsert(caption);
                    setOpen(false);
                    setOptions([]);
                    toast("Caption inserted!", "success");
                  }}
                  className="w-full text-left rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:border-violet-500/50 hover:bg-slate-750 transition-colors"
                >
                  {caption}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
