"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/lib/toast-context";
import { createClient } from "@/lib/supabase/client";
import { platformIcon, platformColor } from "@/components/PlatformIcons";
import type { PostTemplate } from "@/lib/templates";

// Built-in templates (matches lib/templates/index.ts)
const BUILTIN_TEMPLATES = [
  {
    name: "Product Launch",
    content: "🚀 Introducing {{title}}!\n\n{{description}}\n\nCheck it out: {{url}}\n\n#launch #new",
    platforms: ["twitter", "linkedin"],
    category: "announcement" as const,
    variables: ["title", "description", "url"],
  },
  {
    name: "Blog Share",
    content: "📝 New blog post: {{title}}\n\n{{summary}}\n\nRead more: {{url}}",
    platforms: ["twitter", "linkedin", "facebook"],
    category: "educational" as const,
    variables: ["title", "summary", "url"],
  },
  {
    name: "Engagement Question",
    content: "💬 {{question}}\n\nDrop your answer below! 👇",
    platforms: ["twitter", "linkedin", "facebook", "instagram"],
    category: "engagement" as const,
    variables: ["question"],
  },
  {
    name: "Weekly Tip",
    content: "💡 Weekly Tip:\n\n{{tip}}\n\n{{hashtags}}",
    platforms: ["twitter", "linkedin"],
    category: "educational" as const,
    variables: ["tip", "hashtags"],
  },
  {
    name: "Behind the Scenes",
    content: "👀 Behind the scenes at {{company}}\n\n{{content}}\n\n#bts #behindthescenes",
    platforms: ["instagram", "facebook"],
    category: "engagement" as const,
    variables: ["company", "content"],
  },
  {
    name: "Testimonial",
    content: "\"{{quote}}\" — {{author}}\n\nThank you for the kind words! 🙏",
    platforms: ["twitter", "linkedin", "facebook"],
    category: "promo" as const,
    variables: ["quote", "author"],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  announcement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  promo: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  engagement: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  educational: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  custom: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const ALL_PLATFORMS = [
  "twitter", "linkedin", "facebook", "instagram", "threads",
  "tiktok", "youtube", "pinterest", "reddit", "mastodon",
  "bluesky", "google_business", "whatsapp",
];

export default function TemplatesPage() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [customTemplates, setCustomTemplates] = useState<PostTemplate[]>([]);

  // Fill modal state
  const [fillModal, setFillModal] = useState<{
    open: boolean;
    template: (typeof BUILTIN_TEMPLATES)[0] | PostTemplate;
    values: Record<string, string>;
    isBuiltin: boolean;
  } | null>(null);

  // Create modal state
  const [createModal, setCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    content: "",
    platforms: [] as string[],
    category: "custom" as string,
  });
  const [creating, setCreating] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const loadTemplates = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/templates?userId=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setCustomTemplates(data.templates ?? []);
      }
    } catch {
      // Silent — will show empty
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email);
      setUserId(user.id);
      await loadTemplates(user.id);
      setLoading(false);
    };
    init();
  }, [router, loadTemplates]);

  const handleFillAndUse = (template: (typeof BUILTIN_TEMPLATES)[0] | PostTemplate, isBuiltin: boolean) => {
    const values: Record<string, string> = {};
    for (const v of template.variables) {
      values[v] = "";
    }
    setFillModal({ open: true, template, values, isBuiltin });
  };

  const handleInsertFilled = () => {
    if (!fillModal) return;
    let content = fillModal.template.content;
    for (const [key, value] of Object.entries(fillModal.values)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }
    // Copy to clipboard and navigate to new post
    navigator.clipboard.writeText(content).catch(() => {});
    toast("Template copied! Paste it in New Post.", "success");
    setFillModal(null);
    router.push("/dashboard/new");
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      toast("Name and content are required", "error");
      return;
    }
    if (newTemplate.platforms.length === 0) {
      toast("Select at least one platform", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          userId,
          ...newTemplate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to create template", "error");
      } else {
        toast("Template created!", "success");
        setCreateModal(false);
        setNewTemplate({ name: "", content: "", platforms: [], category: "custom" });
        await loadTemplates(userId);
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id, userId }),
      });
      if (res.ok) {
        toast("Template deleted", "success");
        setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {
      toast("Failed to delete", "error");
    }
  };

  const detectVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  };

  const allTemplates = [
    ...BUILTIN_TEMPLATES.map((t, i) => ({ ...t, id: `builtin-${i}`, isBuiltin: true as const })),
    ...customTemplates.map((t) => ({ ...t, isBuiltin: false as const })),
  ];

  const builtinCount = BUILTIN_TEMPLATES.length;
  const customCount = customTemplates.length;

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Templates</h1>
            <p className="text-sm text-slate-500 mt-1">
              {builtinCount} built-in · {customCount} custom
            </p>
          </div>
          <button
            onClick={() => setCreateModal(true)}
            className="shrink-0 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            + New Template
          </button>
        </div>

        {/* Built-in Templates */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-slate-300">Built-in templates</h2>
            <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
              {builtinCount}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BUILTIN_TEMPLATES.map((t, i) => (
              <TemplateCard
                key={`builtin-${i}`}
                template={t}
                isBuiltin
                onUse={() => handleFillAndUse(t, true)}
              />
            ))}
          </div>
        </div>

        {/* Custom Templates */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-slate-300">Your templates</h2>
            <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
              {customCount}
            </span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-slate-800/30 animate-pulse" />
              ))}
            </div>
          ) : customTemplates.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 py-12 text-center">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-sm text-slate-400">No custom templates yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Create reusable templates with variables like {"{{title}}"}, {"{{url}}"}
              </p>
              <button
                onClick={() => setCreateModal(true)}
                className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
              >
                Create your first template →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  isBuiltin={false}
                  onUse={() => handleFillAndUse(t, false)}
                  onDelete={() => handleDeleteTemplate(t.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-medium text-slate-300">How templates work</h3>
          <ul className="mt-3 space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Choose a template</span> — Built-in or your own custom one
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Fill in the variables</span> — e.g. {"{{title}}"}, {"{{url}}"}, {"{{author}}"}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Use it</span> — Content is copied to your new post, ready to publish!
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Fill Variables Modal */}
      {fillModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Fill in template</h3>
              <button
                onClick={() => setFillModal(null)}
                className="text-slate-500 hover:text-slate-300 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Template name + category */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-indigo-400">{fillModal.template.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[fillModal.template.category]}`}>
                {fillModal.template.category}
              </span>
            </div>

            {/* Platforms */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {fillModal.template.platforms.map((p) => {
                const color = platformColor(p);
                const Icon = platformIcon(p);
                return (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-slate-700 bg-slate-800 text-slate-400"
                  >
                    {Icon && <Icon className="w-3 h-3" style={{ color }} />}
                    {p}
                  </span>
                );
              })}
            </div>

            {/* Variable inputs */}
            <div className="space-y-3">
              {fillModal.template.variables.map((v) => (
                <div key={v}>
                  <label className="text-xs text-slate-500 mb-1 block capitalize">
                    {v.replace(/_/g, " ")}
                  </label>
                  {fillModal.values[v] && fillModal.values[v].length > 60 ? (
                    <textarea
                      value={fillModal.values[v]}
                      onChange={(e) =>
                        setFillModal({
                          ...fillModal,
                          values: { ...fillModal.values, [v]: e.target.value },
                        })
                      }
                      placeholder={`Enter ${v.replace(/_/g, " ")}...`}
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={fillModal.values[v] ?? ""}
                      onChange={(e) =>
                        setFillModal({
                          ...fillModal,
                          values: { ...fillModal.values, [v]: e.target.value },
                        })
                      }
                      placeholder={`Enter ${v.replace(/_/g, " ")}...`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-4 rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
              <p className="text-[10px] text-slate-500 mb-1.5">Preview</p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {(() => {
                  let preview = fillModal.template.content;
                  for (const [key, value] of Object.entries(fillModal.values)) {
                    preview = preview.replaceAll(
                      `{{${key}}}`,
                      value || `{{${key}}}`
                    );
                  }
                  return preview;
                })()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setFillModal(null)}
                className="flex-1 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertFilled}
                className="flex-1 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2.5 rounded-lg transition-colors"
              >
                Use Template →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">New Template</h3>
              <button
                onClick={() => {
                  setCreateModal(false);
                  setNewTemplate({ name: "", content: "", platforms: [], category: "custom" });
                }}
                className="text-slate-500 hover:text-slate-300 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Template name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Weekly Newsletter"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Content <span className="text-slate-600">(use {"{{variable}}"} for dynamic parts)</span>
                </label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder={'🚀 Introducing {{title}}!\n\n{{description}}\n\nCheck it out: {{url}}'}
                  rows={5}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                {newTemplate.content && detectVariables(newTemplate.content).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {detectVariables(newTemplate.content).map((v) => (
                      <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="custom">Custom</option>
                  <option value="announcement">Announcement</option>
                  <option value="promo">Promo</option>
                  <option value="engagement">Engagement</option>
                  <option value="educational">Educational</option>
                </select>
              </div>

              {/* Platforms */}
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((p) => {
                    const selected = newTemplate.platforms.includes(p);
                    const color = platformColor(p);
                    const Icon = platformIcon(p);
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          setNewTemplate({
                            ...newTemplate,
                            platforms: selected
                              ? newTemplate.platforms.filter((x) => x !== p)
                              : [...newTemplate.platforms, p],
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                          selected
                            ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                            : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {Icon && <Icon className="w-3 h-3" style={selected ? { color } : undefined} />}
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setCreateModal(false);
                  setNewTemplate({ name: "", content: "", platforms: [], category: "custom" });
                }}
                className="flex-1 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={creating}
                className="flex-1 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ─── Template Card ─── */
function TemplateCard({
  template,
  isBuiltin,
  onUse,
  onDelete,
}: {
  template: (typeof BUILTIN_TEMPLATES)[0] | PostTemplate;
  isBuiltin: boolean;
  onUse: () => void;
  onDelete?: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const category = template.category;
  const preview = template.content.slice(0, 120) + (template.content.length > 120 ? "..." : "");

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all duration-200 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{template.name}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${CATEGORY_COLORS[category]}`}>
            {category}
          </span>
        </div>
        {isBuiltin && (
          <span className="text-[10px] text-slate-600 shrink-0">Built-in</span>
        )}
      </div>

      {/* Preview */}
      <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed flex-1 mb-3">
        {preview}
      </p>

      {/* Platforms */}
      <div className="flex flex-wrap gap-1 mb-3">
        {template.platforms.map((p) => {
          const color = platformColor(p);
          const Icon = platformIcon(p);
          return (
            <span
              key={p}
              className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500"
            >
              {Icon && <Icon className="w-2.5 h-2.5" style={{ color }} />}
              {p}
            </span>
          );
        })}
      </div>

      {/* Variables hint */}
      {template.variables.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.variables.map((v) => (
            <span key={v} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/5 text-indigo-400/70 border border-indigo-500/10">
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-800">
        <button
          onClick={onUse}
          className="flex-1 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          Use Template
        </button>
        {!isBuiltin && onDelete && (
          <button
            onClick={() => {
              if (confirmDelete) {
                onDelete();
              } else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 4000);
              }
            }}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? "text-white bg-rose-500 hover:bg-rose-400"
                : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
            }`}
          >
            {confirmDelete ? "Confirm?" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
