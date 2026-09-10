import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

/**
 * Mastodon OAuth Callback
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("mastodon_oauth_state")?.value;
  const instanceUrl = request.cookies.get("mastodon_instance")?.value;

  if (!code || !state || state !== savedState || !instanceUrl) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=state_mismatch", request.url)
    );
  }

  const clientId = process.env.MASTODON_CLIENT_ID!;
  const clientSecret = process.env.MASTODON_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/mastodon/callback`;

  // Exchange code for token
  const tokenRes = await fetch(`${instanceUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=token_exchange_failed", request.url)
    );
  }

  const tokenData = await tokenRes.json();

  // Get user info
  const meRes = await fetch(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
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
      platform: "mastodon",
      access_token: encryptSecret(tokenData.access_token),
      refresh_token: encryptSecret(tokenData.refresh_token ?? null),
      platform_username: meData?.username ? `@${meData.username}@${new URL(instanceUrl).hostname}` : null,
      expires_at: null, // Mastodon tokens don't expire
    },
    { onConflict: "user_id,platform" }
  );

  const response = NextResponse.redirect(
    new URL("/dashboard/connect", request.url)
  );
  response.cookies.delete("mastodon_oauth_state");
  response.cookies.delete("mastodon_instance");
  return response;
}
