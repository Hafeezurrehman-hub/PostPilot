"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles, ImagePlus, X, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PLATFORMS = [
  { id: "twitter", name: "Twitter / X", limit: 280 },
  { id: "linkedin", name: "LinkedIn", limit: 3000 },
  { id: "instagram", name: "Instagram", limit: 2200 },
  { id: "facebook", name: "Facebook", limit: 63206 },
  { id: "tiktok", name: "TikTok", limit: 2200 },
];

export default function NewPostPage() {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const router = useRouter();

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

  const tightestLimit = PLATFORMS.filter((p) => selected.includes(p.id)).reduce(
    (min, p) => Math.min(min, p.limit),
    Infinity
  );

  const generateCaption = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    const toastId = toast.loading("Generating caption...");
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, platform: selected[0] ?? "twitter" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setText(data.caption ?? "");
      toast.success("Caption generated", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate caption", { id: toastId });
    } finally {
      setAiLoading(false);
    }
  };

  const uploadImageIfNeeded = async (userId: string) => {
    if (!imageFile) return null;
    const supabase = createClient();
    const fileExt = imageFile.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(filePath, imageFile);
    if (uploadError) throw new Error("Image upload failed");
    const { data } = supabase.storage.from("post-media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePublish = async () => {
    if (!text.trim() || selected.length === 0) return;
    setPublishing(true);
    const toastId = toast.loading("Publishing post...");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const mediaUrl = await uploadImageIfNeeded(user.id);

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

      if (insertError || !newPost) throw new Error("Failed to save post");

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: newPost.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");

      toast.success(data.message ?? "Post published!", { id: toastId });
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong", { id: toastId });
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const isScheduling = scheduleEnabled && scheduleDate;
    const toastId = toast.loading(isScheduling ? "Scheduling post..." : "Saving draft...");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const mediaUrl = await uploadImageIfNeeded(user.id);
      const status = isScheduling ? "scheduled" : "draft";

      const { error: insertError } = await supabase.from("posts").insert({
        user_id: user.id,
        content: text,
        media_url: mediaUrl,
        platforms: selected,
        status,
        scheduled_for: isScheduling ? new Date(scheduleDate).toISOString() : null,
      });

      if (insertError) throw new Error("Failed to save post");

      toast.success(isScheduling ? "Post scheduled" : "Draft saved", { id: toastId });
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const overLimit = tightestLimit !== Infinity && text.length > tightestLimit;

  return (
    <div className="pp-composer">
      <div className="pp-composer__header">
        <h1 className="pp-composer__title">Create New Post</h1>
      </div>

      <div className="pp-composer__body">
        {/* Main column */}
        <div>
          {/* Platform toggles */}
          <div className="pp-platform-toggles">
            {PLATFORMS.map((p) => {
              const isActive = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`pp-toggle ${isActive ? "pp-toggle--active" : ""}`}
                  onClick={() => togglePlatform(p.id)}
                >
                  <span className="pp-toggle__dot" />
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* AI bar */}
          <div className="pp-ai-bar" style={{ marginBottom: 14 }}>
            <span className="pp-ai-bar__label">
              <Sparkles size={13} /> AI
            </span>
            <input
              className="pp-ai-bar__input"
              placeholder="Describe your post and let AI write the caption..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateCaption()}
              disabled={aiLoading}
            />
            <button
              type="button"
              className="pp-icon-btn"
              onClick={generateCaption}
              disabled={aiLoading || !aiPrompt.trim()}
              title="Generate caption"
            >
              <Send size={15} />
            </button>
          </div>

          {/* Compose box */}
          <div className="pp-compose-box">
            <div className="pp-compose-box__label">Post content</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What do you want to share today?"
            />
            <div className="pp-compose-box__footer">
              <span className={`pp-compose-box__count ${overLimit ? "pp-char-danger" : ""}`}>
                {text.length}
                {tightestLimit !== Infinity && ` / ${tightestLimit}`} characters
                {overLimit && " — exceeds limit"}
              </span>
              <div className="pp-compose-box__actions">
                {imagePreview ? (
                  <button type="button" className="pp-icon-btn" onClick={removeImage} title="Remove image">
                    <X size={15} />
                  </button>
                ) : (
                  <label className="pp-icon-btn" style={{ cursor: "pointer" }} title="Add image">
                    <ImagePlus size={15} />
                    <input type="file" accept="image/*" onChange={handleImagePick} style={{ display: "none" }} />
                  </label>
                )}
              </div>
            </div>
          </div>

          {imagePreview && (
            <div style={{ marginTop: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Selected"
                style={{ maxHeight: 200, borderRadius: "var(--pp-radius-sm)", border: "1px solid var(--pp-border)" }}
              />
            </div>
          )}

          {/* Preview */}
          {selected.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="pp-side-card__title">Preview</div>
              <div className="pp-preview">
                {text || "Your preview will appear here"}
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="pp-compose-side">
          <div className="pp-side-card">
            <div className="pp-side-card__title">Posting targets</div>
            {selected.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--pp-muted2)" }}>
                No platforms selected yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PLATFORMS.filter((p) => selected.includes(p.id)).map((p) => (
                  <span key={p.id} style={{ fontSize: "0.83rem", color: "var(--pp-text)" }}>
                    • {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pp-side-card">
            <div className="pp-side-card__title">Schedule</div>
            <label className="pp-schedule-row">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              Schedule for later
            </label>
            {scheduleEnabled && (
              <input
                type="datetime-local"
                className="pp-input"
                style={{ marginTop: 10 }}
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            )}
          </div>

          <div className="pp-side-card">
            <div className="pp-side-card__title">Tip</div>
            <p style={{ fontSize: "0.8rem", color: "var(--pp-muted2)", lineHeight: 1.5 }}>
              Posts published between 9–11 AM tend to get the best engagement.
            </p>
          </div>

          <button
            type="button"
            className="pp-btn pp-btn--primary"
            onClick={handlePublish}
            disabled={publishing || !text.trim() || selected.length === 0 || overLimit}
          >
            {publishing ? "Publishing..." : "Publish Now"}
          </button>
          <button
            type="button"
            className="pp-btn pp-btn--ghost"
            onClick={handleSaveDraft}
            disabled={saving || !text.trim() || overLimit}
          >
            {saving
              ? "Saving..."
              : scheduleEnabled && scheduleDate
              ? "Schedule Post"
              : "Save Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
