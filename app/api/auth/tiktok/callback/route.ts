import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

/**
 * TikTok OAuth Callback
 *
 * 1. Exchange code for access_token
 * 2. Fetch user info
 * 3. Save to platform_connections
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("tiktok_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=state_mismatch", request.url)
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`;

  // Exchange code for access token
  const tokenRes = await fetch(
    "https://open.tiktokapis.com/v2/oauth/token/",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=token_exchange_failed", request.url)
    );
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const openId = tokenData.open_id;

  // Fetch user info
  const meRes = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=display_name,username`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const meData = meRes.ok ? await meRes.json() : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await supabase.from("platform_connections").upsert(
    {
      user_id: user.id,
      platform: "tiktok",
      access_token: encryptSecret(accessToken),
      refresh_token: encryptSecret(tokenData.refresh_token ?? null),
      platform_username:
        meData?.data?.user?.username ?? openId ?? null,
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
    },
    { onConflict: "user_id,platform" }
  );

  const response = NextResponse.redirect(
    new URL("/dashboard/connect", request.url)
  );
  response.cookies.delete("tiktok_oauth_state");
  return response;
}
