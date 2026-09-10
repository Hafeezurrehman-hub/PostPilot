"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast-context";

export default function PublishPostButton({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handlePublish = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Publish failed", "error");
      } else {
        toast(data.message ?? "Published!", "success");
        router.refresh();
      }
    } catch {
      toast("Network error — please try again", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePublish}
      disabled={loading}
      className="text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1 rounded transition-colors disabled:opacity-50"
    >
      {loading ? "Publishing..." : "Publish"}
    </button>
  );
}
