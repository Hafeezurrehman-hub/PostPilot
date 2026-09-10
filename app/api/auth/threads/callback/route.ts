import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

/**
 * Threads Callback — Same flow as Facebook but saves as 'threads' platform
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("threads_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=state_mismatch", request.url)
    );
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID!;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/threads/callback`;

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=token_exchange_failed", request.url)
    );
  }

  const tokenData = await tokenRes.json();
  const shortToken = tokenData.access_token;

  // Exchange for long-lived token
  const longTokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`
  );

  const longTokenData = longTokenRes.ok
    ? await longTokenRes.json()
    : { access_token: shortToken };
  const longToken = longTokenData.access_token;

  // Get Instagram account info (Threads is linked to IG)
  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${longToken}`
  );
  const igData = igRes.ok ? await igRes.json() : null;

  // Find the Instagram account with Threads
  let threadsUsername = null;
  let igAccountId = null;
  const pages = igData?.data ?? [];

  for (const page of pages) {
    if (page.instagram_business_account) {
      threadsUsername = page.instagram_business_account.username;
      igAccountId = page.instagram_business_account.id;
      break;
    }
  }

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
      platform: "threads",
      access_token: encryptSecret(longToken),
      refresh_token: null, // Long-lived token, no refresh needed
      platform_username: threadsUsername ?? null,
      expires_at: null, // Long-lived tokens don't expire
    },
    { onConflict: "user_id,platform" }
  );

  const response = NextResponse.redirect(
    new URL("/dashboard/connect", request.url)
  );
  response.cookies.delete("threads_oauth_state");
  return response;
}
