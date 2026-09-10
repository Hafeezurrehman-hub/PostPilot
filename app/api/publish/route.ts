/**
 * POST /api/publish
 *
 * Immediate publish — user "Publish" button dabata hai to ye route call hota hai.
 * Authenticated user ka post hai, usko uske selected platforms pe publish karta hai.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publishPost } from "@/lib/publish/publish-post";

export async function POST(request: NextRequest) {
  // 1. Auth check
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only — ignore
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Request body se postId lo
  let postId: string;
  try {
    const body = await request.json();
    postId = body.postId;
    if (!postId || typeof postId !== "string") {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Verify karo ki ye post is user ki hai
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", postId)
    .single();

  if (postErr || !post || post.user_id !== user.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // 4. Publish karo
  try {
    const outcomes = await publishPost(postId);

    const allSuccess = outcomes.every((o) => o.status === "success");
    const anySuccess = outcomes.some((o) => o.status === "success");

    return NextResponse.json({
      success: anySuccess,
      outcomes,
      message: allSuccess
        ? "Published to all platforms!"
        : anySuccess
        ? "Published to some platforms. Check details for failures."
        : "Failed to publish to any platform.",
    });
  } catch (err) {
    console.error("Publish error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
