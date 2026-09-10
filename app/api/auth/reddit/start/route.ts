import { NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/state";
import { oauthCookieOptions } from "@/lib/oauth/pkce";

/**
 * Reddit OAuth — Post share karne ke liye
 */
export async function GET() {
  const clientId = process.env.REDDIT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "REDDIT_CLIENT_ID is not set in .env.local yet." },
      { status: 501 }
    );
  }

  const state = generateState();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/reddit/callback`;
  const scope = "submit,identity";

  const authUrl = new URL("https://www.reddit.com/api/v1/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("duration", "permanent");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("reddit_oauth_state", state, oauthCookieOptions);
  return response;
}
