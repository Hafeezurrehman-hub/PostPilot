/**
 * POST /api/auth/telegram/connect
 *
 * Telegram doesn't use OAuth redirects — the user pastes a Bot Token +
 * Chat ID directly. This route verifies the token against Telegram's API,
 * then saves the connection (encrypted, like every other platform).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { encryptSecret } from "@/lib/crypto/tokens";
import { verifyTelegramBot } from "@/lib/publish/telegram";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { botToken, chatId } = await request.json();

  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Bot token and chat ID are required" }, { status: 400 });
  }

  const verification = await verifyTelegramBot(botToken);
  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.error || "Could not verify bot token with Telegram" },
      { status: 400 }
    );
  }

  const { error: upsertError } = await supabase
    .from("platform_connections")
    .upsert(
      {
        user_id: user.id,
        platform: "telegram",
        access_token: encryptSecret(botToken),
        refresh_token: null,
        external_id: chatId,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, botUsername: verification.username });
}
