"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import AiCaptionGenerator from "@/components/AiCaptionGenerator";
import { createClient } from "@/lib/supabase/client";
import { platformIcon, platformColor } from "@/components/PlatformIcons";
import { ALL_PLATFORMS } from "@/lib/platform-data";

const PLATFORMS = ALL_PLATFORMS.map((p) => ({
  id: p.id,
  name: p.name,
  limit: p.charLimit ?? 10000,
}));

export default function NewPostPage() {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [userEmail, setUserEmail] = useState<string | undefined>();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email));
  }, []);

  const togglePlatform = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const saveAndPublish = async () => {
    if (!text.trim()) return;
    setPublishing(true);
    setErrorMsg(null);
    setPublishResult(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Step 1: Image upload (agar hai)
    let mediaUrl: string | null = null;
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(filePath, imageFile);
      if (uploadError) {
        setPublishing(false);
        setErrorMsg("Image upload failed.");
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("post-media")
        .getPublicUrl(filePath);
      mediaUrl = publicUrlData.publicUrl;
    }

    // Step 2: Post save karo (as draft, publish ke baad status update hoga)
    const { data: newPost, error: insertError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content: text,
        media_url: mediaUrl,
        platforms: selected,
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError || !newPost) {
      setPublishing(false);
      setErrorMsg("Failed to save post.");
      return;
    }

    // Step 3: Publish karo
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: newPost.id }),
    });
    const data = await res.json();

    setPublishing(false);

    if (!res.ok) {
      setErrorMsg(data.error ?? "Publish failed.");
      return;
    }

    setPublishResult(data.message ?? "Done!");
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  const saveDraft = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    let mediaUrl: string | null = null;

    // Agar image select ki hai, Supabase Storage me upload karo
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(filePath, imageFile);

      if (uploadError) {
        setSaving(false);
        setErrorMsg(
          "Image upload failed — check that the 'post-media' bucket exists in Supabase (see instructions in supabase/schema.sql)."
        );
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("post-media")
        .getPublicUrl(filePath);
      mediaUrl = publicUrlData.publicUrl;
    }

    const status = scheduleEnabled && scheduleDate ? "scheduled" : "draft";

    const { error: insertError } = await supabase.from("posts").insert({
      user_id: user.id,
      content: text,
      media_url: mediaUrl,
      platforms: selected,
      status,
      scheduled_for:
        scheduleEnabled && scheduleDate ? new Date(scheduleDate).toISOString() : null,
    });

    setSaving(false);

    if (insertError) {
      setErrorMsg("Failed to save post. Please try again.");
      return;
    }

    setSaved(true);
    setTimeout(() => router.push("/dashboard"), 800);
  };

  const tightestLimit = PLATFORMS.filter((p) => selected.includes(p.id)).reduce(
    (min, p) => Math.min(min, p.limit),
    Infinity
  );

  const [minDateTime] = useState(() =>
    new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
  );

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold text-white">Create New Post</h1>
        <p className="text-sm text-slate-500 mt-1">
          Select platforms, write your post, then publish now or save as a draft.
        </p>

        {/* Platform selection */}
        <div className="mt-6">
          <p className="text-xs text-slate-500 mb-2">Select platforms to post to</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const Icon = platformIcon(p.id);
              const color = platformColor(p.id);
              const isSelected = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  {Icon && (
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{ color: isSelected ? color : undefined }}
                    />
                  )}
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="mt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="What do you want to share today?"
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="mt-1 flex justify-end text-xs text-slate-500">
            {text.length}
            {tightestLimit !== Infinity && ` / ${tightestLimit}`} characters
            {tightestLimit !== Infinity && text.length > tightestLimit && (
              <span className="ml-2 text-rose-400">
                Exceeds the selected platform's limit
              </span>
            )}
          </div>

          {/* AI Caption Generator */}
          {selected.length > 0 && (
            <AiCaptionGenerator
              platform={selected[0]}
              onInsert={(caption) => setText(caption)}
            />
          )}
        </div>

        {/* Image upload */}
        <div className="mt-4">
          {imagePreview ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Selected"
                className="max-h-56 rounded-lg border border-slate-800"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 w-fit cursor-pointer rounded-md border border-dashed border-slate-700 px-4 py-2.5 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300">
              <span>+ Add Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Schedule */}
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
            Schedule for later
          </label>
          {scheduleEnabled && (
            <input
              type="datetime-local"
              min={minDateTime}
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="mt-3 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          <p className="mt-2 text-xs text-slate-600">
            Scheduled posts will be published automatically at the set time.
          </p>
        </div>

        {/* Preview per platform */}
        {selected.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Preview</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {PLATFORMS.filter((p) => selected.includes(p.id)).map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-4"
                >
                  <p className="text-xs font-medium text-indigo-400 mb-2">{p.name}</p>
                  {imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt=""
                      className="mb-2 max-h-32 rounded-md border border-slate-800"
                    />
                  )}
                  <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                    {text.length > p.limit
                      ? text.slice(0, p.limit) + "…"
                      : text || (
                          <span className="text-slate-600">Your preview will appear here</span>
                        )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {errorMsg && <p className="mt-4 text-sm text-rose-400">{errorMsg}</p>}

        {publishResult && <p className="mt-4 text-sm text-emerald-400">{publishResult}</p>}

        <div className="mt-10 flex gap-3">
          <button
            onClick={saveAndPublish}
            disabled={
              publishing ||
              !text.trim() ||
              selected.length === 0 ||
              (tightestLimit !== Infinity && text.length > tightestLimit)
            }
            className="rounded-md bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
          <button
            onClick={saveDraft}
            disabled={
              saving || !text.trim() || (tightestLimit !== Infinity && text.length > tightestLimit)
            }
            className="rounded-md border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : saved
              ? "Saved ✓"
              : scheduleEnabled && scheduleDate
              ? "Schedule Post"
              : "Save Draft"}
          </button>
        </div>
      </div>
    </main>
  );
}
