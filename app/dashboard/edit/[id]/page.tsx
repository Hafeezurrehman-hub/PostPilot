"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

const PLATFORMS = [
  { id: "instagram", name: "Instagram", limit: 2200 },
  { id: "facebook", name: "Facebook", limit: 63206 },
  { id: "twitter", name: "Twitter / X", limit: 280 },
  { id: "linkedin", name: "LinkedIn", limit: 3000 },
];

interface PostData {
  id: string;
  content: string;
  platforms: string[];
  media_url: string | null;
  status: string;
  scheduled_for: string | null;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [userEmail, setUserEmail] = useState<string | undefined>();

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load existing post data
  const loadPost = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserEmail(user.email);

    const { data: post, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (error || !post) {
      router.push("/dashboard");
      return;
    }

    const postData = post as PostData;
    setText(postData.content);
    setSelected(postData.platforms ?? []);
    setExistingImageUrl(postData.media_url);

    if (postData.scheduled_for) {
      setScheduleEnabled(true);
      // Convert ISO to datetime-local format
      setScheduleDate(new Date(postData.scheduled_for).toISOString().slice(0, 16));
    }

    setLoading(false);
  }, [postId, router]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

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
    setExistingImageUrl(null);
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imageFile) return existingImageUrl;

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const fileExt = imageFile.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(filePath, imageFile);

    if (uploadError) {
      throw new Error("Image upload failed");
    }

    const { data: publicUrlData } = supabase.storage
      .from("post-media")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  // Save changes (keep as draft/scheduled)
  const saveChanges = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const mediaUrl = await uploadImage(user.id);
      const status = scheduleEnabled && scheduleDate ? "scheduled" : undefined;

      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          platforms: selected,
          media_url: mediaUrl,
          ...(status ? { status, scheduled_for: new Date(scheduleDate).toISOString() } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Update failed");
      }

      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Save + Publish immediately
  const saveAndPublish = async () => {
    if (!text.trim()) return;
    setPublishing(true);
    setErrorMsg(null);
    setPublishResult(null);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const mediaUrl = await uploadImage(user.id);

      // First, update the post
      const updateRes = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          platforms: selected,
          media_url: mediaUrl,
          status: "draft", // Reset to draft before publishing
        }),
      });

      if (!updateRes.ok) {
        const data = await updateRes.json();
        throw new Error(data.error ?? "Update failed");
      }

      // Then, publish it
      const publishRes = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      const publishData = await publishRes.json();

      if (!publishRes.ok) {
        throw new Error(publishData.error ?? "Publish failed");
      }

      setPublishResult(publishData.message ?? "Published!");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setPublishing(false);
    }
  };

  const tightestLimit = PLATFORMS.filter((p) => selected.includes(p.id)).reduce(
    (min, p) => Math.min(min, p.limit),
    Infinity
  );

  const [minDateTime] = useState(() =>
    new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
  );

  if (loading) {
    return (
      <main className="flex-1 bg-slate-950 text-slate-100">
        <DashboardNav email={userEmail} />
        <div className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-sm text-slate-500">Loading post...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Edit Post</h1>
            <p className="text-sm text-slate-500 mt-1">
              Make changes and save, or publish directly.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>

        {/* Platform selection */}
        <div className="mt-6 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePlatform(p.id)}
              className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
                selected.includes(p.id)
                  ? "bg-indigo-500 border-indigo-500 text-white"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {p.name}
            </button>
          ))}
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
                Exceeds the selected platform&apos;s limit
              </span>
            )}
          </div>
        </div>

        {/* Image */}
        <div className="mt-4">
          {imagePreview || existingImageUrl ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview ?? existingImageUrl!}
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

        {/* Preview */}
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
                  {(imagePreview ?? existingImageUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview ?? existingImageUrl!}
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

        {/* Status messages */}
        {errorMsg && <p className="mt-4 text-sm text-rose-400">{errorMsg}</p>}
        {publishResult && <p className="mt-4 text-sm text-emerald-400">{publishResult}</p>}

        {/* Action buttons */}
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
            onClick={saveChanges}
            disabled={
              saving || !text.trim() || (tightestLimit !== Infinity && text.length > tightestLimit)
            }
            className="rounded-md border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
