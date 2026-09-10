import { NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/state";
import { oauthCookieOptions } from "@/lib/oauth/pkce";

/**
 * Threads OAuth — Uses Instagram Graph API via Facebook Login
 *
 * Threads API is part of Instagram Graph API.
 * Uses same Facebook app credentials but with threads-specific scopes.
 */
export async function GET() {
  const clientId = process.env.FACEBOOK_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "FACEBOOK_CLIENT_ID is not set in .env.local (needed for Threads)." },
      { status: 501 }
    );
  }

  const state = generateState();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/threads/callback`;
  const scope = "instagram_basic,instagram_content_publish,threads_basic,threads_content_publish";

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("threads_oauth_state", state, oauthCookieOptions);
  return response;
}
