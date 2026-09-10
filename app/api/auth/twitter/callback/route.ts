import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("twitter_oauth_state")?.value;
  const codeVerifier = request.cookies.get("twitter_code_verifier")?.value;

  if (!code || !state || state !== savedState || !codeVerifier) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=state_mismatch", request.url)
    );
  }

  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=token_exchange_failed", request.url)
    );
  }

  const tokenData = await tokenRes.json();

  const meRes = await fetch("https://api.twitter.com/2/users/me", {
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
      platform: "twitter",
      access_token: encryptSecret(tokenData.access_token),
      refresh_token: encryptSecret(tokenData.refresh_token ?? null),
      platform_username: meData?.data?.username ?? null,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    },
    { onConflict: "user_id,platform" }
  );

  const response = NextResponse.redirect(new URL("/dashboard/connect", request.url));
  response.cookies.delete("twitter_oauth_state");
  response.cookies.delete("twitter_code_verifier");
  return response;
}
