/**
 * POST /api/auth/disconnect
 *
 * Platform connection remove karo.
 * Facebook disconnect karne pe Instagram bhi automatically disconnect ho jata hai
 * (kyunki dono same Facebook app se connected hain).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { platform?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const platform = body.platform;
  const VALID_PLATFORMS = [
    "twitter", "linkedin", "facebook", "instagram",
    "tiktok", "threads", "youtube", "pinterest",
    "reddit", "mastodon", "bluesky", "google_business", "whatsapp"
  ];
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  // Delete the platform connection
  const { error } = await supabase
    .from("platform_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", platform);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Agar Facebook disconnect kiya to Instagram + Threads bhi disconnect karo
  // (Kyunki IG/Threads Facebook ke through connect hote hain)
  if (platform === "facebook") {
    await supabase
      .from("platform_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("platform", "instagram");
    await supabase
      .from("platform_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("platform", "threads");
  }

  return NextResponse.json({ success: true });
}
