import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

/**
 * Pinterest OAuth Callback
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("pinterest_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=state_mismatch", request.url)
    );
  }

  const appId = process.env.PINTEREST_APP_ID!;
  const appSecret = process.env.PINTEREST_APP_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/pinterest/callback`;

  // Exchange code for access token
  const tokenRes = await fetch(
    "https://api.pinterest.com/v5/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
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

  // Get user info
  const meRes = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
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
      platform: "pinterest",
      access_token: encryptSecret(tokenData.access_token),
      refresh_token: encryptSecret(tokenData.refresh_token ?? null),
      platform_username: meData?.username ?? null,
      expires_at: null, // Pinterest tokens don't expire
    },
    { onConflict: "user_id,platform" }
  );

  const response = NextResponse.redirect(
    new URL("/dashboard/connect", request.url)
  );
  response.cookies.delete("pinterest_oauth_state");
  return response;
}
