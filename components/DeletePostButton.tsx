"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast-context";

export default function DeletePostButton({ postId }: { postId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast("Failed to delete post", "error");
      } else {
        toast("Post deleted", "success");
        router.refresh();
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className={`text-xs px-2 py-1 rounded transition-colors ${
        confirming
          ? "text-rose-400 bg-rose-500/10"
          : "text-slate-600 hover:text-rose-400"
      }`}
    >
      {deleting ? "..." : confirming ? "Pakka?" : "Delete"}
    </button>
  );
}
