import { NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/state";
import { oauthCookieOptions } from "@/lib/oauth/pkce";

/**
 * TikTok OAuth — Authorization Code Flow
 *
 * TikTok uses standard OAuth 2.0 (not PKCE).
 * Scopes: user.info.basic, video.publish, video.upload
 */
export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;

  if (!clientKey) {
    return NextResponse.json(
      { error: "TIKTOK_CLIENT_KEY is not set in .env.local yet." },
      { status: 501 }
    );
  }

  const state = generateState();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`;
  const scope = "user.info.basic,video.publish,video.upload";

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("tiktok_oauth_state", state, oauthCookieOptions);
  return response;
}
