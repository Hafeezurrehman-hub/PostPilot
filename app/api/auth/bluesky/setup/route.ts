import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

/**
 * POST /api/auth/bluesky/setup
 *
 * Bluesky app password save karo.
 * User Bluesky dashboard se app password generate karta hai
 * aur yahan submit karta hai.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { handle, appPassword } = body;

  if (!handle || !appPassword) {
    return NextResponse.json(
      { error: "Handle and app password are required" },
      { status: 400 }
    );
  }

  // Verify credentials by logging in
  const resolveRes = await fetch(
    `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`
  );

  if (!resolveRes.ok) {
    return NextResponse.json(
      { error: "Invalid Bluesky handle" },
      { status: 400 }
    );
  }

  // Try to create session to verify
  const loginRes = await fetch(
    "https://bsky.social/xrpc/com.atproto.server.createSession",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    }
  );

  if (!loginRes.ok) {
    return NextResponse.json(
      { error: "Invalid app password" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await supabase.from("platform_connections").upsert(
    {
      user_id: user.id,
      platform: "bluesky",
      access_token: encryptSecret(appPassword),
      refresh_token: null,
      platform_username: handle,
      expires_at: null,
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.json({ success: true });
}
