import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("linkedin_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=state_mismatch", request.url)
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`;

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=token_exchange_failed", request.url)
    );
  }

  const tokenData = await tokenRes.json();

  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
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
      platform: "linkedin",
      access_token: encryptSecret(tokenData.access_token),
      refresh_token: encryptSecret(tokenData.refresh_token ?? null),
      platform_username: meData?.name ?? null,
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
    },
    { onConflict: "user_id,platform" }
  );

  const response = NextResponse.redirect(new URL("/dashboard/connect", request.url));
  response.cookies.delete("linkedin_oauth_state");
  return response;
}
